/**
 * OG card verification kit — Phase 1 launch reality check.
 *
 * Hits the article's OG image route directly, captures the PNG bytes,
 * scrapes the article page's <head> for every relevant social meta tag,
 * and writes a markdown report at /tmp/og-verify/REPORT.md with
 * one-click validator URLs (opengraph.xyz, metatags.io, LinkedIn Post
 * Inspector, Twitter cards-dev) plus inline DM-yourself instructions
 * for Discord / Slack / iMessage / WhatsApp / Telegram.
 *
 * Usage:
 *   npx tsx scripts/og-verify.ts                   # auto-pick latest article
 *   npx tsx scripts/og-verify.ts <slug>            # specific slug
 *
 * Override the base URL for dev:
 *   OG_VERIFY_BASE_URL=http://localhost:3000 npx tsx scripts/og-verify.ts
 *
 * Honors NEXT_PUBLIC_APP_URL via getAppUrl() when OG_VERIFY_BASE_URL is unset.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // Fallback to .env

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { articles } from "../src/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getAppUrl } from "../src/lib/url";

const OUTPUT_DIR = "/tmp/og-verify";

interface MetaTag {
  property: string;
  content: string;
}

interface ImageInfo {
  url: string;
  bytes: number;
  contentType: string;
  cacheControl: string | null;
  status: number;
  width: number | null;
  height: number | null;
  pngError: string | null;
}

interface VerifyResult {
  slug: string;
  articleUrl: string;
  ogImageUrl: string;
  image: ImageInfo;
  metaTags: MetaTag[];
  validators: Record<string, string>;
}

/**
 * Parse PNG width/height from the IHDR chunk (bytes 16-23).
 * PNG signature is 8 bytes, then IHDR chunk: 4-byte length, 4-byte type,
 * then 4-byte width and 4-byte height (big-endian).
 */
function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  // 89 50 4E 47 0D 0A 1A 0A — PNG signature
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) return null;
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

async function pickSlug(explicit: string | undefined): Promise<string> {
  if (explicit) return explicit;
  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .orderBy(desc(articles.publishedAt))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("No articles found in DB. Pass a slug explicitly.");
  }
  return rows[0].slug;
}

async function ensureSlugExists(slug: string): Promise<void> {
  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  if (rows.length === 0) {
    throw new Error(`No article with slug "${slug}" found in DB.`);
  }
}

function getBaseUrl(): string {
  const override = process.env.OG_VERIFY_BASE_URL;
  if (override && override.length > 0) return override.replace(/\/$/, "");
  return getAppUrl();
}

async function fetchOgImage(ogImageUrl: string, savePath: string): Promise<ImageInfo> {
  const res = await fetch(ogImageUrl, { redirect: "follow" });
  const status = res.status;
  const contentType = res.headers.get("content-type") ?? "";
  const cacheControl = res.headers.get("cache-control");
  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  await writeFile(savePath, buf);

  let width: number | null = null;
  let height: number | null = null;
  let pngError: string | null = null;

  if (contentType.includes("image/png")) {
    const dims = readPngDimensions(buf);
    if (dims) {
      width = dims.width;
      height = dims.height;
    } else {
      pngError = "Could not parse PNG header";
    }
  } else {
    pngError = `Expected image/png, got ${contentType}`;
  }

  return {
    url: ogImageUrl,
    bytes: buf.byteLength,
    contentType,
    cacheControl,
    status,
    width,
    height,
    pngError,
  };
}

const RELEVANT_META_PROPERTIES = new Set([
  "og:title",
  "og:description",
  "og:image",
  "og:image:width",
  "og:image:height",
  "og:image:alt",
  "og:image:secure_url",
  "og:url",
  "og:type",
  "og:site_name",
  "og:locale",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:image:alt",
  "twitter:site",
  "twitter:creator",
  "twitter:label1",
  "twitter:data1",
  "twitter:label2",
  "twitter:data2",
  "article:published_time",
  "article:author",
]);

/**
 * Crude but dependency-free meta-tag scraper. Pulls every <meta>
 * with `property=` or `name=` whose key is in the allowlist.
 *
 * We intentionally do not run a full HTML parser — Next.js' rendered
 * <head> emits self-closing meta tags with predictable attribute order,
 * and avoiding cheerio/jsdom keeps this script zero-dep.
 */
function extractMetaTags(html: string): MetaTag[] {
  const tags: MetaTag[] = [];
  // Match <meta ... > including multi-line and quoted attributes.
  const metaRe = /<meta\b[^>]*?\/?>/gi;
  const matches = html.match(metaRe) ?? [];
  for (const tag of matches) {
    const propMatch = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (!propMatch || !contentMatch) continue;
    const property = propMatch[1].toLowerCase();
    if (!RELEVANT_META_PROPERTIES.has(property)) continue;
    tags.push({ property, content: contentMatch[1] });
  }
  return tags;
}

function buildValidatorUrls(articleUrl: string): Record<string, string> {
  const enc = encodeURIComponent(articleUrl);
  return {
    "opengraph.xyz": `https://www.opengraph.xyz/url/${enc}`,
    "metatags.io": `https://metatags.io/?url=${enc}`,
    "LinkedIn Post Inspector": `https://www.linkedin.com/post-inspector/inspect/${enc}`,
    "Twitter cards-dev (deprecated)": `https://cards-dev.twitter.com/validator?url=${enc}`,
  };
}

function renderReport(r: VerifyResult): string {
  const dims = r.image.width && r.image.height
    ? `${r.image.width} × ${r.image.height} px`
    : "unknown (PNG header unparsable)";
  const sizeKb = (r.image.bytes / 1024).toFixed(1);
  const expected = r.image.width === 1200 && r.image.height === 630
    ? "OK (1200×630, 1.91:1 — universal sweet spot)"
    : r.image.width === 1200 && r.image.height === 675
      ? "WARN (1200×675, 1.78:1 — Twitter-ideal, LinkedIn/WhatsApp will center-crop ~24px)"
      : `UNEXPECTED — expected 1200×630 or 1200×675`;

  const whatsappWarn = r.image.bytes > 300 * 1024
    ? `**FAIL** — ${sizeKb} KB exceeds WhatsApp's ~300 KB hard cap; WhatsApp may show no preview on Android.`
    : `OK — ${sizeKb} KB is under WhatsApp's ~300 KB soft cap.`;

  const cacheLine = r.image.cacheControl
    ? `\`Cache-Control: ${r.image.cacheControl}\``
    : "**no Cache-Control header** — Slack will re-fetch on every unfurl";

  const tagRows = r.metaTags.length === 0
    ? "_(no relevant meta tags detected — did the article page render?)_"
    : r.metaTags
        .map((t) => `| \`${t.property}\` | ${escapePipe(t.content)} |`)
        .join("\n");

  const requiredKeys = [
    "og:title",
    "og:description",
    "og:image",
    "og:image:width",
    "og:image:height",
    "og:image:alt",
    "og:url",
    "og:type",
    "twitter:card",
    "twitter:image",
    "twitter:image:alt",
  ];
  const presentKeys = new Set(r.metaTags.map((t) => t.property));
  const missing = requiredKeys.filter((k) => !presentKeys.has(k));
  const missingLine = missing.length === 0
    ? "All required meta tags present."
    : `**Missing:** ${missing.map((k) => `\`${k}\``).join(", ")}`;

  const validatorLines = Object.entries(r.validators)
    .map(([name, url]) => `- **${name}:** ${url}`)
    .join("\n");

  return `# OG Verification Report — \`${r.slug}\`

Generated: ${new Date().toISOString()}
Article URL: ${r.articleUrl}

---

## 1. OG Image (ground truth)

| Field | Value |
|---|---|
| URL | ${r.image.url} |
| HTTP status | ${r.image.status} |
| Content-Type | \`${r.image.contentType || "(none)"}\` |
| Cache-Control | ${cacheLine} |
| Size | ${sizeKb} KB (${r.image.bytes} bytes) |
| Dimensions | ${dims} |
| Spec verdict | ${expected} |
| WhatsApp size budget | ${whatsappWarn} |
${r.image.pngError ? `| PNG parse error | ${r.image.pngError} |` : ""}

Saved locally at: \`${OUTPUT_DIR}/${r.slug}-image.png\`

---

## 2. Meta tags emitted by article page

${missingLine}

| Property | Content |
|---|---|
${tagRows}

---

## 3. Validator URLs (one click each)

${validatorLines}

> **Twitter / X note:** \`cards-dev.twitter.com/validator\` is deprecated for new accounts.
> If it errors, paste the article URL into a draft post on x.com/compose/post and observe
> the unfurl card. Use **opengraph.xyz** as the primary fallback validator.

---

## 4. Manual platform checks (no public validator)

These platforms do not expose validator URLs. DM-to-self test:

### Discord
1. Open a private test server or DM yourself.
2. Paste \`${r.articleUrl}\`.
3. **Expected:** large embed image (not thumbnail), correct title/description, image inline within ~3s.
4. **Bug indicators:** loading spinner that never resolves (image > 8 MB or 5xx); tiny thumbnail (missing \`og:image:width\`); wrong/old image (Discord proxy cached — append \`?v=2\` to bust).

### Slack
1. DM yourself with \`${r.articleUrl}\`.
2. **Expected:** unfurl with image, title, description.
3. **Bug indicators:** no unfurl (URL not HTTPS, or robots-blocking, or Slackbot hasn't crawled yet — wait ~5 min); title/description but no image (\`og:image\` URL not absolute HTTPS).

### iMessage
1. iMessage yourself with \`${r.articleUrl}\`.
2. **Expected:** rich link preview (large image card with title).
3. **Bug indicators:** plain blue link (image fetch failed, took > 10s, or > 600 KB); hero photo shown instead of playcard (JSON-LD \`image\` priority — see og-audit §2.7).

### WhatsApp
1. WhatsApp yourself with \`${r.articleUrl}\`.
2. Test on **iOS and Android** — rendering differs.
3. **Expected:** preview card with image, title, description.
4. **Bug indicators:** link only, no card (most likely image > 300 KB, or non-HTTPS); cropped top/bottom (1200×675 ratio not 1.91:1; consider 1200×630).
5. **WhatsApp caches forever per URL** — to re-test a fix, use a new slug or append \`?v=N\`.

### Telegram
1. DM yourself in @SavedMessages with \`${r.articleUrl}\`.
2. **Expected:** instant preview card with title, description, image.
3. **Bug indicators:** no preview (image not absolute HTTPS, or 5xx from origin); to force re-cache, send the URL to @WebpageBot.

---

## 5. Fix-on-bug decision tree

If any platform fails:

1. **Image not loading anywhere?** → Re-run this script. If \`HTTP status\` ≠ 200 or content-type ≠ \`image/png\`, the OG route itself is broken — check \`/article/[slug]/opengraph-image.tsx\` and the dev server logs.
2. **\`og:image\` content starts with \`http://localhost\`?** → \`NEXT_PUBLIC_APP_URL\` is wrong on the server. Fix in Vercel env (see og-audit §2.2).
3. **Twitter only fails?** → Check \`twitter:image:alt\` is present (og-audit §2.5). Run validator at https://cards-dev.twitter.com/validator.
4. **WhatsApp only fails?** → Image > 300 KB, or 1200×675 cropped. Check size in §1 above. Switch to 1200×630.
5. **Discord shows wrong/old image after a fix?** → Discord proxy cache. Append \`?v=2\` to the slug URL or change the image URL.
6. **LinkedIn says "Cannot inspect"?** → URL unreachable or robots-blocked. Verify \`curl -I ${r.articleUrl}\` returns 200 and not blocked.
7. **All meta tags present but no image renders?** → Origin returns non-PNG, or returns 4xx. Check \`Content-Type\` in §1.

---

## 6. Companion screenshot script

\`\`\`bash
npx tsx scripts/og-screenshot.ts ${r.slug}
\`\`\`

Captures opengraph.xyz + LinkedIn Post Inspector visually, saves to \`${OUTPUT_DIR}/\`.
`;
}

function escapePipe(s: string): string {
  return s.replace(/\|/g, "\\|");
}

async function main(): Promise<void> {
  const argSlug = process.argv[2];
  await mkdir(OUTPUT_DIR, { recursive: true });

  const slug = await pickSlug(argSlug);
  if (argSlug) {
    await ensureSlugExists(slug);
  }
  const base = getBaseUrl();
  const articleUrl = `${base}/article/${slug}`;
  const ogImageUrl = `${base}/article/${slug}/opengraph-image`;
  const imagePath = join(OUTPUT_DIR, `${slug}-image.png`);

  console.log(`[og-verify] slug:        ${slug}`);
  console.log(`[og-verify] base URL:    ${base}`);
  console.log(`[og-verify] article URL: ${articleUrl}`);
  console.log(`[og-verify] OG image:    ${ogImageUrl}`);

  console.log(`[og-verify] fetching OG image...`);
  const image = await fetchOgImage(ogImageUrl, imagePath);
  console.log(`[og-verify]   status=${image.status} bytes=${image.bytes} type=${image.contentType} dims=${image.width ?? "?"}x${image.height ?? "?"}`);

  console.log(`[og-verify] fetching article HTML for meta-tag scrape...`);
  let metaTags: MetaTag[] = [];
  try {
    const articleRes = await fetch(articleUrl, {
      // Pretend to be a generic crawler so SSR runs the same path social bots see.
      headers: { "user-agent": "Mozilla/5.0 (compatible; OGVerifyBot/1.0)" },
    });
    const html = await articleRes.text();
    metaTags = extractMetaTags(html);
    console.log(`[og-verify]   status=${articleRes.status} extracted ${metaTags.length} meta tags`);
  } catch (err) {
    console.error(`[og-verify]   article fetch failed:`, err);
  }

  const validators = buildValidatorUrls(articleUrl);
  const result: VerifyResult = {
    slug,
    articleUrl,
    ogImageUrl,
    image,
    metaTags,
    validators,
  };

  const reportPath = join(OUTPUT_DIR, "REPORT.md");
  await writeFile(reportPath, renderReport(result));

  // Also write a JSON dump for any downstream tooling.
  const jsonPath = join(OUTPUT_DIR, `${slug}.json`);
  await writeFile(jsonPath, JSON.stringify(result, null, 2));

  console.log("");
  console.log(`[og-verify] DONE`);
  console.log(`[og-verify] report:   ${reportPath}`);
  console.log(`[og-verify] image:    ${imagePath}`);
  console.log(`[og-verify] json:     ${jsonPath}`);
  console.log("");
  console.log(`[og-verify] Validator URLs (paste in browser):`);
  for (const [name, url] of Object.entries(validators)) {
    console.log(`  ${name.padEnd(32)} ${url}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[og-verify] FATAL:", err);
    process.exit(1);
  });

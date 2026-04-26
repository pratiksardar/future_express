# OG Card Rendering Audit — Phase 0

**Date:** 2026-04-26
**Scope:** Static analysis only. No product code changed. No build/runtime executed.
**Files audited:**
- `src/app/article/[slug]/opengraph-image.tsx`
- `src/lib/articles/playcard.tsx`
- `src/app/article/[slug]/page.tsx` (`generateMetadata`)
- `src/app/layout.tsx`
- `next.config.ts`
- `.env`, `.env.example`

---

## 1. Per-Platform Static Analysis

The current OG image is **1200×675 PNG** (16:9, twitter-format playcard). One image is reused for every platform via the same metadata block. Below: how each platform treats that.

### 1.1 Twitter / X

| Requirement | Spec | Current code | Status |
|---|---|---|---|
| Card type | `twitter:card` = `summary_large_image` | `card: "summary_large_image"` (page.tsx:85) | OK |
| Image ratio | 2:1 (1200×600 ideal, 1.91:1 also OK) | 1200×675 (~1.78:1) | **Minor** — Twitter accepts but will pillar/letterbox slightly. Within spec, not a bug. |
| Image size | < 5 MB; PNG/JPG/WebP | `next/og` PNG (~50–250KB typical) | OK |
| Required fields | title, description, image | All emitted | OK |
| `twitter:image:alt` | Required for `summary_large_image` accessibility, also surfaces in some validators | **NOT emitted.** `twitter.images` is passed as a bare string `[ogImageUrl]` (page.tsx:88) — no alt | **BUG (low-medium)** |
| Caching | Twitterbot caches via `Last-Modified` / `ETag`. Re-fetches on share. Force refresh via cards-dev validator. | next/og response — no explicit `Cache-Control`. See §2.4. | **Risk** |
| `twitter:site` / `twitter:creator` | Optional but recommended | Not emitted | Minor (nice-to-have) |
| Validator | `https://cards-dev.twitter.com/validator` (deprecated UI; X now requires posting in draft) | — | Manual |

**Verdict:** Will render. Missing `twitter:image:alt` on the twitter card and could lose accessibility/preview metadata.

### 1.2 Discord

| Requirement | Spec | Current code | Status |
|---|---|---|---|
| Tag | `og:image` (also reads `twitter:card`) | Emitted via `openGraph.images` | OK |
| Image dimensions hints | Discord respects `og:image:width` / `og:image:height` to reserve layout space; without them the embed flickers/reflows | `width: 1200, height: 675` provided in `openGraph.images[0]` (page.tsx:78–79). Next's metadata API emits `og:image:width` and `og:image:height` from these fields. | OK |
| Absolute HTTPS URL | Required | `${base}/article/${slug}/opengraph-image` where `base = NEXT_PUBLIC_APP_URL ?? "https://thefutureexpress.com"` (page.tsx:64) | OK in prod **only if `NEXT_PUBLIC_APP_URL` is HTTPS**. See §2.2. |
| Caching | **Aggressive** — Discord's image proxy (`images-ext-1.discordapp.net`) caches for ~24h+ keyed off URL. Won't re-fetch on edit. | No explicit `Cache-Control`; if a slug's image needs to change, the URL must change. | **Risk** — fine for Phase 0 launch (URLs are stable per slug), but no version cache-bust mechanism if a card needs a fix. |
| Color theme | Discord reads `theme-color` meta to tint the embed left bar | Not emitted | Cosmetic |
| File size cap | ~8 MB hard, but anything > 1 MB delays embed | next/og output should be well under | OK |

**Verdict:** Will render. The Discord proxy cache is the biggest gotcha — if a card has a typo at launch, only fixable by changing the image URL (e.g. adding `?v=2`).

### 1.3 Slack

| Requirement | Spec | Current code | Status |
|---|---|---|---|
| Tag | `og:image` (or `og:image:secure_url`) | Emitted | OK |
| **HTTPS absolute URL** | Hard requirement. Slack rejects http and relative URLs silently. | `${base}/...` with default `https://thefutureexpress.com` | OK only if env override is HTTPS |
| `og:image:secure_url` | Slack prefers when present, but `og:image` over HTTPS suffices | Not separately emitted (Next doesn't emit `secure_url` from the `images` array) | Acceptable |
| Width/height tags | Slack uses them to pre-size the unfurl card | Emitted via Next | OK |
| Caching | Slackbot caches per-link for ~minutes-to-hours. Re-fetch with `/slack` and `/refresh`, or by changing URL. | No `Cache-Control` | **Risk** — Slack respects `Cache-Control: max-age` on the OG image. Without it, behavior is fine but not optimized. |
| Required tags | `og:title`, `og:description`, `og:image`, `og:url` | All emitted (page.tsx:71–82) | OK |
| User-Agent | `Slackbot 1.0 (+https://api.slack.com/robots)` — must be allowed by middleware/firewall | No bot blocking observed in middleware | OK |

**Verdict:** Will render assuming `NEXT_PUBLIC_APP_URL` is HTTPS in production.

### 1.4 iMessage / WhatsApp

| Requirement | Spec | Current code | Status |
|---|---|---|---|
| iMessage source | Apple's Link Presentation framework — fetches `og:image`, prefers `og:image:secure_url`, then falls back to JSON-LD `image` | OG emitted; JSON-LD `image` set to `article.imageUrl` array (page.tsx:137) — different image from the OG playcard | **Inconsistency** — iMessage may pick the article hero image (full-bleed photo) instead of the playcard. Not a bug per se but inconsistent branding. |
| iMessage size | Soft cap ~600 KB before truncation/skip | next/og: typical 50–250 KB; **EditorialCard has many nested borders + shadows that may push toward 200–400 KB**. See §2.3. | Likely OK, **needs runtime measurement** |
| iMessage ratio | No strict ratio. Renders 1200×675 acceptably as wide tile. | 1200×675 | OK |
| WhatsApp source | `og:image` only. Ignores `twitter:*`. | Emitted | OK |
| WhatsApp **size cap** | **~300 KB hard.** Above that, WhatsApp falls back to no image / link only on Android, or shows a tiny generic preview on iOS. | next/og output is *probably* under but not guaranteed. **Needs measurement.** | **Risk** |
| WhatsApp **ratio** | Strongly prefers **square (1:1) or 1.91:1 (1200×630)**. 1200×675 (1.78:1) gets center-cropped to ~1.91:1, lopping ~22 px off top/bottom. | 1200×675 | **Minor** — content near the very top (gold rule, masthead bar) and very bottom (CTA strip) may be cropped on WhatsApp. Needs visual confirmation. |
| WhatsApp caching | Caches forever per URL. To bust, change URL. No way to force refresh. | No version param | **Risk** — single most punishing platform for a buggy first launch. |

**Verdict:** WhatsApp is the highest-risk platform. Two concerns:
1. Size budget — playcard with nested borders + drop cap could exceed 300 KB.
2. Crop — twitter format may lose top/bottom edges. The masthead block (Vol/issue/tagline) could clip.

### 1.5 LinkedIn

| Requirement | Spec | Current code | Status |
|---|---|---|---|
| Tag | `og:image` | Emitted | OK |
| Preferred dims | **1200×627** (1.91:1) | 1200×675 (1.78:1) | **Minor crop risk** — LinkedIn center-crops to 1.91:1, removing ~24 px from top/bottom |
| File size | < 5 MB (recommended < 1 MB) | OK | OK |
| `og:title`, `og:description`, `og:url` | Required | All emitted | OK |
| Caching | LinkedIn Post Inspector caches; force re-scrape via `https://www.linkedin.com/post-inspector/` | No `Cache-Control` | OK (manual refresh available) |
| Author tags | `article:author`, `article:published_time` | `type: "article"` set, but no `author`/`published_time` | Minor SEO miss |

**Verdict:** Will render. Same minor top/bottom crop as WhatsApp.

---

## 2. Concrete Bugs / Risks

### 2.1 `og:image:width` / `og:image:height` emission — **OK**

`generateMetadata()` (page.tsx:75–82) returns `images: [{ url, width: 1200, height: 675, alt }]`. Next.js' metadata API converts each numeric `width`/`height` into the matching `<meta property="og:image:width">` / `og:image:height">` tags. **This is correct** — no bug here.

### 2.2 `NEXT_PUBLIC_APP_URL` default — **BUG (medium)**

- `.env:30` and `.env.example:51` both set `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- The fallback in code is `"https://thefutureexpress.com"` (page.tsx:64) — but this fallback only fires when the env var is **unset**, not when it equals localhost.
- If a Vercel deploy ships without `NEXT_PUBLIC_APP_URL` overridden, the build fallback kicks in (good).
- If a Vercel preview/production env has `NEXT_PUBLIC_APP_URL=http://localhost:3000` (likely, given `.env.vercel` exists), every OG URL on production becomes `http://localhost:3000/article/.../opengraph-image` and **every social share is broken**.
- Inconsistency: `feed.xml`, `llms.txt`, and `socialAgent.ts` use `https://future-express.vercel.app` as their fallback; `page.tsx` uses `https://thefutureexpress.com`; `widget` uses `https://futureexpress.xyz`. **Three different prod hostnames** in fallbacks. The OG `url` and image URL must agree on which is canonical.
- **No `metadataBase` is set in `app/layout.tsx`.** Without `metadataBase`, Next.js logs a warning and resolves any relative URL in metadata against `localhost`. Currently every URL is built absolute, so it works — but it's fragile.

**Files:** `src/app/article/[slug]/page.tsx:64`, `src/app/layout.tsx:45-55`, `.env:30`, `.env.example:51`.

### 2.3 OG route response shape and size — **Mostly OK, one risk**

- `opengraph-image.tsx:13` declares `export const contentType = "image/png"`. Next.js wires this into the response header. **OK.**
- The `ImageResponse` returned from `next/og` is a streaming PNG. **OK.**
- `EditorialCard` (`playcard.tsx:122–433`) has heavy nesting:
  - Outer container, gold gradient bar, masthead container with **3 nested borders** (3px outer + 1px middle + 1px under masthead row + double rule), drop-cap body, two stacked footer bands (odds + CTA), each with semi-transparent rgba inner panels.
  - Multiple `linear-gradient` calls and `rgba(...)` borders → satori (next/og's renderer) is slower and larger PNGs result.
- Empirically, plain next/og cards are 60–150 KB. This card's complexity puts it at **estimated 180–350 KB**. **Likely under WhatsApp's ~300 KB cap, but right on the edge.** Must be measured.
- **No `Cache-Control` header is set on the response.** Next.js' default for dynamic routes is no-cache. See §2.4.

### 2.4 Caching — **BUG (medium)**

The OG image route returns whatever `ImageResponse` defaults to, without an explicit `Cache-Control`. In Next.js 15, dynamic OG image routes default to `Cache-Control: public, max-age=0, must-revalidate` unless overridden. Consequences:

- **Discord proxy** still caches by URL (it ignores origin caching once it has a copy), so this is fine for Discord.
- **Slack** respects `Cache-Control` on the image — without `max-age`, Slack will re-fetch on every unfurl. **Hammers the route** under viral load (think 1000s of pastes/min).
- **Twitter** ignores cache headers and re-fetches on each card render.
- **The route does a DB query on every fetch** (opengraph-image.tsx:24–41 — joins `articles`, `markets`, `editionArticles`, `editions`). Under viral load that becomes a hot path. With no caching, every Slack unfurl, every Twitterbot crawl, every social aggregator hits the DB.

**Recommended:** add `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800` (or set `export const revalidate = 3600`) on the route. Articles are immutable per slug.

### 2.5 Missing `og:image:alt` on Twitter card — **BUG (low)**

`generateMetadata()` (page.tsx:88) passes `images: [ogImageUrl]` to `twitter` — a bare URL string. The `alt` only appears on the OpenGraph entry (page.tsx:80), which Twitter does not consume. The Twitter Card Validator warns about missing `twitter:image:alt`.

**Fix:** pass `twitter.images: [{ url: ogImageUrl, alt: "..." }]`.

### 2.6 Playcard renders with null/empty data — **One latent issue**

`opengraph-image.tsx:84` does `probability: row.probability ? Number(row.probability) : null`. Then `playcard.tsx:370` checks `payload.probability !== null && payload.probability !== undefined` — ✓ handles null correctly. **OK.**

`playcard.tsx:135–146`: when both `subheadline` and `bodyExcerpt` are empty/null:
- `dekSource = ""`, `dek = ""` → dek block hidden (✓).
- `bodySource = ""`, `body = ""` → enters the `body ? (...) : <div style={{ flex: 1 }} />` branch → empty grey block fills the body region.
- `dropCap = ""`, `bodyRest = ""` — dead branch but renders blank dropcap span.
- **Visual result:** the grey "article body" panel renders as a **flat empty grey rectangle** with no copy. Looks broken/placeholder-y. Low likelihood (articles always have body) but worth a guard.

`opengraph-image.tsx:75`: `bodyExcerpt: row.body?.slice(0, 300) ?? null` — note this slices at character 300 mid-word. The downstream `truncWordBoundary` in `playcard.tsx:83` gets a string already cut mid-word and may produce awkward truncation. Minor polish issue.

### 2.7 Format mismatch with iMessage hero photo

The article page's JSON-LD `image` field (page.tsx:137) is `article.imageUrl` (the AI-generated hero photo), not the playcard. iMessage's Link Presentation framework can prefer either source. Result: iMessage may show the raw AI hero photo, **bypassing the playcard entirely**. This is the *opposite* of viral-optimized — the playcard's CTA, brand, and odds get skipped.

If this is intentional (hero photo is more "shareable"), document it. Otherwise consider removing or aligning the JSON-LD `image` to the playcard URL.

### 2.8 Missing `metadataBase` — **Warning at build**

`src/app/layout.tsx:45` declares `export const metadata` without `metadataBase`. Next.js 13+ logs:
> "metadata.metadataBase is not set for resolving social open graph or twitter images, fallback to localhost..."

Currently harmless because the article page builds absolute URLs by hand, but it shadows real misconfigurations and breaks any future relative URL.

### 2.9 No `Last-Modified` / `ETag`

Without these, Twitterbot and Slackbot cannot conditional-GET. Every crawl re-pulls full image bytes. Worsens §2.4.

### 2.10 No `og:locale`, `og:site_name`

Minor — most platforms infer these. Slack and LinkedIn will display brand name better with `og:site_name = "The Future Express"`.

---

## 3. Manual Verification Checklist

For each, use a real article slug. Sample placeholder: `<SLUG>` = an existing slug from the DB (e.g., one of the slugs visible in `public/articles/img-*.jpg` — pick any current article).

Run all of these against **production** URL (the canonical `NEXT_PUBLIC_APP_URL`), not localhost.

### 3.1 Direct asset check (ground truth)

- Open `https://<prod>/article/<SLUG>/opengraph-image` in a browser tab.
- DevTools → Network → click the response.
  - **Look for:** `Content-Type: image/png`, response size (must be < 300 KB for WhatsApp), `Cache-Control` header.
  - **Bug indicators:** non-200 status, content-type other than `image/png`, size > 300 KB, no cache headers.
- Right-click → Save → open in Preview/Photoshop. Confirm 1200×675 px, no clipped content at edges.

### 3.2 Open Graph debug tools

- **opengraph.xyz:** `https://www.opengraph.xyz/url/https%3A%2F%2F<prod>%2Farticle%2F<SLUG>` — shows aggregated unfurl + every meta tag detected.
  - Look for: `og:image:width=1200`, `og:image:height=675`, `og:image:alt`, `twitter:image:alt`, `og:url`.
  - Bug indicator: any tag missing, any URL beginning `http://localhost`, any tag pointing to a different hostname than expected.
- **metatags.io:** `https://metatags.io/?url=https://<prod>/article/<SLUG>` — shows Google, Facebook, Twitter, LinkedIn previews side-by-side.
  - Look for: image renders in all four cards, no "image too small/large" warnings.

### 3.3 Twitter / X

- Visit `https://cards-dev.twitter.com/validator` (now requires draft tweet workflow on X).
- Alternative: paste the article URL into a draft post in X. Wait for unfurl.
- **Look for:** large image card (not summary card), correct headline, correct description.
- **Bug indicators:** image doesn't load, fallback summary card (means `twitter:card` not detected or image too large), missing/wrong text.

### 3.4 Discord

- In a private test server / DM-to-self, paste `https://<prod>/article/<SLUG>`.
- **Look for:** large embed image (not thumbnail), correct title/description, image renders inline within ~3 seconds.
- **Bug indicators:**
  - "Loading…" spinner that never resolves → image > 8 MB or 5xx from origin.
  - Tiny thumbnail instead of large embed → missing `og:image:width`/`og:image:height`, or width < 600.
  - Wrong/old image after a fix → Discord proxy cached. Append `?v=2` to slug URL or change image URL.

### 3.5 Slack

- In Slack DM-to-self, paste `https://<prod>/article/<SLUG>`.
- **Look for:** unfurl with image, title, description, site name.
- **Bug indicators:**
  - No unfurl at all → URL not HTTPS, or robots-blocking middleware, or Slack hasn't crawled yet.
  - Unfurl appears with title/description but no image → `og:image` URL not absolute HTTPS, or 4xx/5xx from origin.
  - To force re-crawl: edit and re-paste, or wait ~5 min.

### 3.6 iMessage

- iMessage to yourself with `https://<prod>/article/<SLUG>`.
- **Look for:** rich link preview (large image card with title).
- **Bug indicators:**
  - Plain blue link, no preview → image fetch failed, took > 10s, or > 600 KB.
  - Hero photo shown instead of playcard → §2.7 (JSON-LD `image` priority).
  - Tiny preview → fallback to apple-touch-icon, OG image not reachable.

### 3.7 WhatsApp

- WhatsApp message to yourself with `https://<prod>/article/<SLUG>`.
- Open from both **iOS and Android** WhatsApp clients (rendering differs).
- **Look for:** preview card with image, title, description.
- **Bug indicators:**
  - Link only, no card → most likely image > 300 KB, or non-HTTPS, or > 5s fetch.
  - Card with grey placeholder → image URL 4xx/5xx.
  - Card with cropped top/bottom (masthead bar or CTA strip clipped) → 1200×675 ratio not 1.91:1; consider 1200×630.
  - **WhatsApp caches forever per URL** — if you fix and re-test, you must use a new slug or append `?v=N`.

### 3.8 LinkedIn

- LinkedIn Post Inspector: `https://www.linkedin.com/post-inspector/inspect/https%3A%2F%2F<prod>%2Farticle%2F<SLUG>`.
- **Look for:** large image card preview, correct title, correct description.
- **Bug indicators:**
  - "Cannot inspect" → URL unreachable or robots-blocked.
  - Image not shown → > 5 MB, wrong content-type, or non-HTTPS.
  - Cropped → 1.91:1 LinkedIn center-crop discards ~24 px off top/bottom of 1200×675.
- LinkedIn Post Inspector also exposes "Refresh" — use to force re-crawl after a fix.

### 3.9 Cross-cutting

- Check at least **3 distinct articles** with different attributes:
  - One with no `subheadline` and short body.
  - One with very long headline (> 100 chars) — confirm truncation works.
  - One with `probability` null (market unresolved/loading) — confirm odds bar is hidden, not showing `0%`.
- Compare visual output to the desktop preview at `/article/<slug>` and confirm brand consistency.

---

## 4. Prioritized Fixes (ROI-Ranked)

> Top 5 only. Each is a one-line code change or a config knob — no architectural surgery.

### Fix 1 — **Set `NEXT_PUBLIC_APP_URL` correctly in production env**
**Where:** Vercel project env vars; verify via `.env.vercel` and the Vercel dashboard.
**Why:** A wrong (or localhost) value silently breaks **every social share on every platform**. Highest-blast-radius bug. Also pick **one** canonical hostname — currently three different production fallbacks live in code (`thefutureexpress.com`, `future-express.vercel.app`, `futureexpress.xyz`). Standardize on the one you actually own and serve.
**Files involved:**
- `src/app/article/[slug]/page.tsx:64`
- `src/app/article/[slug]/page.tsx:143`
- `src/app/article/[slug]/page.tsx:150`
- `src/app/article/[slug]/page.tsx:199`
- `src/app/article/[slug]/page.tsx:207`
- `src/lib/articles/socialAgent.ts:19`
- `src/app/page.tsx:88`
**Effort:** 5 min. **ROI:** Critical / blocking.

### Fix 2 — **Add `Cache-Control` (and ideally `revalidate`) to the OG image route**
**Where:** `src/app/article/[slug]/opengraph-image.tsx` — add `export const revalidate = 3600;` (top of file, beside line 12–15) and/or wrap the response in a `Response` with `headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" }`. Articles are immutable per slug; cache aggressively.
**Why:** Eliminates the per-request DB join under viral load (Slack/Twitter unfurls hammer the route). Also lets Slack reuse the cached image instead of re-fetching on every paste.
**File:line:** `src/app/article/[slug]/opengraph-image.tsx:12-15`.
**Effort:** 5 min. **ROI:** High — measured savings under any viral spike.

### Fix 3 — **Add `alt` to the twitter card image**
**Where:** `src/app/article/[slug]/page.tsx:88`.
**Change:** `images: [ogImageUrl]` → `images: [{ url: ogImageUrl, alt: \`${row.headline} — The Future Express\` }]`.
**Why:** Twitter `summary_large_image` requires `twitter:image:alt` for full validation; current bare-string form skips it. Accessibility + Twitter validator passes cleanly.
**Effort:** 1 min. **ROI:** Medium (cosmetic + a11y + validator green).

### Fix 4 — **Set `metadataBase` in root layout**
**Where:** `src/app/layout.tsx:45`.
**Change:** add `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://thefutureexpress.com")` to the exported `metadata`.
**Why:** Silences the build warning, future-proofs any relative URL, and makes the canonical host explicit in one place. Pairs with Fix 1.
**Effort:** 2 min. **ROI:** Medium — defensive.

### Fix 5 — **Switch OG image to 1200×630 (1.91:1) OR add a separate WhatsApp-friendly square crop**
**Where:**
- `src/app/article/[slug]/opengraph-image.tsx:14` — `size = { width: 1200, height: 630 }`.
- `src/app/article/[slug]/opengraph-image.tsx:67-68` — fallback `width/height`.
- `src/lib/articles/playcard.tsx:27` — `twitter: { w: 1200, h: 630 }`.
- `src/app/article/[slug]/page.tsx:78-79` — declared `width: 1200, height: 630` in `openGraph.images`.
**Why:** 1.91:1 is the universal sweet spot — Twitter, Facebook, LinkedIn, WhatsApp, iMessage all render it without center-crop. Current 16:9 (1.78:1) is *only* ideal for Twitter and gets cropped by LinkedIn and WhatsApp, clipping the masthead's gold rule and/or the CTA strip. The playcard already has lots of vertical safe-zone, so dropping 45 px is purely additive.
**Caveat:** Verify the EditorialCard layout still composes at 630 px height — the masthead block + body + odds bar + CTA may need padding tweaks. Test rendering before shipping.
**Effort:** 15–30 min including visual confirmation. **ROI:** High — eliminates cropping on three platforms simultaneously and ships viral-safe geometry.

---

## Out of Scope (Noted but Not in Top 5)

- **§2.7 iMessage hero-photo override** — JSON-LD `image` may shadow the playcard on iMessage. Decide intent (playcard vs hero) and align. ~5 min if you want playcard everywhere; remove the JSON-LD `image` array or point it at the playcard URL.
- **§2.6 Empty body fallback** — render a tasteful "Read the full briefing →" placeholder instead of empty grey when `body` and `subheadline` are both empty. Low likelihood, low effort.
- **§2.10 `og:site_name` / `og:locale`** — add to `app/layout.tsx` metadata (one line each). Marginal LinkedIn polish.
- **Image size budget runtime check** — add a CI step that fetches the OG image for a sample article and asserts size < 300 KB. Belongs in Phase 1 monitoring, not Phase 0.
- **Cache-bust mechanism** — once cards are correct, a `?v=` param strategy isn't needed; if you ever ship a card-design change, update the version param in the metadata image URL to bust Discord/WhatsApp caches.

---

## Summary

The plumbing is **mostly correct**. Five issues materially affect viral plumbing, in order:

1. `NEXT_PUBLIC_APP_URL` must be the right HTTPS prod host on Vercel — verify before launch (existential).
2. No `Cache-Control` on the OG route — DB hit per unfurl, costly under any viral load.
3. Missing `twitter:image:alt`.
4. Missing `metadataBase`.
5. 1200×675 instead of 1200×630 — gets cropped on LinkedIn + WhatsApp + iMessage.

No code changes were made by this audit.

---

## Manual Verification Procedure

**Time budget:** 10 minutes. Run before every Phase 1 launch sweep — the
five fixes above are applied in code, but only manual verification on real
platforms catches the regressions that don't show up in static analysis
(image-proxy caches, login-walled validators, Apple Link Presentation
peculiarities, etc.).

The companion automated kit (`scripts/og-verify.ts` + `scripts/og-screenshot.ts`
+ the internal `/og-verify` dashboard page) does the bulk-fetch work for you.
You only ever paste the platform URL into one DM-to-self per platform.

### Step 1 — Pick a real article URL (~30s)

Either:
- **Visit `/og-verify`** (internal admin page; not in nav). It lists the 10
  most recent articles with inline OG image previews and "Test on" buttons
  for every public validator. Click "→ article" or copy a slug from the
  page. Choose one that has both a long headline and a non-null probability
  so the playcard exercises the real layout.
- Or grab a slug straight from the live site / DB (`/api/articles?limit=1`).

### Step 2 — Run the verifier script (~45s)

```bash
npx tsx scripts/og-verify.ts <slug>
# or auto-pick the most recent article:
npx tsx scripts/og-verify.ts
```

This:
- fetches the OG image from `/article/<slug>/opengraph-image` and saves
  it to `/tmp/og-verify/<slug>-image.png`
- scrapes the article HTML for every relevant `<meta>` tag
- writes `/tmp/og-verify/REPORT.md`

**Open the report.** Confirm:
- HTTP status: `200`
- Content-Type: `image/png`
- Dimensions: **1200×630** (or 1200×675 with a known-acceptable crop note)
- Size: **< 300 KB** (the WhatsApp hard cap)
- Required meta tags all present (no "Missing:" line at the top of §2)
- No `og:image` content beginning `http://localhost`

If any of those fail → jump to the **fix-on-bug decision tree** below
before continuing.

### Step 3 — Run the public validators (~3 min)

The report emits four one-click URLs at the bottom. Open each and screenshot
the result.

| Validator | What you're checking |
|---|---|
| **opengraph.xyz** | Aggregated unfurl preview + every meta tag detected. Cross-check: does it list `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, `twitter:image:alt`, `og:url`? Does the rendered card image match `/tmp/og-verify/<slug>-image.png`? |
| **metatags.io** | Side-by-side Google / Facebook / Twitter / LinkedIn previews. Look for "image too small/large" warnings. |
| **LinkedIn Post Inspector** | Forces LinkedIn to refresh its cache for the URL. Click "Inspect". Confirm large image card, correct title/description. If "Cannot inspect" — URL is unreachable from LinkedIn's crawlers (firewall? robots.txt?). |
| **Twitter cards-dev** | Deprecated for new accounts. If it errors, paste the URL into a draft post on x.com/compose/post — the unfurl card appears in the composer. |

Optional but recommended for visual evidence: run

```bash
npx tsx scripts/og-screenshot.ts <slug>
```

This drives the gstack browse daemon to capture opengraph.xyz, LinkedIn
Post Inspector, and metatags.io as PNGs in `/tmp/og-verify/`.

### Step 4 — DM-yourself sweep (~5 min)

These platforms expose **no public validator**. The only way to verify is
to paste the URL into a private channel / DM-to-self and watch the unfurl.

| Platform | Where to paste | What "good" looks like | Common bug indicators |
|---|---|---|---|
| **Discord** | DM-to-self in any private server | Large embed image (not thumbnail) + headline + subhead within ~3s | Tiny thumbnail (missing width/height); "loading…" forever (image > 8 MB); old image after fix (Discord proxy cached — append `?v=2`) |
| **Slack** | DM-to-self / `#test-personal` | Image + title + description + site name unfurl | No unfurl (URL not HTTPS, robots-blocked, or Slackbot still crawling — wait 5 min); title-only, no image (`og:image` URL not absolute HTTPS or 4xx/5xx) |
| **iMessage** | New thread to your own number | Rich link preview with large image + title | Plain blue link (image fetch failed / > 600 KB / > 10s); **hero photo shown instead of playcard** (JSON-LD `image` priority — see §2.7) |
| **WhatsApp** | DM-to-self ("WhatsApp Web → search yourself"). Test on **iOS and Android** | Preview card with image + title + description | Link only, no card (image > 300 KB or non-HTTPS); cropped top/bottom (1200×675 not 1.91:1 — masthead/CTA clipped); **WhatsApp caches forever per URL** — to retest after a fix, use a new slug |
| **Telegram** | @SavedMessages | Instant preview card | No preview (image not absolute HTTPS); to force re-cache, send the URL to @WebpageBot |

**Screenshot each unfurl** and dump them in a temp folder. Five screenshots,
five seconds each — you're done.

### Step 5 — Cross-cutting sanity (~1 min)

Repeat the dashboard check on at least **3 distinct articles** with different
shapes. From `/og-verify`:
- one with no `subheadline` and short body (confirm playcard doesn't render
  empty grey rectangle, see §2.6)
- one with a very long headline (> 100 chars; confirm truncation works)
- one with `probability` null (confirm odds bar hides instead of showing `0%`)

### Fix-on-bug decision tree

If something fails during Steps 2–4, follow the matching branch.

```
Bug?
├─ Image route returns non-200?
│   → Check Vercel logs / `next dev` console.
│   → Check that the slug actually exists in the DB.
│   → Verify opengraph-image.tsx didn't throw on the DB query.
│
├─ Image route returns 200 but wrong content-type?
│   → contentType export in opengraph-image.tsx must be "image/png".
│
├─ Image > 300 KB?
│   → Open /tmp/og-verify/<slug>-image.png in Preview/ImageOptim.
│   → If much larger than expected (> 400 KB), the playcard has too many
│     gradients/borders — see §2.3. Simplify EditorialCard.
│   → Otherwise: bump cache headers and accept WhatsApp may degrade.
│
├─ og:image content starts with http://localhost?
│   → NEXT_PUBLIC_APP_URL is wrong on the deployed env.
│   → Fix in Vercel project env vars; redeploy.
│
├─ Twitter card not rendering large image?
│   → Confirm `twitter:card = summary_large_image` is emitted.
│   → Confirm `twitter:image:alt` is emitted (Fix 3 in §4 above).
│   → Image must be < 5 MB and HTTPS.
│
├─ WhatsApp link only, no preview?
│   → Most likely image > 300 KB (check report §1).
│   → Or image not HTTPS.
│   → Or fetch took > 5s (check origin latency).
│
├─ Discord shows wrong/old image after a fix?
│   → Discord proxy cache. Append ?v=2 to the slug URL the first time
│     someone shares the new card. Discord will fetch the new image.
│
├─ LinkedIn "Cannot inspect"?
│   → curl -I <article-url> and confirm 200.
│   → Check robots.txt and any middleware that might block crawlers.
│
├─ iMessage shows the article hero photo, not the playcard?
│   → JSON-LD `image` field is shadowing the OG playcard. See §2.7.
│   → Either remove the JSON-LD `image` array, or point it at the OG
│     playcard URL.
│
├─ Generic globe icon / blank preview on any platform?
│   → og:image URL must be absolute and HTTPS.
│   → Origin must respond < 10s with `image/*` content-type.
│   → Re-run scripts/og-verify.ts and check report §1.
│
├─ Cropped masthead or CTA strip?
│   → 1200×675 (1.78:1) gets center-cropped to 1.91:1 by LinkedIn
│     and WhatsApp. Switch to 1200×630 (Fix 5 in §4).
│
└─ "see more" stripping the subhead?
    → Description > 160 chars on Twitter/LinkedIn. The metadata
      description is sliced to 160 in page.tsx generateMetadata —
      confirm subheadline isn't also wrapped by a different code path.
```

### Definition of done

You can sign off launch verification when:
- `/og-verify` returns 200 and renders inline previews correctly for the
  10 most recent articles.
- `npx tsx scripts/og-verify.ts` produces a clean `/tmp/og-verify/REPORT.md`
  with no missing required meta tags and image size < 300 KB.
- All four public validators (Step 3) render the correct large-image card.
- All five DM-to-self platforms (Step 4) render the playcard, not the hero
  photo, not a generic globe icon, not a "see more" stub.
- The cross-cutting sanity check (Step 5) shows no broken edge cases.

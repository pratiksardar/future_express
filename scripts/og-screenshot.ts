/**
 * OG screenshot kit — captures visual evidence of how social platforms
 * unfurl an article URL. Drives the gstack `browse` daemon binary to:
 *
 *   1. Visit opengraph.xyz with the article URL — they render Twitter,
 *      Facebook, LinkedIn, Discord previews on a single page.
 *   2. Visit LinkedIn Post Inspector (best-effort; will likely require
 *      login — we screenshot whatever lands).
 *
 * Output PNGs go to /tmp/og-verify/ alongside the og-verify report.
 *
 * Usage:
 *   npx tsx scripts/og-screenshot.ts                # auto-pick latest article
 *   npx tsx scripts/og-screenshot.ts <slug>
 *
 * Env:
 *   BROWSE_BIN — override path to gstack browse binary (defaults to
 *                ~/.claude/skills/gstack/browse/dist/browse).
 *   OG_VERIFY_BASE_URL — override the article base URL (else getAppUrl()).
 */

import { config } from "dotenv";
import { mkdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { db } from "../src/lib/db";
import { articles } from "../src/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getAppUrl } from "../src/lib/url";

config({ path: ".env.local" });
config();

const OUTPUT_DIR = "/tmp/og-verify";
const DEFAULT_BROWSE_BIN = join(homedir(), ".claude/skills/gstack/browse/dist/browse");

function getBrowseBin(): string {
  return process.env.BROWSE_BIN ?? DEFAULT_BROWSE_BIN;
}

function getBaseUrl(): string {
  const override = process.env.OG_VERIFY_BASE_URL;
  if (override && override.length > 0) return override.replace(/\/$/, "");
  return getAppUrl();
}

async function pickSlug(explicit: string | undefined): Promise<string> {
  if (explicit) {
    const rows = await db
      .select({ slug: articles.slug })
      .from(articles)
      .where(eq(articles.slug, explicit))
      .limit(1);
    if (rows.length === 0) {
      throw new Error(`No article with slug "${explicit}" found.`);
    }
    return explicit;
  }
  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .orderBy(desc(articles.publishedAt))
    .limit(1);
  if (rows.length === 0) throw new Error("No articles in DB.");
  return rows[0].slug;
}

interface BrowseResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Invoke the gstack browse CLI. We pass through stdout/stderr to the
 * caller because the CLI prints structured progress lines.
 */
function browse(args: string[]): Promise<BrowseResult> {
  return new Promise((resolve) => {
    const bin = getBrowseBin();
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d: Buffer) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on("error", (err) => {
      stderr += `\nspawn error: ${err.message}\n`;
      resolve({ code: -1, stdout, stderr });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

async function browseBinExists(): Promise<boolean> {
  try {
    await access(getBrowseBin());
    return true;
  } catch {
    return false;
  }
}

interface ShotTarget {
  name: string;
  url: string;
  outFile: string;
  waitMs: number;
}

async function captureTarget(t: ShotTarget): Promise<{ ok: boolean; reason?: string }> {
  console.log(`\n[og-screenshot] === ${t.name} ===`);
  console.log(`[og-screenshot] URL:  ${t.url}`);
  console.log(`[og-screenshot] OUT:  ${t.outFile}`);

  // Use `browse shot` for a single-shot navigate-and-screenshot flow.
  // Falls back to `goto` + `screenshot` if `shot` isn't a recognized command.
  const shotArgs = [
    "shot",
    t.url,
    "--out",
    t.outFile,
    "--wait",
    String(t.waitMs),
  ];
  const result = await browse(shotArgs);
  if (result.code === 0) return { ok: true };

  console.log(`[og-screenshot] 'shot' failed (code ${result.code}); trying goto+screenshot fallback`);
  const goto = await browse(["goto", t.url]);
  if (goto.code !== 0) return { ok: false, reason: `goto failed: ${goto.stderr.slice(-200)}` };
  await new Promise((r) => setTimeout(r, t.waitMs));
  const shot = await browse(["screenshot", "--out", t.outFile, "--full"]);
  if (shot.code !== 0) return { ok: false, reason: `screenshot failed: ${shot.stderr.slice(-200)}` };
  return { ok: true };
}

async function main(): Promise<void> {
  const argSlug = process.argv[2];
  await mkdir(OUTPUT_DIR, { recursive: true });

  if (!(await browseBinExists())) {
    console.error(`[og-screenshot] gstack browse binary not found at ${getBrowseBin()}`);
    console.error(`[og-screenshot] Set BROWSE_BIN env var or install gstack browse.`);
    console.error(`[og-screenshot] Skipping screenshot phase — falling back to URL-only output.`);
    process.exit(2);
  }

  const slug = await pickSlug(argSlug);
  const base = getBaseUrl();
  const articleUrl = `${base}/article/${slug}`;
  const enc = encodeURIComponent(articleUrl);

  console.log(`[og-screenshot] slug:        ${slug}`);
  console.log(`[og-screenshot] article URL: ${articleUrl}`);

  const targets: ShotTarget[] = [
    {
      name: "opengraph.xyz (Twitter / Facebook / LinkedIn / Discord previews)",
      url: `https://www.opengraph.xyz/url/${enc}`,
      outFile: join(OUTPUT_DIR, `opengraph-xyz-${slug}.png`),
      waitMs: 6000,
    },
    {
      name: "LinkedIn Post Inspector (login-walled)",
      url: `https://www.linkedin.com/post-inspector/inspect/${enc}`,
      outFile: join(OUTPUT_DIR, `linkedin-inspector-${slug}.png`),
      waitMs: 5000,
    },
    {
      name: "metatags.io (multi-platform side-by-side)",
      url: `https://metatags.io/?url=${enc}`,
      outFile: join(OUTPUT_DIR, `metatags-io-${slug}.png`),
      waitMs: 5000,
    },
  ];

  const results: { target: ShotTarget; ok: boolean; reason?: string }[] = [];
  for (const t of targets) {
    const r = await captureTarget(t);
    results.push({ target: t, ...r });
  }

  console.log("\n[og-screenshot] Summary:");
  for (const r of results) {
    const status = r.ok ? "OK" : "FAIL";
    console.log(`  [${status}] ${r.target.name}`);
    console.log(`         ${r.target.outFile}`);
    if (!r.ok && r.reason) console.log(`         reason: ${r.reason}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[og-screenshot] FATAL:", err);
    process.exit(1);
  });

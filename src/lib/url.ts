/**
 * Canonical app URL helper.
 *
 * The Future Express has a single canonical production hostname:
 * `https://thefutureexpress.com`. Older fallbacks (`future-express.vercel.app`,
 * `futureexpress.xyz`) historically leaked into the codebase as defaults — that
 * caused inconsistent OG `url` and image URLs across social platforms.
 *
 * Always read the env var first; fall back to the canonical host only when
 * unset (e.g. local dev without an override). Deploy-time env values still win.
 */

export const CANONICAL_APP_URL = "https://thefutureexpress.com";

export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, "");
  return CANONICAL_APP_URL;
}

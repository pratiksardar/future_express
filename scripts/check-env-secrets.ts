/**
 * Ensures no API keys or secrets are exposed to the frontend via NEXT_PUBLIC_ prefix.
 * Run before deploy (e.g. in CI or "npm run check-env").
 * Exits 1 if any .env / .env.local line sets a forbidden NEXT_PUBLIC_ variable.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Prefixes that are always secrets (no safe NEXT_PUBLIC_ variant)
const FORBIDDEN_PREFIXES = [
  "NEXT_PUBLIC_OPENAI",
  "NEXT_PUBLIC_OPENROUTER",
  "NEXT_PUBLIC_ANTHROPIC",
  "NEXT_PUBLIC_TAVILY",
  "NEXT_PUBLIC_BRAVE",
  "NEXT_PUBLIC_UNISWAP",
  "NEXT_PUBLIC_DATABASE",
  "NEXT_PUBLIC_CDP_",
  "NEXT_PUBLIC_HEDERA",
];
// KALSHI/POLYMARKET affiliate URLs are safe (NEXT_PUBLIC_KALSHI_AFFILIATE_URL); only _API_KEY is forbidden

function readEnvLines(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  try {
    return readFileSync(filePath, "utf8").split("\n");
  } catch {
    return [];
  }
}

function isForbiddenKey(key: string): boolean {
  const k = key.trim();
  if (!k.startsWith("NEXT_PUBLIC_")) return false;
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (k.startsWith(prefix)) return true;
  }
  if (/_API_KEY$/.test(k) || /_SECRET$/.test(k) || /_PRIVATE_KEY$/.test(k)) return true;
  return false;
}

function main() {
  const cwd = process.cwd();
  const envFiles = [
    join(cwd, ".env"),
    join(cwd, ".env.local"),
    join(cwd, ".env.vercel"),
  ].filter(existsSync);

  let failed = false;
  for (const filePath of envFiles) {
    const lines = readEnvLines(filePath);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (!match) continue;
      const key = match[1];
      if (isForbiddenKey(key)) {
        console.error(`[check-env-secrets] Forbidden: ${key} in ${filePath}`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error("\nDo NOT use NEXT_PUBLIC_ for API keys or secrets. They would be exposed in the browser.");
    console.error("On Vercel, add these as normal (server-only) environment variables.");
    process.exit(1);
  }
  console.log("check-env-secrets: no sensitive keys exposed via NEXT_PUBLIC_");
}

main();

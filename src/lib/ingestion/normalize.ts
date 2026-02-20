import type { Category } from "./types";
import type { PolymarketEvent } from "./types";
import type { KalshiMarket } from "./types";
import { parsePolymarketProbability, getPolymarketVolume24h } from "./polymarket";
import { parseKalshiProbability, getKalshiVolume } from "./kalshi";
import type { NormalizedMarket } from "./types";

const TAG_TO_CATEGORY: Record<string, Category> = {
  politics: "politics",
  crypto: "crypto",
  "crypto & web3": "crypto",
  economy: "economy",
  sports: "sports",
  tech: "science",
  science: "science",
  entertainment: "entertainment",
  world: "world",
};

function inferCategoryFromTitle(title: string, tags?: Array<{ slug: string }>): Category {
  const lower = title.toLowerCase();
  if (tags?.length) {
    for (const t of tags) {
      const c = TAG_TO_CATEGORY[t.slug?.toLowerCase() ?? ""];
      if (c) return c;
    }
  }
  if (/\b(bitcoin|ether|eth|btc|crypto|defi|nft)\b/i.test(lower)) return "crypto";
  if (/\b(trump|biden|election|congress|senate|vote)\b/i.test(lower)) return "politics";
  if (/\b(fed|inflation|rate|gdp|recession)\b/i.test(lower)) return "economy";
  if (/\b(nfl|nba|mlb|soccer|super bowl|championship)\b/i.test(lower)) return "sports";
  if (/\b(oscar|film|movie|grammy)\b/i.test(lower)) return "entertainment";
  return "politics";
}

export function normalizePolymarketEvent(event: PolymarketEvent): NormalizedMarket {
  const prob = parsePolymarketProbability(event);
  const probStr = prob != null ? String(prob) : "50";
  const category = inferCategoryFromTitle(event.title, event.tags);
  return {
    polymarketId: event.id,
    polymarketSlug: event.slug ?? undefined,
    title: event.title ?? "",
    description: event.description ?? undefined,
    category,
    currentProbability: probStr,
    polymarketProbability: probStr,
    volume24h: String(getPolymarketVolume24h(event)),
    status: event.closed ? "closed" : "active",
  };
}

export function normalizeKalshiMarket(market: KalshiMarket): NormalizedMarket {
  const prob = parseKalshiProbability(market);
  const probStr = prob != null ? String(prob) : "50";
  const category = inferCategoryFromTitle(market.title ?? "");
  return {
    kalshiTicker: market.ticker,
    kalshiEventTicker: market.event_ticker,
    title: market.title ?? "",
    description: market.subtitle,
    category,
    currentProbability: probStr,
    kalshiProbability: probStr,
    volume24h: String(getKalshiVolume(market)),
    status: market.status === "settled" ? "resolved" : market.status === "closed" ? "closed" : "active",
    resolutionOutcome: market.result,
  };
}

export function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  const dp: number[][] = Array(an + 1)
    .fill(null)
    .map(() => Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) dp[i][0] = i;
  for (let j = 0; j <= bn; j++) dp[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[an][bn];
}

export function normalizeTitleForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

export function matchScore(a: string, b: string): number {
  const na = normalizeTitleForMatch(a);
  const nb = normalizeTitleForMatch(b);
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 0 : 1 - dist / maxLen;
}

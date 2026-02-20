import type { KalshiMarket } from "./types";

const KALSHI_BASE = "https://trading-api.kalshi.com/trade-api/v2";

export async function fetchKalshiMarkets(limit = 100): Promise<KalshiMarket[]> {
  const url = new URL("/markets", KALSHI_BASE);
  url.searchParams.set("status", "open");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(process.env.KALSHI_API_KEY && {
        Authorization: `Bearer ${process.env.KALSHI_API_KEY}`,
      }),
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Kalshi API error: ${res.status}`);
  const data = await res.json();
  const markets = data.markets ?? data;
  return Array.isArray(markets) ? markets : [];
}

export function parseKalshiProbability(market: KalshiMarket): number | null {
  const yesAsk = market.yes_ask;
  const yesBid = market.yes_bid;
  if (typeof yesAsk === "number" && yesAsk >= 0 && yesAsk <= 1) {
    return Math.round(yesAsk * 100);
  }
  if (typeof yesBid === "number" && yesBid >= 0 && yesBid <= 1) {
    return Math.round(yesBid * 100);
  }
  return null;
}

export function getKalshiVolume(market: KalshiMarket): number {
  const v = market.volume ?? 0;
  return typeof v === "number" ? v : 0;
}

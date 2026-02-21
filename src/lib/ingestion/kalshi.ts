import type { KalshiMarket } from "./types";

// Kalshi migrated their API in late 2025 — the old trading-api.kalshi.com returns 401.
const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";

/**
 * Fetches open Kalshi events with their nested markets.
 * We use the /events endpoint because it gives us proper human-readable titles
 * and groups related sub-markets together (like Polymarket events).
 */
export async function fetchKalshiMarkets(limit = 100): Promise<KalshiMarket[]> {
  const url = `${KALSHI_BASE}/events?status=open&limit=${limit}&with_nested_markets=true`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(process.env.KALSHI_API_KEY && {
        Authorization: `Bearer ${process.env.KALSHI_API_KEY}`,
      }),
    },
    signal: AbortSignal.timeout(15000), // 15s timeout
  });
  if (!res.ok) throw new Error(`Kalshi API error: ${res.status}`);
  const data = await res.json();

  // The events endpoint returns { events: [...] }, each with a nested markets[] array.
  // We flatten each event's first (or highest-volume) market into a KalshiMarket shape.
  const events = data.events ?? [];
  const flatMarkets: KalshiMarket[] = [];

  for (const event of events) {
    const mkts = event.markets ?? [];
    if (mkts.length === 0) continue;

    // Pick the market with the highest volume across all sub-markets for this event
    const bestMarket = mkts.reduce((best: any, m: any) => {
      return (m.volume ?? 0) > (best.volume ?? 0) ? m : best;
    }, mkts[0]);

    flatMarkets.push({
      ticker: bestMarket.ticker ?? event.event_ticker,
      event_ticker: event.event_ticker,
      title: event.title || bestMarket.title || "",
      subtitle: event.sub_title || bestMarket.subtitle || "",
      category: event.category,
      yes_ask: bestMarket.yes_ask,
      yes_bid: bestMarket.yes_bid,
      no_ask: bestMarket.no_ask,
      no_bid: bestMarket.no_bid,
      volume: bestMarket.volume ?? 0,
      volume_24h: bestMarket.volume_24h ?? 0,
      open_time: bestMarket.open_time,
      close_time: bestMarket.close_time,
      status: bestMarket.status ?? "active",
      result: bestMarket.result,
    });
  }

  return flatMarkets;
}

/**
 * Kalshi prices are in CENTS (0-100), NOT fractions (0-1).
 * yes_ask=65 means 65% probability. We compute midpoint of bid/ask.
 */
export function parseKalshiProbability(market: KalshiMarket): number | null {
  const yesAsk = market.yes_ask;
  const yesBid = market.yes_bid;

  // Both bid and ask exist → use midpoint for best estimate
  if (typeof yesAsk === "number" && typeof yesBid === "number" && yesAsk > 0) {
    return Math.round((yesAsk + yesBid) / 2); // already in 0-100
  }
  // Only ask
  if (typeof yesAsk === "number" && yesAsk > 0 && yesAsk <= 100) {
    return yesAsk;
  }
  // Only bid
  if (typeof yesBid === "number" && yesBid > 0 && yesBid <= 100) {
    return yesBid;
  }
  return null;
}

export function getKalshiVolume(market: KalshiMarket): number {
  // Prefer 24h volume, fallback to total volume
  const v24 = market.volume_24h;
  if (typeof v24 === "number" && v24 > 0) return v24;
  const v = market.volume ?? 0;
  return typeof v === "number" ? v : 0;
}


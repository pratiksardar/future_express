import type { PolymarketEvent } from "./types";

const GAMMA_BASE = "https://gamma-api.polymarket.com";

/**
 * Fetches events from Polymarket Gamma API.
 * Uses minimal params for compatibility; sorts by volume client-side if needed.
 * See: https://docs.polymarket.com/developers/gamma-markets-api/get-events
 */
export async function fetchPolymarketEvents(limit = 100): Promise<PolymarketEvent[]> {
  const url = new URL("/events", GAMMA_BASE);
  url.searchParams.set("limit", String(Math.min(limit, 100)));
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      const j = JSON.parse(body) as { message?: string; error?: string };
      detail = j.message ?? j.error ?? body;
    } catch {
      // use raw body
    }
    throw new Error(`Polymarket Gamma API error: ${res.status} — ${detail}`);
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  const byVolume = (a: PolymarketEvent, b: PolymarketEvent) =>
    (getPolymarketVolume24h(b) - getPolymarketVolume24h(a));
  list.sort(byVolume);
  return list.slice(0, limit);
}

export function parsePolymarketProbability(event: PolymarketEvent): number | null {
  try {
    let bestProb = 0;

    // Some Polymarket events group multiple sub-markets (e.g., various candidates).
    // We want the most likely "Yes" outcome across all active sub-markets to represent the headline.
    const subMarkets = event.markets && event.markets.length > 0 ? event.markets : [event as any];

    let foundValid = false;

    for (const market of subMarkets) {
      if (market.closed) continue;

      const pricesStr = market.outcomePrices ?? event.outcomePrices;
      const outcomesStr = market.outcomes ?? event.outcomes;

      if (pricesStr && outcomesStr) {
        let pricesArr: string[], outcomesArr: string[];
        try {
          pricesArr = JSON.parse(pricesStr);
          outcomesArr = JSON.parse(outcomesStr);
        } catch {
          continue;
        }

        const yesIndex = outcomesArr.findIndex(
          (o) => typeof o === "string" && o.toLowerCase() === "yes"
        );

        if (yesIndex !== -1 && pricesArr[yesIndex]) {
          const yesProb = parseFloat(pricesArr[yesIndex]);
          if (!isNaN(yesProb) && yesProb > bestProb) {
            bestProb = yesProb;
            foundValid = true;
          }
        } else {
          for (const p of pricesArr) {
            const prob = parseFloat(p);
            if (!isNaN(prob) && prob > bestProb) {
              bestProb = prob;
              foundValid = true;
            }
          }
        }
      }
    }

    if (foundValid) {
      return Math.round(bestProb * 100);
    }
  } catch {
    // ignore
  }
  return null;
}

export function getPolymarketVolume24h(event: PolymarketEvent): number {
  const v = event.volume24hr ?? event.volume ?? 0;
  return typeof v === "number" ? v : 0;
}

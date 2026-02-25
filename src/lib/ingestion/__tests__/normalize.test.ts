import { describe, it, expect } from "vitest";
import {
    levenshtein,
    normalizeTitleForMatch,
    matchScore,
    normalizePolymarketEvent,
    normalizeKalshiMarket,
} from "@/lib/ingestion/normalize";
import type { PolymarketEvent, KalshiMarket } from "@/lib/ingestion/types";

// ── levenshtein ──

describe("levenshtein", () => {
    it("returns 0 for identical strings", () => {
        expect(levenshtein("hello", "hello")).toBe(0);
    });

    it("returns correct edit distance", () => {
        expect(levenshtein("kitten", "sitting")).toBe(3);
    });

    it("handles empty strings", () => {
        expect(levenshtein("", "abc")).toBe(3);
        expect(levenshtein("abc", "")).toBe(3);
        expect(levenshtein("", "")).toBe(0);
    });
});

// ── normalizeTitleForMatch ──

describe("normalizeTitleForMatch", () => {
    it("lowercases and strips special chars", () => {
        expect(normalizeTitleForMatch("Will Trump WIN?!")).toBe("will trump win");
    });

    it("normalizes whitespace", () => {
        expect(normalizeTitleForMatch("  multiple   spaces  ")).toBe(
            "multiple spaces"
        );
    });
});

// ── matchScore ──

describe("matchScore", () => {
    it("returns 1 for identical titles", () => {
        expect(matchScore("Same Title", "Same Title")).toBe(1);
    });

    it("returns 1 for identical titles with different casing", () => {
        expect(matchScore("Same Title", "same title")).toBe(1);
    });

    it("returns high score for very similar titles", () => {
        const score = matchScore(
            "Will Bitcoin reach $100k by 2025?",
            "Will Bitcoin reach $100k by 2025"
        );
        expect(score).toBeGreaterThan(0.9);
    });

    it("returns low score for completely different titles", () => {
        const score = matchScore("Bitcoin price prediction", "NFL Super Bowl 2025");
        expect(score).toBeLessThan(0.5);
    });

    it("returns 1 for two empty strings (identical)", () => {
        // matchScore checks string equality first: "" === "" → 1
        expect(matchScore("", "")).toBe(1);
    });
});

// ── normalizePolymarketEvent ──

describe("normalizePolymarketEvent", () => {
    it("normalizes a basic Polymarket event", () => {
        const event: PolymarketEvent = {
            id: "poly-123",
            slug: "bitcoin-100k",
            title: "Will Bitcoin reach $100k?",
            description: "Test description",
            volume24hr: 50000,
            closed: false,
            outcomePrices: JSON.stringify([0.65, 0.35]),
        };

        const result = normalizePolymarketEvent(event);

        expect(result.polymarketId).toBe("poly-123");
        expect(result.polymarketSlug).toBe("bitcoin-100k");
        expect(result.title).toBe("Will Bitcoin reach $100k?");
        expect(result.status).toBe("active");
        expect(result.category).toBe("crypto"); // inferred from "Bitcoin"
        expect(result.volume24h).toBeDefined();
    });

    it("marks closed events as closed", () => {
        const event: PolymarketEvent = {
            id: "poly-456",
            title: "Some market",
            closed: true,
        };

        const result = normalizePolymarketEvent(event);
        expect(result.status).toBe("closed");
    });

    it("infers politics category from title", () => {
        const event: PolymarketEvent = {
            id: "poly-789",
            title: "Will Trump win the election?",
        };

        const result = normalizePolymarketEvent(event);
        expect(result.category).toBe("politics");
    });
});

// ── normalizeKalshiMarket ──

describe("normalizeKalshiMarket", () => {
    it("normalizes a basic Kalshi market", () => {
        const market: KalshiMarket = {
            ticker: "KALSHI-BTC-100K",
            event_ticker: "BTC-100K",
            title: "Bitcoin above $100k by Dec 2025",
            subtitle: "Detailed description",
            category: "crypto",
            yes_ask: 65,
            volume_24h: 10000,
            status: "open",
        };

        const result = normalizeKalshiMarket(market);

        expect(result.kalshiTicker).toBe("KALSHI-BTC-100K");
        expect(result.kalshiEventTicker).toBe("BTC-100K");
        expect(result.title).toBe("Bitcoin above $100k by Dec 2025");
        expect(result.status).toBe("active");
        expect(result.category).toBe("crypto");
    });

    it("maps settled status to resolved", () => {
        const market: KalshiMarket = {
            ticker: "KALSHI-SETTLED",
            title: "Settled market",
            status: "settled",
            result: "yes",
        };

        const result = normalizeKalshiMarket(market);
        expect(result.status).toBe("resolved");
        expect(result.resolutionOutcome).toBe("yes");
    });

    it("maps Kalshi category strings to internal categories", () => {
        const market: KalshiMarket = {
            ticker: "KALSHI-ECON",
            title: "GDP growth above 3%",
            category: "economics",
        };

        const result = normalizeKalshiMarket(market);
        expect(result.category).toBe("economy");
    });
});

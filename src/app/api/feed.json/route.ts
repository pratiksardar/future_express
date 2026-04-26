import { db } from "@/lib/db";
import { articles, markets, editions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const PROB_LABELS = (p: number) => {
    if (p >= 90) return "Near Certain";
    if (p >= 70) return "Very Likely";
    if (p >= 50) return "Leaning Yes";
    if (p >= 40) return "Toss-Up";
    if (p >= 20) return "Leaning No";
    if (p >= 5) return "Unlikely";
    return "Long Shot";
};

/**
 * GET /api/feed.json
 *
 * Free, public, unauthenticated JSON feed — the fastest way for agents and
 * bots to ingest The Future Express without HTML parsing or API keys.
 *
 * Query params:
 *   limit    — number of articles to return (default: 10, max: 50)
 *   category — filter by category (politics | economy | crypto | sports | science | entertainment | world)
 *
 * Response fields per article:
 *   headline, subheadline, category, odds (0–1 float), oddsLabel,
 *   oddsPercent (integer), source, volume24h, date (ISO 8601 with time),
 *   url (full URL to article page)
 */
export async function GET(req: Request) {
    const appUrl = getAppUrl();
    const { searchParams } = new URL(req.url);

    const limitParam = Number(searchParams.get("limit")) || 10;
    const limit = Math.min(Math.max(limitParam, 1), 50);
    const categoryParam = searchParams.get("category");

    const validCategories = [
        "politics",
        "economy",
        "crypto",
        "sports",
        "science",
        "entertainment",
        "world",
    ] as const;
    type Category = (typeof validCategories)[number];
    const category =
        categoryParam && validCategories.includes(categoryParam as Category)
            ? (categoryParam as Category)
            : null;

    try {
        // Fetch latest edition metadata
        const [latestEdition] = await db
            .select({
                volumeNumber: editions.volumeNumber,
                publishedAt: editions.publishedAt,
            })
            .from(editions)
            .orderBy(desc(editions.publishedAt))
            .limit(1);

        // Fetch articles with live market data
        const query = db
            .select({
                headline: articles.headline,
                subheadline: articles.subheadline,
                slug: articles.slug,
                category: articles.category,
                probabilityAtPublish: articles.probabilityAtPublish,
                currentProbability: markets.currentProbability,
                volume24h: markets.volume24h,
                publishedAt: articles.publishedAt,
                polymarketSlug: markets.polymarketSlug,
                kalshiTicker: markets.kalshiTicker,
            })
            .from(articles)
            .innerJoin(markets, eq(articles.marketId, markets.id))
            .orderBy(desc(articles.publishedAt))
            .limit(limit);

        const rows = category ? await query.where(eq(articles.category, category)) : await query;

        const feedArticles = rows.map((a) => {
            const rawOdds = a.currentProbability ?? a.probabilityAtPublish;
            const oddsPercent = rawOdds ? parseInt(String(rawOdds), 10) : 50;
            const sources: string[] = [];
            if (a.polymarketSlug) sources.push("Polymarket");
            if (a.kalshiTicker) sources.push("Kalshi");

            return {
                headline: a.headline,
                subheadline: a.subheadline ?? null,
                category: a.category,
                odds: parseFloat((oddsPercent / 100).toFixed(2)),
                oddsPercent,
                oddsLabel: PROB_LABELS(oddsPercent),
                source: sources.length > 0 ? sources.join(" + ") : "Polymarket",
                volume24h: a.volume24h ? parseFloat(String(a.volume24h)) : null,
                date: a.publishedAt
                    ? new Date(a.publishedAt).toISOString()
                    : null,
                url: `${appUrl}/article/${a.slug}`,
            };
        });

        return NextResponse.json(
            {
                generated: new Date().toISOString(),
                edition: latestEdition
                    ? {
                        volume: latestEdition.volumeNumber,
                        publishedAt: latestEdition.publishedAt
                            ? new Date(latestEdition.publishedAt).toISOString()
                            : null,
                    }
                    : null,
                count: feedArticles.length,
                articles: feedArticles,
                _links: {
                    rss: `${appUrl}/feed.xml`,
                    api: `${appUrl}/api/v1/health`,
                    openapi: `${appUrl}/api/v1/openapi.json`,
                    llms: `${appUrl}/llms.txt`,
                },
            },
            {
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (e) {
        return NextResponse.json(
            { error: "Failed to load feed", detail: String(e) },
            { status: 500 }
        );
    }
}

import { db } from "@/lib/db";
import { articles, editions, markets, apiKeys } from "@/lib/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public health/status endpoint — no auth required. */
export async function GET() {
    try {
        const [latestEdition] = await db
            .select({ publishedAt: editions.publishedAt, volumeNumber: editions.volumeNumber })
            .from(editions)
            .orderBy(desc(editions.publishedAt))
            .limit(1);

        const [articleCount] = await db.select({ value: count() }).from(articles);
        const [marketCount] = await db
            .select({ value: count() })
            .from(markets)
            .where(eq(markets.status, "active"));
        const [keyCount] = await db.select({ value: count() }).from(apiKeys);

        return NextResponse.json({
            status: "operational",
            version: "1.0.0",
            platform: "The Future Express",
            description: "AI-generated prediction market news — powered by Polymarket, Kalshi, and autonomous agents.",
            latestEdition: latestEdition
                ? {
                    volumeNumber: latestEdition.volumeNumber,
                    publishedAt: latestEdition.publishedAt?.toISOString() ?? null,
                }
                : null,
            stats: {
                totalArticles: Number(articleCount?.value ?? 0),
                activeMarkets: Number(marketCount?.value ?? 0),
                registeredApiKeys: Number(keyCount?.value ?? 0),
            },
            endpoints: {
                articles: "/api/v1/articles",
                articleBySlug: "/api/v1/articles/:slug",
                latestEdition: "/api/v1/editions/latest",
                markets: "/api/v1/markets",
                search: "/api/v1/search?q=",
                generateKey: "POST /api/v1/keys",
                health: "/api/v1/health",
            },
            auth: {
                apiKey: "Authorization: Bearer fe_YOUR_KEY",
                x402: "X-402-Payment: TX_HASH (send ETH to agent wallet on Base Sepolia)",
            },
        });
    } catch (e) {
        return NextResponse.json({ status: "error", error: String(e) }, { status: 500 });
    }
}

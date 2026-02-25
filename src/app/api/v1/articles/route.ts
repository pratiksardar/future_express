import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
    authenticateRequest,
    build402Response,
    logApiUsage,
    TRADE_LINKS,
} from "@/lib/api/middleware";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
        if (auth.status === 402) return build402Response();
        return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });
    }

    // Log usage
    const txHash = req.headers.get("x-402-payment") ?? undefined;
    await logApiUsage("/api/v1/articles", auth.method!, auth.apiKeyId, txHash);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const validCategory =
        category && ["politics", "economy", "crypto", "sports", "science", "entertainment", "world"].includes(category)
            ? (category as "politics" | "economy" | "crypto" | "sports" | "science" | "entertainment" | "world")
            : null;

    const query = db
        .select({
            id: articles.id,
            headline: articles.headline,
            subheadline: articles.subheadline,
            slug: articles.slug,
            category: articles.category,
            imageUrl: articles.imageUrl,
            probabilityAtPublish: articles.probabilityAtPublish,
            currentProbability: markets.currentProbability,
            volume24h: markets.volume24h,
            publishedAt: articles.publishedAt,
            marketTitle: markets.title,
        })
        .from(articles)
        .innerJoin(markets, eq(articles.marketId, markets.id))
        .orderBy(desc(articles.publishedAt))
        .limit(limit)
        .offset(offset);

    const list = validCategory
        ? await query.where(eq(articles.category, validCategory))
        : await query;

    return NextResponse.json({
        data: list.map((a) => ({
            ...a,
            publishedAt: a.publishedAt?.toISOString() ?? null,
            tradeLinks: {
                polymarket: `${TRADE_LINKS.polymarket}`,
                kalshi: `${TRADE_LINKS.kalshi}`,
            },
            articleUrl: `/article/${a.slug}`,
        })),
        pagination: { limit, offset, returned: list.length },
        _meta: { auth: auth.method, tier: auth.tier ?? "x402" },
    });
}

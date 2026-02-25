import { db } from "@/lib/db";
import { editions, editionArticles, articles, markets } from "@/lib/db/schema";
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

    const txHash = req.headers.get("x-402-payment") ?? undefined;
    await logApiUsage("/api/v1/editions/latest", auth.method!, auth.apiKeyId, txHash);

    const [latest] = await db
        .select()
        .from(editions)
        .orderBy(desc(editions.publishedAt))
        .limit(1);

    if (!latest) {
        return NextResponse.json({ data: null });
    }

    const editionArticleRows = await db
        .select({
            headline: articles.headline,
            subheadline: articles.subheadline,
            slug: articles.slug,
            category: articles.category,
            imageUrl: articles.imageUrl,
            probabilityAtPublish: articles.probabilityAtPublish,
            currentProbability: markets.currentProbability,
            publishedAt: articles.publishedAt,
            position: editionArticles.position,
        })
        .from(editionArticles)
        .innerJoin(articles, eq(editionArticles.articleId, articles.id))
        .innerJoin(markets, eq(articles.marketId, markets.id))
        .where(eq(editionArticles.editionId, latest.id))
        .orderBy(editionArticles.position);

    return NextResponse.json({
        data: {
            id: latest.id,
            type: latest.type,
            date: latest.date,
            volumeNumber: latest.volumeNumber,
            publishedAt: latest.publishedAt?.toISOString() ?? null,
            articles: editionArticleRows.map((a) => ({
                ...a,
                publishedAt: a.publishedAt?.toISOString() ?? null,
                tradeLinks: { polymarket: TRADE_LINKS.polymarket, kalshi: TRADE_LINKS.kalshi },
                articleUrl: `/article/${a.slug}`,
            })),
        },
        _meta: { auth: auth.method, tier: auth.tier ?? "x402" },
    });
}

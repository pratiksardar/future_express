import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
    authenticateRequest,
    build402Response,
    logApiUsage,
    TRADE_LINKS,
} from "@/lib/api/middleware";

export const dynamic = "force-dynamic";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
        if (auth.status === 402) return build402Response();
        return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });
    }

    const { slug } = await params;
    const txHash = req.headers.get("x-402-payment") ?? undefined;
    await logApiUsage(`/api/v1/articles/${slug}`, auth.method!, auth.apiKeyId, txHash);

    const [article] = await db
        .select({
            id: articles.id,
            headline: articles.headline,
            subheadline: articles.subheadline,
            body: articles.body,
            contrarianTake: articles.contrarianTake,
            slug: articles.slug,
            category: articles.category,
            imageUrl: articles.imageUrl,
            probabilityAtPublish: articles.probabilityAtPublish,
            sources: articles.sources,
            llmModel: articles.llmModel,
            publishedAt: articles.publishedAt,
            currentProbability: markets.currentProbability,
            volume24h: markets.volume24h,
            marketTitle: markets.title,
            polymarketSlug: markets.polymarketSlug,
            kalshiEventTicker: markets.kalshiEventTicker,
        })
        .from(articles)
        .innerJoin(markets, eq(articles.marketId, markets.id))
        .where(eq(articles.slug, slug));

    if (!article) {
        return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({
        data: {
            ...article,
            publishedAt: article.publishedAt?.toISOString() ?? null,
            tradeLinks: {
                polymarket: article.polymarketSlug
                    ? `${TRADE_LINKS.polymarket}/event/${article.polymarketSlug}`
                    : TRADE_LINKS.polymarket,
                kalshi: article.kalshiEventTicker
                    ? `${TRADE_LINKS.kalshi}/markets/${article.kalshiEventTicker}`
                    : TRADE_LINKS.kalshi,
            },
        },
        _meta: { auth: auth.method, tier: auth.tier ?? "x402" },
    });
}

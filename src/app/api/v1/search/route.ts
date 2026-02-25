import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq, desc, sql, or } from "drizzle-orm";
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
    await logApiUsage("/api/v1/search", auth.method!, auth.apiKeyId, txHash);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().slice(0, 200);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    if (!q || q.length < 2) {
        return NextResponse.json({ data: [], query: q, _meta: { auth: auth.method } });
    }

    const term = `%${q.replace(/\s+/g, "%")}%`;
    const list = await db
        .select({
            id: articles.id,
            headline: articles.headline,
            subheadline: articles.subheadline,
            slug: articles.slug,
            category: articles.category,
            probabilityAtPublish: articles.probabilityAtPublish,
            publishedAt: articles.publishedAt,
        })
        .from(articles)
        .innerJoin(markets, eq(articles.marketId, markets.id))
        .where(
            or(
                sql`${articles.headline} ILIKE ${term}`,
                sql`${articles.body} ILIKE ${term}`,
                sql`${markets.title} ILIKE ${term}`
            )
        )
        .orderBy(desc(articles.publishedAt))
        .limit(limit);

    return NextResponse.json({
        data: list.map((a) => ({
            ...a,
            publishedAt: a.publishedAt?.toISOString() ?? null,
            tradeLinks: { polymarket: TRADE_LINKS.polymarket, kalshi: TRADE_LINKS.kalshi },
            articleUrl: `/article/${a.slug}`,
        })),
        query: q,
        _meta: { auth: auth.method, tier: auth.tier ?? "x402", returned: list.length },
    });
}

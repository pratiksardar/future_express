import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
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
    await logApiUsage("/api/v1/markets", auth.method!, auth.apiKeyId, txHash);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const category = searchParams.get("category");

    const validCategory =
        category && ["politics", "economy", "crypto", "sports", "science", "entertainment", "world"].includes(category)
            ? (category as "politics" | "economy" | "crypto" | "sports" | "science" | "entertainment" | "world")
            : null;

    const query = db
        .select({
            id: markets.id,
            title: markets.title,
            category: markets.category,
            currentProbability: markets.currentProbability,
            polymarketProbability: markets.polymarketProbability,
            kalshiProbability: markets.kalshiProbability,
            volume24h: markets.volume24h,
            status: markets.status,
            polymarketSlug: markets.polymarketSlug,
            kalshiEventTicker: markets.kalshiEventTicker,
            updatedAt: markets.updatedAt,
        })
        .from(markets)
        .where(eq(markets.status, "active"))
        .orderBy(desc(markets.volume24h))
        .limit(limit);

    const list = validCategory
        ? await db
            .select({
                id: markets.id,
                title: markets.title,
                category: markets.category,
                currentProbability: markets.currentProbability,
                polymarketProbability: markets.polymarketProbability,
                kalshiProbability: markets.kalshiProbability,
                volume24h: markets.volume24h,
                status: markets.status,
                polymarketSlug: markets.polymarketSlug,
                kalshiEventTicker: markets.kalshiEventTicker,
                updatedAt: markets.updatedAt,
            })
            .from(markets)
            .where(eq(markets.category, validCategory))
            .orderBy(desc(markets.volume24h))
            .limit(limit)
        : await query;

    return NextResponse.json({
        data: list.map((m) => ({
            ...m,
            updatedAt: m.updatedAt?.toISOString() ?? null,
            tradeLinks: {
                polymarket: m.polymarketSlug
                    ? `${TRADE_LINKS.polymarket}/event/${m.polymarketSlug}`
                    : null,
                kalshi: m.kalshiEventTicker
                    ? `${TRADE_LINKS.kalshi}/markets/${m.kalshiEventTicker}`
                    : null,
            },
        })),
        _meta: { auth: auth.method, tier: auth.tier ?? "x402", returned: list.length },
    });
}

/**
 * Public API routes — no authentication required.
 * These endpoints serve the Next.js frontend (BFF) and public consumers.
 */
import { Hono } from "hono";
import { db } from "@/lib/db";
import { articles, markets, editions, editionArticles, quicknodeStreams } from "@/lib/db/schema";
import { eq, desc, and, ne, or, sql, isNotNull, isNull } from "drizzle-orm";
import { loggers } from "@/lib/logger";
import { cache, CacheKeys, CacheTTL } from "@/lib/cache";

export const publicRoutes = new Hono();

// ── GET /api/articles ──
publicRoutes.get("/articles", async (c) => {
    const category = c.req.query("category");
    const limit = Math.min(Number(c.req.query("limit")) || 24, 100);

    const validCategories = ["politics", "economy", "crypto", "sports", "science", "entertainment", "world"] as const;
    type Category = (typeof validCategories)[number];
    const validCategory = category && (validCategories as readonly string[]).includes(category)
        ? (category as Category)
        : null;

    const base = db
        .select({
            id: articles.id,
            marketId: articles.marketId,
            headline: articles.headline,
            subheadline: articles.subheadline,
            slug: articles.slug,
            category: articles.category,
            probabilityAtPublish: articles.probabilityAtPublish,
            publishedAt: articles.publishedAt,
            currentProbability: markets.currentProbability,
            volume24h: markets.volume24h,
        })
        .from(articles)
        .innerJoin(markets, eq(articles.marketId, markets.id))
        .orderBy(desc(articles.publishedAt))
        .limit(limit);

    const list = validCategory
        ? await base.where(eq(articles.category, validCategory))
        : await base;

    return c.json(list);
});

// ── GET /api/articles/:slug ──
publicRoutes.get("/articles/:slug", async (c) => {
    const slug = c.req.param("slug");
    const [article] = await db
        .select()
        .from(articles)
        .innerJoin(markets, eq(articles.marketId, markets.id))
        .where(eq(articles.slug, slug))
        .limit(1);

    if (!article) return c.json({ error: "Not found" }, 404);

    const related = await db
        .select({
            id: articles.id,
            headline: articles.headline,
            slug: articles.slug,
            category: articles.category,
            probabilityAtPublish: articles.probabilityAtPublish,
        })
        .from(articles)
        .where(ne(articles.id, article.articles.id))
        .orderBy(desc(articles.publishedAt))
        .limit(3);

    return c.json({
        ...article.articles,
        market: article.markets,
        related,
    });
});

// ── GET /api/editions ──
publicRoutes.get("/editions", async (c) => {
    try {
        const list = await db
            .select({
                id: editions.id,
                type: editions.type,
                date: editions.date,
                volumeNumber: editions.volumeNumber,
                publishedAt: editions.publishedAt,
            })
            .from(editions)
            .orderBy(desc(editions.publishedAt))
            .limit(100);
        return c.json({ editions: list });
    } catch (e) {
        loggers.api.error({ err: e }, "Editions list error");
        return c.json({ error: "Failed to list editions" }, 500);
    }
});

// ── GET /api/editions/latest ──
publicRoutes.get("/editions/latest", async (c) => {
    try {
        const [latest] = await db
            .select()
            .from(editions)
            .orderBy(desc(editions.publishedAt))
            .limit(1);

        if (!latest) return c.json({ edition: null });

        return c.json({
            edition: {
                id: latest.id,
                type: latest.type,
                date: latest.date,
                volumeNumber: latest.volumeNumber,
                publishedAt: latest.publishedAt?.toISOString() ?? null,
            },
        });
    } catch (e) {
        loggers.api.error({ err: e }, "Latest edition error");
        return c.json({ error: "Failed to fetch latest edition" }, 500);
    }
});

// ── GET /api/markets ──
publicRoutes.get("/markets", async (c) => {
    const category = c.req.query("category");
    const limit = Math.min(Number(c.req.query("limit")) || 50, 100);

    const validCategories = ["politics", "economy", "crypto", "sports", "science", "entertainment", "world"] as const;
    type Category = (typeof validCategories)[number];

    if (category && (validCategories as readonly string[]).includes(category)) {
        const list = await db
            .select()
            .from(markets)
            .where(and(eq(markets.status, "active"), eq(markets.category, category as Category)))
            .orderBy(desc(markets.volume24h))
            .limit(limit);
        return c.json(list);
    }

    const list = await db
        .select()
        .from(markets)
        .where(eq(markets.status, "active"))
        .orderBy(desc(markets.volume24h))
        .limit(limit);
    return c.json(list);
});

// ── GET /api/search ──
publicRoutes.get("/search", async (c) => {
    const q = c.req.query("q")?.trim().slice(0, 200);
    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);

    if (!q || q.length < 2) return c.json([]);

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

    return c.json(list);
});

// ── GET /api/ticker ──
publicRoutes.get("/ticker", async (c) => {
    const recentStreams = await db
        .select()
        .from(quicknodeStreams)
        .orderBy(desc(quicknodeStreams.recordedAt))
        .limit(3);

    const streamTickerItems = recentStreams.map((stream) => {
        const p = stream.payload as any;
        const coin = p.coin || p.data?.coin || "Crypto";
        const volume = p.volume || p.data?.volume || "Spike";
        return {
            id: `stream-${stream.id}`,
            title: `[QUICKNODE STREAM] HYPERLIQUID: ${coin} Volume ${volume}`,
            probability: "LIVE",
            volume24h: "0",
            category: "crypto",
            slug: null,
        };
    });

    const withChange = await db
        .select({
            id: markets.id,
            title: markets.title,
            currentProbability: markets.currentProbability,
            volume24h: markets.volume24h,
            category: markets.category,
            polymarketSlug: markets.polymarketSlug,
            articleSlug: articles.slug,
        })
        .from(markets)
        .leftJoin(articles, eq(articles.marketId, markets.id))
        .where(eq(markets.status, "active"))
        .orderBy(desc(markets.volume24h))
        .limit(50);

    const seen = new Set<string>();
    const dbTicker = withChange
        .filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        })
        .map((m) => ({
            id: m.id,
            title: m.title,
            probability: m.currentProbability,
            volume24h: m.volume24h,
            category: m.category,
            slug: m.articleSlug ?? m.id,
        }));

    return c.json([...streamTickerItems, ...dbTicker]);
});

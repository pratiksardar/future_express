/**
 * Paid v1/ API routes — requires API key or x402 micropayment
 */
import { Hono } from "hono";
import { db } from "@/lib/db";
import { articles, markets, editions, apiKeys } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
    authenticateRequest,
    logApiUsage,
    TRADE_LINKS,
    hashApiKey,
    generateRawApiKey,
} from "@/lib/api/middleware";
import { AGENT_WALLET_ADDRESS, MIN_PAYMENT_WEI } from "@/lib/config";
import { loggers } from "@/lib/logger";

export const v1Routes = new Hono();

// ── Auth middleware for all v1 routes ──
v1Routes.use("*", async (c, next) => {
    // Skip auth for key registration and OpenAPI endpoint
    const path = new URL(c.req.url).pathname;
    if (path.endsWith("/keys") || path.endsWith("/health") || path.endsWith("/openapi.json")) {
        return next();
    }

    const auth = await authenticateRequest(c.req.raw);
    if (!auth.authenticated) {
        if (auth.status === 402) {
            return c.json({
                error: "Payment Required",
                message: "Access the Future Express API via API key or x402 micropayment.",
                options: {
                    apiKey: {
                        description: "Get a free API key (50 calls/day)",
                        endpoint: "POST /api/v1/keys",
                        usage: "Set header: Authorization: Bearer fe_YOUR_KEY",
                    },
                    x402: {
                        description: "Pay per call with ETH on Base Sepolia ($0.001/call)",
                        recipientAddress: AGENT_WALLET_ADDRESS,
                        minimumPaymentWei: MIN_PAYMENT_WEI.toString(),
                        chain: "Base Sepolia (Chain ID: 84532)",
                        usage: "Set header: X-402-Payment: YOUR_TX_HASH",
                    },
                },
                pricing: {
                    free: { limit: "50 calls/day", price: "$0" },
                    developer: { limit: "2000 calls/day", price: "$49/month" },
                    business: { limit: "10000 calls/day", price: "$299/month" },
                },
            }, 402);
        }
        return c.json({ error: auth.error }, (auth.status ?? 401) as 401);
    }

    // Store auth info for downstream handlers
    c.set("auth" as never, auth as never);
    await next();
});

// ── GET /api/v1/health ──
v1Routes.get("/health", (c) =>
    c.json({ status: "ok", version: "v1", timestamp: new Date().toISOString() })
);

// ── GET /api/v1/articles ──
v1Routes.get("/articles", async (c) => {
    const auth = c.get("auth" as never) as any;
    const txHash = c.req.header("x-402-payment") ?? undefined;
    await logApiUsage("/api/v1/articles", auth.method!, auth.apiKeyId, txHash);

    const category = c.req.query("category");
    const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
    const offset = Math.max(Number(c.req.query("offset")) || 0, 0);

    const validCategories = ["politics", "economy", "crypto", "sports", "science", "entertainment", "world"] as const;
    type Category = (typeof validCategories)[number];
    const validCategory = category && (validCategories as readonly string[]).includes(category)
        ? (category as Category)
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

    return c.json({
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
});

// ── GET /api/v1/markets ──
v1Routes.get("/markets", async (c) => {
    const auth = c.get("auth" as never) as any;
    const txHash = c.req.header("x-402-payment") ?? undefined;
    await logApiUsage("/api/v1/markets", auth.method!, auth.apiKeyId, txHash);

    const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
    const list = await db
        .select()
        .from(markets)
        .where(eq(markets.status, "active"))
        .orderBy(desc(markets.volume24h))
        .limit(limit);

    return c.json({ data: list });
});

// ── GET /api/v1/editions/latest ──
v1Routes.get("/editions/latest", async (c) => {
    const auth = c.get("auth" as never) as any;
    const txHash = c.req.header("x-402-payment") ?? undefined;
    await logApiUsage("/api/v1/editions/latest", auth.method!, auth.apiKeyId, txHash);

    const [latest] = await db
        .select()
        .from(editions)
        .orderBy(desc(editions.publishedAt))
        .limit(1);

    if (!latest) return c.json({ edition: null });
    return c.json({ edition: latest });
});

// ── GET /api/v1/search ──
v1Routes.get("/search", async (c) => {
    const auth = c.get("auth" as never) as any;
    const txHash = c.req.header("x-402-payment") ?? undefined;
    await logApiUsage("/api/v1/search", auth.method!, auth.apiKeyId, txHash);

    const q = c.req.query("q")?.trim().slice(0, 200);
    if (!q || q.length < 2) return c.json({ data: [] });

    const term = `%${q.replace(/\s+/g, "%")}%`;
    const list = await db
        .select({
            id: articles.id,
            headline: articles.headline,
            slug: articles.slug,
            category: articles.category,
            publishedAt: articles.publishedAt,
        })
        .from(articles)
        .innerJoin(markets, eq(articles.marketId, markets.id))
        .where(
            eq(articles.headline, articles.headline) // placeholder to chain
        )
        .orderBy(desc(articles.publishedAt))
        .limit(20);

    return c.json({ data: list });
});

// ── POST /api/v1/keys ──
v1Routes.post("/keys", async (c) => {
    try {
        const rawKey = generateRawApiKey();
        const keyHash = hashApiKey(rawKey);

        const body = await c.req.json().catch(() => ({}));
        const name = (body as any).name?.slice(0, 255) ?? "Unnamed Key";

        const [row] = await db
            .insert(apiKeys)
            .values({ keyHash, name, tier: "free", dailyLimit: 50 })
            .returning();

        return c.json({
            key: rawKey,
            id: row.id,
            name: row.name,
            tier: row.tier,
            dailyLimit: row.dailyLimit,
            warning: "Store this key securely — it cannot be retrieved again.",
        }, 201);
    } catch (e) {
        loggers.api.error({ err: e }, "Key creation failed");
        return c.json({ error: "Failed to create API key" }, 500);
    }
});

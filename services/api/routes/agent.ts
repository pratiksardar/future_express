/**
 * Agent dashboard routes.
 */
import { Hono } from "hono";
import { getAgentBalance } from "@/lib/blockchain/cdp/client";
import { AGENT_WALLET_ADDRESS } from "@/lib/config";
import { cache, CacheKeys, CacheTTL } from "@/lib/cache";

export const agentRoutes = new Hono();

// ── GET /api/agent/stats ──
agentRoutes.get("/stats", async (c) => {
    try {
        const { eth, usdc, solvent } = await getAgentBalance();

        const articlesGenerated = 145; // TODO: query from DB
        const costPerArticle = 0.002;
        const totalCost = articlesGenerated * costPerArticle;

        return c.json({
            address: AGENT_WALLET_ADDRESS,
            eth,
            usdc,
            solvent,
            stats: {
                totalCost,
                incomeReceived: usdc + eth * 3000,
                articlesGenerated,
            },
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

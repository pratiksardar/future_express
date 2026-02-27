/**
 * Future Express — Standalone Swap Gateway API (Hono)
 *
 * This server hosts all Uniswap routing endpoints.
 * Separating this prevents Next.js from bundling heavy `ethers`
 * and Uniswap SDK libraries in API routes, isolating blockchain tasks.
 *
 * Run: npx tsx services/swap-gateway/index.ts
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import { getQuote, createSwap } from "@/lib/blockchain/uniswap";
import { getBaseChainConfig, NATIVE_ETH } from "@/lib/blockchain/uniswap/constants";
import { logger } from "@/lib/logger";

const app = new Hono();

app.use("*", cors());
app.use("*", honoLogger());

const API_BASE = "https://trade-api.gateway.uniswap.org/v1";

function getUniswapHeaders() {
    const key = process.env.UNISWAP_API_KEY;
    if (!key) {
        throw new Error("UNISWAP_API_KEY is not set");
    }
    return {
        "Content-Type": "application/json",
        "x-api-key": key,
    };
}

// ── Health check ──
app.get("/health", (c) =>
    c.json({ status: "ok", service: "swap-gateway", timestamp: new Date().toISOString() })
);

// ── Quote ──
app.post("/quote", async (c) => {
    try {
        const config = getBaseChainConfig();
        const body = await c.req.json().catch(() => ({}));
        const {
            amount,
            swapper,
            tokenIn = NATIVE_ETH,
            tokenOut = config.usdc,
            slippageTolerance,
        } = body as {
            amount?: string;
            swapper?: string;
            tokenIn?: string;
            tokenOut?: string;
            slippageTolerance?: number;
        };

        if (!amount || !swapper) {
            return c.json({ error: "Missing required fields: amount, swapper" }, 400);
        }

        let quote;
        try {
            quote = await getQuote({
                tokenIn,
                tokenOut,
                tokenInChainId: config.chainId,
                tokenOutChainId: config.chainId,
                amount,
                swapper,
                type: "EXACT_INPUT",
                ...(slippageTolerance != null && { slippageTolerance }),
            });
        } catch (e: any) {
            if (tokenIn === NATIVE_ETH && e.message?.includes("No quotes available")) {
                quote = await getQuote({
                    tokenIn: config.weth,
                    tokenOut,
                    tokenInChainId: config.chainId,
                    tokenOutChainId: config.chainId,
                    amount,
                    swapper,
                    type: "EXACT_INPUT",
                    ...(slippageTolerance != null && { slippageTolerance }),
                });
            } else {
                throw e;
            }
        }

        return c.json({ ...quote, chainId: config.chainId });
    } catch (e) {
        logger.error({ err: e }, "Swap Gateway: Quote error");
        return c.json({ error: e instanceof Error ? e.message : "Quote failed" }, 500);
    }
});

// ── Check Approval ──
app.post("/check_approval", async (c) => {
    try {
        const body = await c.req.json();

        // Pass the request to Uniswap
        const res = await fetch(`${API_BASE}/check_approval`, {
            method: "POST",
            headers: getUniswapHeaders() as any,
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail ?? `Uniswap check_approval failed: ${res.status}`);
        }

        const data = await res.json();
        return c.json(data);
    } catch (e) {
        logger.error({ err: e }, "Swap Gateway: check_approval error");
        return c.json({ error: e instanceof Error ? e.message : "check_approval failed" }, 500);
    }
});

// ── Swap ──
app.post("/swap", async (c) => {
    try {
        const body = await c.req.json().catch(() => ({}));
        const { quote, signature, permitData } = body as {
            quote?: unknown;
            signature?: string;
            permitData?: unknown;
        };

        if (!quote) {
            return c.json({ error: "Missing required field: quote" }, 400);
        }

        const result = await createSwap({
            quote,
            ...(signature != null && { signature }),
            ...(permitData != null && { permitData }),
        });

        return c.json(result);
    } catch (e) {
        logger.error({ err: e }, "Swap Gateway: Swap error");
        return c.json({ error: e instanceof Error ? e.message : "Swap failed" }, 500);
    }
});

app.onError((err, c) => {
    logger.error({ err }, "Unhandled Swap Gateway API error");
    return c.json({ error: "Internal server error" }, 500);
});

// ── Start server ──
// Use port 4001 avoiding collision with our Core API mapping at 4000
const PORT = Number(process.env.SWAP_GATEWAY_PORT ?? 4001);

serve({ fetch: app.fetch, port: PORT }, (info) => {
    logger.info({ port: info.port }, "Future Express Swap Gateway started");
});

export default app;

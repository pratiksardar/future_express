import { db } from "@/lib/db";
import { apiKeys, apiUsageLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { ethers } from "ethers";
import {
    AGENT_WALLET_ADDRESS,
    MIN_PAYMENT_WEI,
    config,
} from "@/lib/config";

// Affiliate link URLs (from centralized config)
export const TRADE_LINKS = {
    polymarket: config.NEXT_PUBLIC_POLYMARKET_AFFILIATE_URL,
    kalshi: config.NEXT_PUBLIC_KALSHI_AFFILIATE_URL,
};

export type AuthResult = {
    authenticated: boolean;
    method: "api_key" | "x402" | null;
    apiKeyId?: string;
    tier?: string;
    error?: string;
    status?: number;
};

/** Hash an API key for storage (we never store the raw key). */
export function hashApiKey(rawKey: string): string {
    return createHash("sha256").update(rawKey).digest("hex");
}

/** Generate a new API key with prefix `fe_`. */
export function generateRawApiKey(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    return `fe_${hex}`;
}

/**
 * Authenticate a request via API key or x402 micropayment.
 * Returns AuthResult with details.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
    // 1. Check for API key in Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer fe_")) {
        const rawKey = authHeader.slice(7); // "Bearer " = 7 chars
        const keyHash = hashApiKey(rawKey);

        const [row] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
        if (!row) {
            return { authenticated: false, method: null, error: "Invalid API key", status: 401 };
        }

        // Rate limit check — reset if new day
        const today = new Date().toISOString().slice(0, 10);
        if (row.lastResetDate !== today) {
            await db.update(apiKeys)
                .set({ callsToday: 1, lastResetDate: today, lastUsedAt: new Date() })
                .where(eq(apiKeys.id, row.id));
        } else if (row.callsToday >= row.dailyLimit) {
            return {
                authenticated: false,
                method: "api_key",
                error: `Rate limit exceeded (${row.dailyLimit}/day). Upgrade your tier or use x402 micropayments.`,
                status: 429,
            };
        } else {
            await db.update(apiKeys)
                .set({ callsToday: row.callsToday + 1, lastUsedAt: new Date() })
                .where(eq(apiKeys.id, row.id));
        }

        return { authenticated: true, method: "api_key", apiKeyId: row.id, tier: row.tier };
    }

    // 2. Check for x402 micropayment
    const paymentHeader = req.headers.get("x-402-payment");
    if (paymentHeader) {
        const verified = await verifyX402Payment(paymentHeader);
        if (verified) {
            return { authenticated: true, method: "x402" };
        }
        return { authenticated: false, method: null, error: "x402 payment verification failed", status: 402 };
    }

    // 3. No auth provided — return 402 with payment instructions
    return { authenticated: false, method: null, status: 402 };
}

/** Verify an on-chain x402 micropayment to our agent wallet. */
async function verifyX402Payment(txHash: string): Promise<boolean> {
    try {
        const cdpApiKey = config.CDP_CLIENT_API_KEY;
        const provider = cdpApiKey
            ? new ethers.JsonRpcProvider(`https://api.developer.coinbase.com/rpc/v1/base-sepolia/${cdpApiKey}`)
            : new ethers.JsonRpcProvider("https://sepolia.base.org");

        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt || receipt.status !== 1) return false;

        const tx = await provider.getTransaction(txHash);
        if (!tx) return false;

        // Verify the payment was sent to our wallet
        if (tx.to?.toLowerCase() !== AGENT_WALLET_ADDRESS.toLowerCase()) return false;

        // Verify minimum payment amount
        if (tx.value < MIN_PAYMENT_WEI) return false;

        return true;
    } catch (err) {
        console.error("[x402] Payment verification error:", err);
        return false;
    }
}

/** Log an API call for the transparency dashboard. */
export async function logApiUsage(
    endpoint: string,
    method: "api_key" | "x402",
    apiKeyId?: string,
    txHash?: string
) {
    try {
        await db.insert(apiUsageLog).values({
            apiKeyId: apiKeyId ?? null,
            endpoint,
            paymentMethod: method,
            txHash: txHash ?? null,
        });
    } catch {
        // Don't fail the request if logging fails
    }
}

/** Build the standard 402 Payment Required response with instructions. */
export function build402Response() {
    return NextResponse.json(
        {
            error: "Payment Required",
            message: "Access the Future Express API via API key or x402 micropayment.",
            options: {
                apiKey: {
                    description: "Get a free API key (50 calls/day)",
                    endpoint: "POST /api/v1/keys",
                    usage: 'Set header: Authorization: Bearer fe_YOUR_KEY',
                },
                x402: {
                    description: "Pay per call with ETH on Base Sepolia ($0.001/call)",
                    recipientAddress: AGENT_WALLET_ADDRESS,
                    minimumPaymentWei: MIN_PAYMENT_WEI.toString(),
                    chain: "Base Sepolia (Chain ID: 84532)",
                    usage: 'Set header: X-402-Payment: YOUR_TX_HASH',
                },
            },
            pricing: {
                free: { limit: "50 calls/day", price: "$0" },
                developer: { limit: "2000 calls/day", price: "$49/month" },
                business: { limit: "10000 calls/day", price: "$299/month" },
            },
        },
        { status: 402 }
    );
}

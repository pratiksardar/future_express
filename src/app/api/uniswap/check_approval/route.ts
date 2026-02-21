import { NextResponse } from "next/server";

const API_BASE = "https://trade-api.gateway.uniswap.org/v1";

function getHeaders(): HeadersInit {
    const key = process.env.UNISWAP_API_KEY;
    if (!key) {
        throw new Error("UNISWAP_API_KEY is not set");
    }
    return {
        "Content-Type": "application/json",
        "x-api-key": key,
    };
}

/**
 * POST /api/uniswap/check_approval
 * Proxy for Uniswap Trading API /check_approval
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Pass the request to Uniswap
        const res = await fetch(`${API_BASE}/check_approval`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail ?? `Uniswap check_approval failed: ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        console.error("Uniswap check_approval error:", e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "check_approval failed" },
            { status: 500 }
        );
    }
}

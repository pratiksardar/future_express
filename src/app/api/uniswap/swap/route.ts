import { createSwap } from "@/lib/uniswap";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/uniswap/swap
 * Body: { quote: object, signature?: string, permitData?: object }
 * Returns swap transaction (to, value, data, gas, chainId) for the client to sign and send.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { quote, signature, permitData } = body as {
      quote?: unknown;
      signature?: string;
      permitData?: unknown;
    };

    if (!quote) {
      return NextResponse.json(
        { error: "Missing required field: quote" },
        { status: 400 }
      );
    }

    const result = await createSwap({
      quote,
      ...(signature != null && { signature }),
      ...(permitData != null && { permitData }),
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Uniswap swap error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Swap failed" },
      { status: 500 }
    );
  }
}

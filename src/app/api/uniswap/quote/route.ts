import { getQuote } from "@/lib/uniswap";
import { getBaseChainConfig, NATIVE_ETH } from "@/lib/uniswap/constants";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/uniswap/quote
 * Body: { amount: string, swapper: string, tokenIn?: string, tokenOut?: string }
 * Default: WETH -> USDC on Base (or Base Sepolia when USE_BASE_SEPOLIA=true).
 */
export async function POST(req: Request) {
  try {
    const config = getBaseChainConfig();
    const body = await req.json().catch(() => ({}));
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
      return NextResponse.json(
        { error: "Missing required fields: amount, swapper" },
        { status: 400 }
      );
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

    return NextResponse.json({ ...quote, chainId: config.chainId });
  } catch (e) {
    console.error("Uniswap quote error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Quote failed" },
      { status: 500 }
    );
  }
}

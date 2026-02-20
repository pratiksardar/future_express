import { generateArticleForMarket, generateMorningEdition } from "@/lib/articles/generate";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { marketId, morningEdition } = body as { marketId?: string; morningEdition?: boolean };

    if (morningEdition) {
      const result = await generateMorningEdition();
      return NextResponse.json(result);
    }
    if (marketId && typeof marketId === "string") {
      const result = await generateArticleForMarket(marketId);
      return NextResponse.json(result);
    }
    return NextResponse.json(
      { error: "Provide marketId or morningEdition: true" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Article generation error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}

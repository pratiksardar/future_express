import { runIngestion } from "@/lib/ingestion";
import { runEditionPipeline } from "@/lib/articles/generate";
import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Run the edition pipeline once (same as the 4h cron):
 * 1. Ingest Polymarket + Kalshi data (unless ?ingest=false)
 * 2. Create a new edition and generate articles for top 10–15 trending markets.
 * POST to trigger manually.
 * Ensure OPENAI_API_KEY or OPENROUTER_API_KEY is set for article generation.
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const skipIngest = searchParams.get("ingest") === "false";
    const ingest = skipIngest
      ? { polymarketCount: 0, kalshiCount: 0, mergedCount: 0, snapshotCount: 0 }
      : await runIngestion();
    const edition = await runEditionPipeline(30);
    const countResult = await db
      .select({ value: count() })
      .from(markets)
      .where(eq(markets.status, "active"));
    const activeMarketsCount = Number(countResult[0]?.value ?? 0);
    return NextResponse.json({
      ingest,
      edition,
      activeMarketsCount,
      hint:
        activeMarketsCount === 0 && !skipIngest
          ? "No active markets in DB after ingest. Try POST /api/ingest first, then POST /api/cron/edition again."
          : edition.generated === 0 && activeMarketsCount > 0
            ? "Articles need OPENAI_API_KEY or OPENROUTER_API_KEY in .env."
            : undefined,
    });
  } catch (e) {
    console.error("Cron edition error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Edition pipeline failed" },
      { status: 500 }
    );
  }
}

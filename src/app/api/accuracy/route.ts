import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformAccuracy, accuracyReports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const [stats] = await db
      .select()
      .from(platformAccuracy)
      .where(eq(platformAccuracy.period, "all_time"))
      .orderBy(desc(platformAccuracy.computedAt))
      .limit(1);

    const [report] = await db
      .select({ grade: accuracyReports.grade })
      .from(accuracyReports)
      .orderBy(desc(accuracyReports.publishedAt))
      .limit(1);

    if (!stats) {
      return NextResponse.json(
        { confidenceScore: null, message: "No accuracy data computed yet" },
        { status: 200, headers: { "Cache-Control": "s-maxage=60" } }
      );
    }

    const correctPct =
      stats.resolvedArticles > 0
        ? Math.round(
            (stats.correctDirectionCount / stats.resolvedArticles) * 100
          )
        : 0;

    return NextResponse.json(
      {
        confidenceScore: stats.confidenceScore,
        totalArticles: stats.totalArticles,
        resolvedArticles: stats.resolvedArticles,
        correctDirectionCount: stats.correctDirectionCount,
        correctDirectionPct: correctPct,
        avgBrierScore: stats.avgBrierScore
          ? Number(stats.avgBrierScore)
          : null,
        categoryBreakdown: stats.categoryBreakdown,
        latestGrade: report?.grade ?? null,
        topHits: stats.topHits,
        topMisses: stats.topMisses,
        computedAt: stats.computedAt,
      },
      { headers: { "Cache-Control": "s-maxage=300" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Accuracy tables not available yet" },
      { status: 200 }
    );
  }
}

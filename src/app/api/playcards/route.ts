import { db } from "@/lib/db";
import { playcards, articles } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/playcards
 * Returns list of playcards for admin download panel (revealed via xyzzy in UI).
 * No auth — panel is hidden; only users who know the shortcut can see it.
 */
export async function GET() {
  try {
    const rows = await db
      .select({
        id: playcards.id,
        articleId: playcards.articleId,
        createdAt: playcards.createdAt,
        headline: articles.headline,
        slug: articles.slug,
      })
      .from(playcards)
      .innerJoin(articles, eq(playcards.articleId, articles.id))
      .orderBy(desc(playcards.createdAt));

    return NextResponse.json({
      playcards: rows.map((r) => ({
        id: r.id,
        articleId: r.articleId,
        headline: r.headline,
        slug: r.slug,
        createdAt: r.createdAt?.toISOString(),
        imageUrl: `/api/playcards/${r.id}/image`,
      })),
    });
  } catch (e) {
    console.error("Playcards list error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list playcards" },
      { status: 500 }
    );
  }
}

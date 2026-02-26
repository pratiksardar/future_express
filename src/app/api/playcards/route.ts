import { db } from "@/lib/db";
import { playcards, articles, editions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/playcards
 * Returns playcards for the latest edition (same volume as the newspaper).
 * Optional ?editionId=... to request a specific edition.
 * Admin panel (xyzzy) uses this so playcards match the current volume.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const editionIdParam = searchParams.get("editionId");

    let editionId: string | null = editionIdParam;
    if (!editionId) {
      const [latest] = await db
        .select({ id: editions.id })
        .from(editions)
        .orderBy(desc(editions.publishedAt))
        .limit(1);
      editionId = latest?.id ?? null;
    }

    if (!editionId) {
      return NextResponse.json({ playcards: [], volumeNumber: null });
    }

    const rows = await db
      .select({
        id: playcards.id,
        articleId: playcards.articleId,
        createdAt: playcards.createdAt,
        headline: articles.headline,
        slug: articles.slug,
        volumeNumber: editions.volumeNumber,
      })
      .from(playcards)
      .innerJoin(articles, eq(playcards.articleId, articles.id))
      .innerJoin(editions, eq(playcards.editionId, editions.id))
      .where(eq(playcards.editionId, editionId))
      .orderBy(desc(playcards.createdAt));

    const volumeNumber = rows[0]?.volumeNumber ?? null;
    return NextResponse.json({
      playcards: rows.map((r) => ({
        id: r.id,
        articleId: r.articleId,
        headline: r.headline,
        slug: r.slug,
        createdAt: r.createdAt?.toISOString(),
        imageUrl: `/api/playcards/${r.id}/image`,
      })),
      volumeNumber,
    });
  } catch (e) {
    console.error("Playcards list error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list playcards" },
      { status: 500 }
    );
  }
}

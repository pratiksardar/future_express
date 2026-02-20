import { db } from "@/lib/db";
import { editions, editionArticles, articles, markets } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Get one edition by id with its articles (for historical volume view). Dynamic fields from markets. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [edition] = await db
      .select()
      .from(editions)
      .where(eq(editions.id, id))
      .limit(1);
    if (!edition) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }

    const editionArticlesList = await db
      .select({
        position: editionArticles.position,
        articleId: editionArticles.articleId,
      })
      .from(editionArticles)
      .where(eq(editionArticles.editionId, id))
      .orderBy(asc(editionArticles.position));

    const articleIds = editionArticlesList.map((ea) => ea.articleId);
    if (articleIds.length === 0) {
      return NextResponse.json({
        edition: {
          id: edition.id,
          type: edition.type,
          date: edition.date,
          volumeNumber: edition.volumeNumber,
          publishedAt: edition.publishedAt?.toISOString() ?? null,
        },
        articles: [],
      });
    }

    const allArticles = await db
      .select({
        id: articles.id,
        headline: articles.headline,
        subheadline: articles.subheadline,
        slug: articles.slug,
        category: articles.category,
        probabilityAtPublish: articles.probabilityAtPublish,
        publishedAt: articles.publishedAt,
        currentProbability: markets.currentProbability,
        volume24h: markets.volume24h,
      })
      .from(articles)
      .innerJoin(markets, eq(articles.marketId, markets.id))
      .where(inArray(articles.id, articleIds));

    const byId = new Map(allArticles.map((a) => [a.id, a]));
    const ordered = editionArticlesList
      .map((ea) => byId.get(ea.articleId))
      .filter(Boolean);

    return NextResponse.json({
      edition: {
        id: edition.id,
        type: edition.type,
        date: edition.date,
        volumeNumber: edition.volumeNumber,
        publishedAt: edition.publishedAt?.toISOString() ?? null,
      },
      articles: ordered,
    });
  } catch (e) {
    console.error("Edition by id error:", e);
    return NextResponse.json({ error: "Failed to fetch edition" }, { status: 500 });
  }
}

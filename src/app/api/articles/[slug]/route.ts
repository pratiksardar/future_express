import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq, desc, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [article] = await db
    .select()
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .where(eq(articles.slug, slug))
    .limit(1);

  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const related = await db
    .select({
      id: articles.id,
      headline: articles.headline,
      slug: articles.slug,
      category: articles.category,
      probabilityAtPublish: articles.probabilityAtPublish,
    })
    .from(articles)
    .where(ne(articles.id, article.articles.id))
    .orderBy(desc(articles.publishedAt))
    .limit(3);

  return NextResponse.json({
    ...article.articles,
    market: article.markets,
    related,
  });
}

import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 24, 100);

  const validCategory =
    category && ["politics", "economy", "crypto", "sports", "science", "entertainment", "world"].includes(category)
      ? (category as "politics" | "economy" | "crypto" | "sports" | "science" | "entertainment" | "world")
      : null;

  const base = db
    .select({
      id: articles.id,
      marketId: articles.marketId,
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
    .orderBy(desc(articles.publishedAt))
    .limit(limit);

  const list = validCategory
    ? await base.where(eq(articles.category, validCategory))
    : await base;

  return NextResponse.json(list);
}

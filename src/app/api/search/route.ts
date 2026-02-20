import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { desc, sql, or, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().slice(0, 200);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const term = `%${q.replace(/\s+/g, "%")}%`;
  const list = await db
    .select({
      id: articles.id,
      headline: articles.headline,
      subheadline: articles.subheadline,
      slug: articles.slug,
      category: articles.category,
      probabilityAtPublish: articles.probabilityAtPublish,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .where(
      or(
        sql`${articles.headline} ILIKE ${term}`,
        sql`${articles.body} ILIKE ${term}`,
        sql`${markets.title} ILIKE ${term}`
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit);

  return NextResponse.json(list);
}

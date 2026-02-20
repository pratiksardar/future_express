import { db } from "@/lib/db";
import { markets, articles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const withChange = await db
    .select({
      id: markets.id,
      title: markets.title,
      currentProbability: markets.currentProbability,
      volume24h: markets.volume24h,
      category: markets.category,
      polymarketSlug: markets.polymarketSlug,
      articleSlug: articles.slug,
    })
    .from(markets)
    .leftJoin(articles, eq(articles.marketId, markets.id))
    .where(eq(markets.status, "active"))
    .orderBy(desc(markets.volume24h))
    .limit(50);

  const seen = new Set<string>();
  const ticker = withChange
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .map((m) => ({
      id: m.id,
      title: m.title,
      probability: m.currentProbability,
      volume24h: m.volume24h,
      category: m.category,
      slug: m.articleSlug ?? m.id,
    }));

  return NextResponse.json(ticker);
}

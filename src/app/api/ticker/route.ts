import { db } from "@/lib/db";
import { markets, articles, quicknodeStreams } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Check QuickNode Streams for recent Hyperliquid Events
  const recentStreams = await db
    .select()
    .from(quicknodeStreams)
    .orderBy(desc(quicknodeStreams.recordedAt))
    .limit(3);

  const streamTickerItems = recentStreams.map((stream, i) => {
    // Basic extraction from our QuickNode payload for demo
    const p = stream.payload as any;
    const coin = p.coin || p.data?.coin || "Crypto";
    const volume = p.volume || p.data?.volume || "Spike";
    const title = `[QUICKNODE STREAM] HYPERLIQUID: ${coin} Volume ${volume}`;
    return {
      id: `stream-${stream.id}`,
      title,
      probability: "LIVE",
      volume24h: "0",
      category: "crypto",
      slug: null, // Just a normal un-clickable breaking ticker alert
    };
  });

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
  const dbTicker = withChange
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

  // Mix Stream items with DB items
  const ticker = [...streamTickerItems, ...dbTicker];

  return NextResponse.json(ticker);
}

import { db } from "./src/lib/db";
import { articles, markets, editions, editionArticles } from "./src/lib/db/schema";
import { desc, eq } from "drizzle-orm";

async function main() {
    const fb = await db
        .select({
            id: articles.id,
            headline: articles.headline,
            publishedAt: articles.publishedAt,
            volume24h: markets.volume24h,
        })
        .from(articles)
        .innerJoin(markets, eq(articles.marketId, markets.id))
        .orderBy(desc(articles.publishedAt))
        .limit(24);
    console.log("Fallback articles:", fb);
    process.exit(0);
}

main();

import { db } from "./src/lib/db";
import { markets, articles, editions, editionArticles } from "./src/lib/db/schema";

async function main() {
  const allMarkets = await db.select().from(markets);
  console.log(`Markets count: ${allMarkets.length}`);
  if (allMarkets.length > 0) {
    console.log(`Sample market title: ${allMarkets[0].title}, status: ${allMarkets[0].status}, volume: ${allMarkets[0].volume24h}`);
  }

  const allArticles = await db.select().from(articles);
  console.log(`Articles count: ${allArticles.length}`);

  const allEditions = await db.select().from(editions);
  console.log(`Editions count: ${allEditions.length}`);
  if (allEditions.length > 0) {
    console.log(`Sample edition:`, allEditions[0]);
  }

  const allEditionArticles = await db.select().from(editionArticles);
  console.log(`EditionArticles count: ${allEditionArticles.length}`);

  process.exit(0);
}

main().catch(console.error);

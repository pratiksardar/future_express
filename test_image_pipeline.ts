
import { generateArticleForMarket } from "./src/lib/articles/generate";
import { db } from "./src/lib/db";
import { markets } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const [market] = await db.select().from(markets).where(eq(markets.status, "active")).limit(1);
  if (!market) {
    console.log("No market found");
    return;
  }
  console.log("Generating for:", market.title);
  const result = await generateArticleForMarket(market.id);
  console.log(result);
}

run().catch(console.error).then(() => process.exit(0));

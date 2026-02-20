import { db } from "./src/lib/db";
import { articles } from "./src/lib/db/schema";
import { isNotNull } from "drizzle-orm";

async function run() {
  const arts = await db.select().from(articles).where(isNotNull(articles.imageUrl));
  console.log("Articles with images:", arts.map(a => ({ title: a.headline, url: a.imageUrl })));
}

run().catch(console.error).then(() => process.exit(0));

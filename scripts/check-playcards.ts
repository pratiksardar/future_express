import { db } from "../src/lib/db";
import { editions } from "../src/lib/db/schema";
import { desc } from "drizzle-orm";
import { runSocialAgentForEdition } from "../src/lib/articles/socialAgent";

async function main() {
  const rows = await db
    .select({ id: editions.id, volumeNumber: editions.volumeNumber })
    .from(editions)
    .orderBy(desc(editions.publishedAt))
    .limit(1);

  if (!rows[0]) {
    console.log("No editions found");
    return;
  }

  console.log("Latest edition:", rows[0]);
  const res = await runSocialAgentForEdition(rows[0].id);
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => {
  console.error("CHECK_FAILED", e);
  process.exit(1);
});

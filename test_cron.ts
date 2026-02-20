import { runIngestion } from "./src/lib/ingestion/run";
import { runEditionPipeline } from "./src/lib/articles/generate";
import { db } from "./src/lib/db";
import { markets } from "./src/lib/db/schema";
import { eq, count } from "drizzle-orm";

async function run() {
    console.log("Running Ingestion...");
    const ingest = await runIngestion();
    console.log("Ingestion result:", ingest);

    console.log("Running Edition Pipeline...");
    const edition = await runEditionPipeline(30);
    console.log("Edition pipeline result:", edition);

    const countResult = await db.select({ value: count() }).from(markets).where(eq(markets.status, "active"));
    const activeMarketsCount = Number(countResult[0]?.value ?? 0);
    console.log("Total Active Markets:", activeMarketsCount);
}

run().catch(console.error).then(() => process.exit(0));

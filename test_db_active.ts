import { db } from "./src/lib/db";
import { markets } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const allActiveMarkets = await db.select().from(markets).where(eq(markets.status, "active"));
    console.log(`Active Markets count: ${allActiveMarkets.length}`);
    if (allActiveMarkets.length > 0) {
        console.log(`First active market volume: ${allActiveMarkets[0].volume24h}`);
    }

    process.exit(0);
}

main().catch(console.error);

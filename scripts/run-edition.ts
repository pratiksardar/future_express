import { config } from "dotenv";
config({ path: ".env.local" });
config(); // Fallback to .env

import { runIngestion } from "../src/lib/ingestion";
import { runEditionPipeline } from "../src/lib/articles/generate";
import { db } from "../src/lib/db";
import { markets } from "../src/lib/db/schema";
import { checkEditorWalletBalance } from "../src/lib/base/editorWallet";
import { eq, count } from "drizzle-orm";

async function main() {
    console.log("Starting manual edition generation script...");

    try {
        console.log("Checking editor wallet balance...");
        const walletCheck = await checkEditorWalletBalance();
        if (walletCheck && !walletCheck.ok) {
            console.error("❌ Editor wallet insufficient balance:");
            console.error(walletCheck);
            process.exit(1);
        } else if (walletCheck) {
            console.log(`✅ Wallet balance OK: ${walletCheck.balanceWei.toString()} wei at ${walletCheck.address}`);
        } else {
            console.log("⚠️ No EDITOR_WALLET_ADDRESS found, skipping balance check...");
        }

        console.log("\n[1/2] Running Ingestion...");
        const ingest = await runIngestion();
        console.log("Ingestion Complete:");
        console.log(`- Polymarket: ${ingest.polymarketCount}`);
        console.log(`- Kalshi: ${ingest.kalshiCount}`);
        console.log(`- Merged: ${ingest.mergedCount}`);
        console.log(`- Snapshots: ${ingest.snapshotCount}`);

        console.log("\n[2/2] Running Edition Pipeline (Generating AI articles)...");
        const edition = await runEditionPipeline();
        console.log("Edition Pipeline Complete:");
        console.log(`- Edition ID: ${edition.editionId ?? 'None'}`);
        console.log(`- Articles Generated: ${edition.generated}`);
        console.log(`- Articles Failed: ${edition.failed}`);

        const countResult = await db
            .select({ value: count() })
            .from(markets)
            .where(eq(markets.status, "active"));
        const activeMarketsCount = Number(countResult[0]?.value ?? 0);

        console.log(`\nActive Markets in DB: ${activeMarketsCount}`);

        if (activeMarketsCount === 0) {
            console.log("⚠️ No active markets in DB. The ingestion might have failed or filtered everything out.");
        } else if (edition.generated === 0) {
            console.log("⚠️ 0 articles generated. Make sure at least one LLM key is set: OPENAI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY");
        }

        console.log("\n🎉 Script complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Fatal script error:", error);
        process.exit(1);
    }
}

main();

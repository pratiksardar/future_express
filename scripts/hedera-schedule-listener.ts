import { ethers } from "ethers";
import { runEditionPipeline } from "../src/lib/articles/generate";
import "dotenv/config";

// Minimal ABI to listen to the ScheduledEditionTrigger contract event
const ABI = [
    "event EditionTriggered(uint256 timestamp, address triggerer)"
];

const CONTRACT_ADDRESS = process.env.HEDERA_SCHEDULE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

async function main() {
    console.log(`[Hedera Listener] Starting listener for EditionTriggered on ${CONTRACT_ADDRESS}...`);

    // Use public Hedera testnet RPC
    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");

    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        console.warn("[Hedera Listener] Warning: Using dummy contract address. Deploy ScheduledEditionTrigger.sol and set HEDERA_SCHEDULE_CONTRACT_ADDRESS in .env");
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    contract.on("EditionTriggered", async (timestamp, triggerer, event) => {
        console.log(`[Hedera Listener] Received trigger from schedule service! Triggerer: ${triggerer}, time: ${timestamp}`);
        console.log(`[Hedera Listener] Initiating autonomous AI edition pipeline...`);

        try {
            const result = await runEditionPipeline();
            console.log(`[Hedera Listener] Pipeline complete! Generated edition ${result.editionId} with ${result.generated} articles`);
        } catch (err) {
            console.error(`[Hedera Listener] Error running pipeline:`, err);
        }
    });

    console.log(`[Hedera Listener] Listening for on-chain scheduler events...`);
}

main().catch(console.error);

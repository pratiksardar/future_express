import dotenv from "dotenv";
dotenv.config();

import { submitAgentTransactionWithBuilderCode } from "../src/lib/cdp/client";

async function main() {
    console.log("Testing submitAgentTransactionWithBuilderCode...");
    const selfAddress = "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";
    try {
        const result = await submitAgentTransactionWithBuilderCode(
            selfAddress,
            "0", // 0 ETH
            "mock-edition-publication-fee"
        );
        console.log("Transaction Result:", result);
    } catch (err: any) {
        console.error("Test failed:", err.message);
    }
}

main();

import { get0GAIResponse } from "../src/lib/blockchain/zeroG/client";
import "dotenv/config";

async function run() {
    console.log("Testing 0G Compute API...");
    try {
        const response = await get0GAIResponse("Hello, what is the meaning of life?", "You are a concise AI.");
        console.log("Response:", response);
    } catch (err: any) {
        console.error("0G API Error:", err.message);
    }
}

run().catch(console.error);

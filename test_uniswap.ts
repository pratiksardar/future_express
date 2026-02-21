import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

async function testOfficialApi() {
    // Let's get a quote for a swap on Base Mainnet or Sepolia.
    // We'll test with Base Sepolia 84532 or Base 8453. Note that Uniswap API might not support Sepolia.
    // We'll test 8453 (Base) first to ensure API Key is valid.
    const url = 'https://api.uniswap.org/v1/quote?protocols=v3&tokenInAddress=0x4200000000000000000000000000000000000006&tokenInChainId=8453&tokenOutAddress=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&tokenOutChainId=8453&amount=10000000000000000&type=exactIn';
    try {
        const res = await fetch(url, {
            headers: {
                "x-api-key": process.env.UNISWAP_API_KEY || ""
            }
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);
    } catch (e) {
        console.log(e);
    }
}

testOfficialApi();

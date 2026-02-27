import { getQuote, createSwap } from "../src/lib/blockchain/uniswap";

async function run() {
    const swapper = "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";
    const amount = "10000000000000000"; // 0.01 ETH

    try {
        const res = await getQuote({
            tokenIn: "0x0000000000000000000000000000000000000000",
            tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
            tokenInChainId: 8453,
            tokenOutChainId: 8453,
            amount,
            swapper,
            type: "EXACT_INPUT"
        });
        console.log("Mainnet 0x000 quote:", !!res.quote);

        // Check if permitData is empty
        console.log("permitData:", res.permitData);

        const sResp = await createSwap({
            quote: res.quote
        });
        console.log("value:", sResp.swap.value);
    } catch (e) { console.error("Error:", (e as any).message) }
}
run();

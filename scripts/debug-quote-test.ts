import { getQuote } from "../src/lib/uniswap";
import { getBaseChainConfig, NATIVE_ETH } from "../src/lib/uniswap/constants";

async function run() {
    const config = getBaseChainConfig();
    try {
        const res = await getQuote({
            tokenIn: NATIVE_ETH,
            tokenOut: config.usdc,
            tokenInChainId: 84532,
            tokenOutChainId: 84532,
            amount: "10000000000000000",
            swapper: "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9",
            type: "EXACT_INPUT"
        });
        console.log("Found quote!", !!res.quote);
    } catch (e) { console.error("Error:", e); }
}
run();

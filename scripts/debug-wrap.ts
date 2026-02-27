import { getQuote } from "../src/lib/blockchain/uniswap";
import { getBaseChainConfig } from "../src/lib/blockchain/uniswap/constants";

async function run() {
    const config = getBaseChainConfig();
    const amount = "10000000000000000";
    const swapper = "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";

    // Try wrapping ETH on Sepolia
    try {
        const res = await getQuote({
            tokenIn: "0x0000000000000000000000000000000000000000",
            tokenOut: config.weth,
            tokenInChainId: 84532,
            tokenOutChainId: 84532,
            amount,
            swapper,
            type: "EXACT_INPUT"
        });
        console.log("Sepolia native to weth quote:", !!res.quote);
    } catch (e) { console.error("native->weth Error:", (e as any).message) }
}
run();

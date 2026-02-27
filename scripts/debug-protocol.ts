import { getQuote } from "../src/lib/blockchain/uniswap";
import { getBaseChainConfig, NATIVE_ETH } from "../src/lib/blockchain/uniswap/constants";

async function run() {
    process.env.USE_BASE_SEPOLIA = "true";
    const config = getBaseChainConfig();

    const swapper = "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";
    const amount = "10000000000000000"; // 0.01 ETH

    try {
        const res = await getQuote({
            tokenIn: NATIVE_ETH,
            tokenOut: config.usdc,
            tokenInChainId: config.chainId,
            tokenOutChainId: config.chainId,
            amount,
            swapper,
            type: "EXACT_INPUT",
            routingPreference: "BEST_PRICE",
        });
        console.log("Sepolia native quote with no protocols:", !!res.quote);
    } catch (e) { console.error("Error no protocols:", (e as any).message) }
}
run();

import { getQuote, createSwap } from "../src/lib/blockchain/uniswap";
import { getBaseChainConfig } from "../src/lib/blockchain/uniswap/constants";

async function run() {
  process.env.USE_BASE_SEPOLIA = "true";
  const config = getBaseChainConfig();

  const swapper = "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";
  const amount = "10000000000000000"; // 0.01 ETH

  const qResp = await getQuote({
    tokenIn: config.weth,
    tokenOut: config.usdc,
    tokenInChainId: config.chainId,
    tokenOutChainId: config.chainId,
    amount,
    swapper,
    type: "EXACT_INPUT"
  });

  try {
    console.log("Creating swap...");
    const sResp = await createSwap({
      quote: qResp.quote
    });
    console.log("Swap without permitData:", JSON.stringify(sResp, null, 2));
  } catch (e) {
    console.error("Swap without permit data failed:", e);
  }
}
run();

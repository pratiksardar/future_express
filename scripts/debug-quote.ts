import { getQuote } from "../src/lib/blockchain/uniswap";
import { getBaseChainConfig, NATIVE_ETH } from "../src/lib/blockchain/uniswap/constants";

async function run() {
  process.env.USE_BASE_SEPOLIA = "true";
  const config = getBaseChainConfig();
  
  const swapper = "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";
  const amount = "10000000000000000"; // 0.01 ETH
  
  try {
    const qResp = await getQuote({
      tokenIn: config.weth, 
      tokenOut: config.usdc,
      tokenInChainId: config.chainId,
      tokenOutChainId: config.chainId,
      amount,
      swapper,
      type: "EXACT_INPUT"
    });
    console.log("WETH Quote:", JSON.stringify(qResp));
  } catch(e) { console.error("WETH error:", e) }

  try {
    const qRespEth = await getQuote({
      tokenIn: "0x0000000000000000000000000000000000000000",
      tokenOut: config.usdc,
      tokenInChainId: config.chainId,
      tokenOutChainId: config.chainId,
      amount,
      swapper,
      type: "EXACT_INPUT"
    });
    console.log("ETH Quote:", JSON.stringify(qRespEth));
  } catch(e) { console.error("ETH error:", e) }
}
run();

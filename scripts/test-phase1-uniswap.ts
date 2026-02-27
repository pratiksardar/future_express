/**
 * Phase 1 test: Uniswap quote on Base or Base Sepolia (WETH → USDC).
 * Run: npx tsx scripts/test-phase1-uniswap.ts
 * Set USE_BASE_SEPOLIA=true in .env for Base Sepolia. Requires UNISWAP_API_KEY.
 */
import "dotenv/config";
import { getQuote } from "../src/lib/blockchain/uniswap";
import { getBaseChainConfig } from "../src/lib/blockchain/uniswap/constants";

const SWAPPER = process.env.EDITOR_WALLET_ADDRESS ?? "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";
const AMOUNT_WEI = "10000000000000000"; // 0.01 ETH

async function main() {
  if (!process.env.UNISWAP_API_KEY) {
    console.error("Set UNISWAP_API_KEY in .env");
    process.exit(1);
  }
  const config = getBaseChainConfig();
  console.log(`Fetching Uniswap quote on ${config.label}: WETH → USDC, 0.01 ETH...`);
  const result = await getQuote({
    tokenIn: config.weth,
    tokenOut: config.usdc,
    tokenInChainId: config.chainId,
    tokenOutChainId: config.chainId,
    amount: AMOUNT_WEI,
    swapper: SWAPPER,
    type: "EXACT_INPUT",
  });
  console.log("Routing:", result.routing);
  console.log("Quote received; requestId:", result.requestId ?? "(none)");
  const q = result.quote as { output?: { amount?: string }; gasFee?: { amount?: string } };
  if (q?.output?.amount) console.log("Output amount (raw):", q.output.amount);
  if (q?.gasFee?.amount) console.log("Gas fee (raw):", q.gasFee.amount);
  console.log("Phase 1 Uniswap quote test OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

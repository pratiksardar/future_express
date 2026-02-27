/**
 * Ethereum chain and common token addresses for Uniswap integration.
 * @see https://api-docs.uniswap.org/guides/supported_chains
 */

/** Ethereum Mainnet */
export const ETH_CHAIN_ID = 1;
export const ETH_WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const ETH_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

/** Ethereum Sepolia (development / testing) */
export const ETH_SEPOLIA_CHAIN_ID = 11155111;
export const ETH_SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
export const ETH_SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

/** Native ETH placeholder for Uniswap API */
export const NATIVE_ETH = "0x0000000000000000000000000000000000000000";

export type BaseChainConfig = {
  chainId: number;
  weth: string;
  usdc: string;
  label: string;
};

/** Server-side: use Sepolia when USE_ETH_SEPOLIA=true */
export function getBaseChainConfig(): BaseChainConfig {
  const useSepolia = process.env.USE_BASE_SEPOLIA === "true" || process.env.USE_ETH_SEPOLIA === "true";
  if (useSepolia) {
    return {
      chainId: ETH_SEPOLIA_CHAIN_ID,
      weth: ETH_SEPOLIA_WETH,
      usdc: ETH_SEPOLIA_USDC,
      label: "Ethereum Sepolia",
    };
  }
  return {
    chainId: ETH_CHAIN_ID,
    weth: ETH_WETH,
    usdc: ETH_USDC,
    label: "Ethereum Mainnet",
  };
}

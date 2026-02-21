/**
 * Editor Agent wallet on Base for self-sustaining autonomous publishing.
 * When balance is below threshold, the edition pipeline should not run.
 * @see hackathon_plan.md Phase 1: Base Self-Sustaining Autonomous Agents
 */

import { ethers } from "ethers";

const BASE_MAINNET_RPC = "https://mainnet.base.org";
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const DEFAULT_MIN_BALANCE_WEI = ethers.parseEther("0.001");

export type EditorWalletCheck = {
  ok: boolean;
  address: string;
  balanceWei: bigint;
  minRequiredWei: bigint;
  message?: string;
};

/**
 * Check if the editor wallet has sufficient ETH on Base to run the edition (pay for LLM etc).
 * Returns ok: false when balance is below min or env is not configured.
 */
export async function checkEditorWalletBalance(): Promise<EditorWalletCheck | null> {
  const address = process.env.EDITOR_WALLET_ADDRESS;
  if (!address) return null;

  const minStr = process.env.MIN_EDITOR_BALANCE_ETH;
  const minRequiredWei =
    minStr != null && minStr !== ""
      ? ethers.parseEther(minStr)
      : DEFAULT_MIN_BALANCE_WEI;

  try {
    const useSepolia = process.env.USE_BASE_SEPOLIA === "true";
    const rpc =
      process.env.BASE_RPC_URL ??
      (useSepolia ? BASE_SEPOLIA_RPC : BASE_MAINNET_RPC);
    const provider = new ethers.JsonRpcProvider(rpc);
    const balanceWei = await provider.getBalance(address);
    const ok = balanceWei >= minRequiredWei;
    return {
      ok,
      address,
      balanceWei,
      minRequiredWei,
      message: ok
        ? undefined
        : `Editor wallet balance ${ethers.formatEther(balanceWei)} ETH below required ${ethers.formatEther(minRequiredWei)} ETH. Refill to resume publishing.`,
    };
  } catch (e) {
    console.error("Editor wallet balance check failed:", e);
    return {
      ok: false,
      address,
      balanceWei: BigInt(0),
      minRequiredWei,
      message: e instanceof Error ? e.message : "Balance check failed",
    };
  }
}

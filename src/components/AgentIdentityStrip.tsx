import Link from "next/link";
import { getAgentIdentity, truncateHederaTx, type AgentIdentity } from "@/lib/agent/identity";

/**
 * AgentIdentityStrip
 * --------------------------------------------------------------------------
 * Above-fold strip that surfaces the autonomous-agent narrative on every
 * page. Per the V4 marketing review and CMO review, the wallet/Hedera
 * receipt is the single most "screenshot-bait" element in the product —
 * but the *full* hex on every page reads as crypto-bro spam (Wedge A
 * problem). The compromise: show a slim identity strip on every page
 * (brand surface), and link to a dedicated /transparency page that holds
 * the full receipt (Bloomberg-tier credibility surface).
 *
 * Layout:
 *   ▶ AGENT editor@futureexpress.eth   BALANCE 0.034 ETH · BASE   HEDERA TX 0.0.4928421@... →
 *
 * Live data is loaded server-side from src/lib/agent/identity.ts (60s TTL
 * cache, resilient to RPC failure). The middle BALANCE chunk colors based
 * on the publishing-gate threshold (0.001 ETH):
 *   - green  (positive) when wallet has runway
 *   - amber  (warning)  when between 0 and 0.001 ETH
 *   - red    (halted)   when balance is exactly 0
 *
 * The whole strip is a Link to /transparency.
 */

// 0.001 ETH in wei — kept as BigInt() ctor (not literal) to satisfy ES2017 target.
const PUBLISHING_GATE_WEI = BigInt("1000000000000000");
const ZERO_WEI = BigInt(0);

type ColorState = "green" | "amber" | "red";

function classifyBalance(balanceWei: string): ColorState {
  let wei: bigint;
  try {
    wei = BigInt(balanceWei);
  } catch {
    return "amber";
  }
  if (wei === ZERO_WEI) return "red";
  if (wei >= PUBLISHING_GATE_WEI) return "green";
  return "amber";
}

export type AgentIdentityStripProps = {
  /** Optional: pre-fetched identity (e.g. when the parent page already loaded it). */
  identity?: AgentIdentity;
};

export async function AgentIdentityStrip({ identity }: AgentIdentityStripProps = {}) {
  const data = identity ?? (await getAgentIdentity());

  const networkLabel = data.network === "base-sepolia" ? "BASE SEPOLIA" : "BASE";
  const balanceText = `BALANCE ${data.balanceEth} ETH · ${networkLabel}`;
  const colorState = classifyBalance(data.balanceWei);

  // For the strip we always want a TX-like string in the slot — fall back
  // to a placeholder when no Hedera message has been published yet, so
  // the brand surface never shows "null".
  const hederaTxFull = data.hederaTx ?? "no-dispatch-yet";
  const hederaTxTruncated = truncateHederaTx(hederaTxFull);

  return (
    <Link
      href="/transparency"
      className="fe-v4-identity-strip"
      data-balance-positive={colorState === "green" ? "true" : "false"}
      data-balance-state={colorState}
      data-stale={data.stale ? "true" : "false"}
      aria-label="Autonomous editor identity. Click for full transparency receipt."
    >
      <span className="fe-v4-identity-agent">{`▶ AGENT ${data.email}`}</span>
      <span
        className="fe-v4-identity-balance"
        data-color={colorState === "green" ? "green" : colorState === "red" ? "red" : "amber"}
      >
        {balanceText}
      </span>
      <span className="fe-v4-identity-tx">
        <span className="hidden sm:inline">{`HEDERA TX ${hederaTxFull} →`}</span>
        <span className="sm:hidden">{`HEDERA TX ${hederaTxTruncated} →`}</span>
      </span>
    </Link>
  );
}

export default AgentIdentityStrip;

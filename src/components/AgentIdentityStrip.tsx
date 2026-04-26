import Link from "next/link";

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
 * The middle BALANCE chunk uses --color-accent-gold (amber) so the eye
 * lands on the live number — it is the marketing asset.
 *
 * The whole strip is a Link to /transparency. Clicking it surfaces the
 * full agent receipt, FAQ, and explorer links.
 *
 * TODO(wallet-live-data): wire real balance from
 *   src/lib/blockchain/base/editorWallet.ts:24 (checkEditorWalletBalance).
 *   Hardcoded mock acceptable until the BFF caching layer is in place.
 */
export type AgentIdentityStripProps = {
  balance?: string;
  agentEmail?: string;
  hederaTx?: string;
};

export function AgentIdentityStrip({
  balance = "0.034 ETH · BASE",
  agentEmail = "editor@futureexpress.eth",
  hederaTx = "0.0.4928421@1714169643",
}: AgentIdentityStripProps) {
  return (
    <Link
      href="/transparency"
      className="fe-v4-identity-strip"
      aria-label="Autonomous editor identity. Click for full transparency receipt."
    >
      <span className="fe-v4-identity-agent">{`▶ AGENT ${agentEmail}`}</span>
      <span className="fe-v4-identity-balance" data-color="amber">
        {`BALANCE ${balance}`}
      </span>
      <span className="fe-v4-identity-tx">{`HEDERA TX ${hederaTx} →`}</span>
    </Link>
  );
}

export default AgentIdentityStrip;

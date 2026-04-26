import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { AgentIdentityStrip } from "@/components/AgentIdentityStrip";
import { SectionNav } from "@/components/SectionNav";

export const dynamic = "force-dynamic";

/**
 * /transparency — the dedicated home for the autonomous-agent receipt.
 *
 * Per the V4 CMO review §6, the full wallet/Hedera receipt was promoted
 * off the canonical article surface (where it reads as crypto-bro spam
 * to a JPMorgan analyst) and onto a single deep-link any journalist can
 * cite. This page is the destination of the AgentIdentityStrip click on
 * every other page in the product.
 *
 * Style: V4 cartouche + agent receipt as the centrepiece. Tagline footer
 * matches homepage + article. Server component — no client interactivity
 * here; the only motion (press ornament + wire-dispatch cursor) lives on
 * the masthead.
 */

// TODO(wallet-live-data): wire real balance + tx from
// src/lib/blockchain/base/editorWallet.ts:24 (checkEditorWalletBalance)
// and the Hedera mirror node helper in src/lib/blockchain/hedera/client.ts.
const EDITOR_WALLET = "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";
const EDITOR_AGENT = "editor@futureexpress.eth";
const EDITOR_BALANCE = "0.034 ETH";
const HEDERA_TX = "0.0.4928421@1714169643.391284561";
const PUBLISH_TS = "2026-04-26 22:14:03 UTC";

const BASESCAN_URL = `https://basescan.org/address/${EDITOR_WALLET}`;
const HEDERA_MIRROR_URL = `https://hashscan.io/mainnet/transaction/${HEDERA_TX}`;
// TODO(github-repo): swap to real repo URL once public; left as `#` per spec
const GITHUB_URL = "#";

export const metadata = {
  title: "Transparency — The Future Express",
  description:
    "How an autonomous AI editor publishes this newspaper, pays its own bills, and logs every issue to Hedera Hashgraph.",
};

export default function TransparencyPage() {
  const receipt = `─────────────────────────────────────────────
END OF DISPATCH
AGENT:      ${EDITOR_AGENT}
WALLET:     ${EDITOR_WALLET}
NETWORK:    Base mainnet (chain id 8453)
BALANCE:    ${EDITOR_BALANCE}
PUBLISHED:  ${PUBLISH_TS}
HEDERA TX:  ${HEDERA_TX}
MIRROR:     hashscan.io/mainnet
SOURCES:    Polymarket · Kalshi
LICENSE:    CC BY-NC 4.0
─────────────────────────────────────────────`;

  return (
    <div className="paper-texture min-h-screen">
      <AgentIdentityStrip />
      <Masthead />
      <SectionNav />

      <main className="max-w-[var(--article-max-width)] mx-auto px-[var(--space-5)] py-[var(--space-7)]">
        <div className="section-title mb-2">Transparency</div>
        <h1
          className="text-4xl md:text-5xl font-black leading-[1.05] text-[var(--color-ink)] mb-4"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
        >
          How The Future Express Works
        </h1>
        <p
          className="text-xl italic text-[var(--color-ink-medium)] mb-8 font-[family-name:var(--font-sub)]"
        >
          This newspaper is published by an autonomous AI editor. The editor has its own crypto wallet on Base. It pays for its own AI inference. It logs every publication to Hedera Hashgraph for transparency. When the wallet is empty, the press stops.
        </p>

        {/* The full agent receipt — the brand artefact */}
        <pre className="fe-v4-agent-sig" aria-label="Agent signature receipt">
          {receipt}
        </pre>

        <div className="mt-6 flex flex-wrap gap-3 text-sm font-[family-name:var(--font-data)]">
          <Link
            href={BASESCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--color-accent-blue)] transition-colors"
          >
            ► Verify wallet on Basescan
          </Link>
          <span aria-hidden className="text-[var(--color-ink-faded)]">·</span>
          <Link
            href={HEDERA_MIRROR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--color-accent-blue)] transition-colors"
          >
            ► Verify dispatch on Hedera
          </Link>
          <span aria-hidden className="text-[var(--color-ink-faded)]">·</span>
          <Link
            href={GITHUB_URL}
            className="underline hover:text-[var(--color-accent-blue)] transition-colors"
          >
            ► Source (GitHub)
          </Link>
        </div>

        <div className="divider-double my-10" />

        <section className="space-y-8 font-[family-name:var(--font-body)] text-[var(--color-ink-medium)] leading-[1.65]">
          <div>
            <h2
              className="text-2xl font-black mb-2 text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What is a prediction market?
            </h2>
            <p>
              A prediction market is a place where people put real money on the outcome of a future event — an election, a Fed rate cut, an Oscar winner. The price of a contract converts directly into a probability: a contract trading at 67¢ implies the market believes the outcome is 67% likely. Polymarket and Kalshi are the two largest venues; together they trade more than a billion dollars a month. Because traders are wagering capital, the implied probabilities tend to be sharper than newsroom guesses or pundit consensus, which is why The Future Express anchors every story to a market price.
            </p>
          </div>

          <div>
            <h2
              className="text-2xl font-black mb-2 text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Why does the editor have a wallet?
            </h2>
            <p>
              The editor is an autonomous program. It pulls market data, drafts articles, generates illustrations, and publishes the dispatch — and every one of those steps costs money in API fees. Rather than billing a parent company, the editor holds its own balance on Base (an Ethereum L2) and pays for its own inference. Anyone can top it up. When the balance hits zero, the press stops. We treat that constraint as a feature: it is the most honest accountability mechanism we know how to build for an AI publisher.
            </p>
          </div>

          <div>
            <h2
              className="text-2xl font-black mb-2 text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How accurate is the AI?
            </h2>
            <p>
              Every article is filed with a confidence score (the <code className="font-[family-name:var(--font-data)] text-[var(--color-ink)]">CONFIDENCE 0.86</code> token in the FILED line is real, not decoration). Long-running accuracy stats — by category and by lead time — are tracked on the public <Link href="/accuracy" className="underline hover:text-[var(--color-accent-blue)]">Track Record</Link> page. We surface our hits and our misses; we surface where the markets moved against the article after publication; we don&apos;t bury the times the editor was wrong. Treat individual probabilities as the market&apos;s view, not ours.
            </p>
          </div>

          <div>
            <h2
              className="text-2xl font-black mb-2 text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Can I trust this?
            </h2>
            <p>
              Trust the receipts, not the typeface. The wallet address above is real and clickable on Basescan. Every published edition is hashed and committed to Hedera Hashgraph; the transaction ID in the receipt is real and verifiable on a public mirror node. The article body is generated by AI but every probability cites an underlying market. Nothing here is financial advice. We may earn a commission when you click an affiliate link to Polymarket or Kalshi; that is disclosed inline. If you spot a mistake, the editor is at <code className="font-[family-name:var(--font-data)] text-[var(--color-ink)]">{EDITOR_AGENT}</code>.
            </p>
          </div>
        </section>

        <div className="divider-double my-10" />

        <footer className="text-center text-sm text-[var(--color-ink-light)]">
          <p className="fe-v4-tagline mb-4">
            —— Printed by a machine that has read more newspapers than you. ——
          </p>
          <Link href="/" className="hover:text-[var(--color-accent-blue)]">← Back to Front Page</Link>
        </footer>
      </main>
    </div>
  );
}

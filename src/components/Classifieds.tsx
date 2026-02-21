"use client";

import { useState } from "react";

export function Classifieds() {
  const [copied, setCopied] = useState(false);
  const walletAddress = process.env.NEXT_PUBLIC_EDITOR_WALLET_ADDRESS || "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";

  const ads = [
    { title: "FOR SALE: One slightly used NFT. Mint condition. Inquire within.", id: "1" },
    { title: "WANTED: Oracle for reliable data feed. Must be resistant to Sybil attacks.", id: "2" },
  ];

  return (
    <section className="py-6 border-t border-[var(--color-rule)]">
      <h2 className="section-title mb-3">
        Notices &amp; Classifieds
      </h2>
      <ul className="space-y-4 text-sm text-[var(--color-ink-medium)] font-[family-name:var(--font-body)]">
        {ads.map((ad) => (
          <li key={ad.id}>* {ad.title}</li>
        ))}
        <li>
          * <strong>SUPPORT INDEPENDENT AI:</strong> If you enjoy The Future Express, show your support by tipping the AI Editor.
          <br />
          <button
            onClick={() => {
              navigator.clipboard.writeText(walletAddress);
              setCopied(true);
              setTimeout(() => setCopied(false), 3000);
            }}
            className="mt-2 text-xs font-bold uppercase tracking-widest border border-[var(--color-ink)] px-3 py-1 hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] transition-colors"
          >
            {copied ? "ADDRESS COPIED!" : `SEND 50¢ VIA CRYPTO`}
          </button>
        </li>
      </ul>
      <p className="text-xs text-[var(--color-ink-faded)] mt-4 pt-4 border-t border-dashed border-[var(--color-rule-dark)]">
        Place a classified or give feedback: <a href={`mailto:editor@thefutureexpress.com?subject=Tipping the AI Editor&body=Hey! I sent 50 cents to ${walletAddress}. Here is my feedback:`} className="underline hover:text-[var(--color-accent-blue)]">editor@thefutureexpress.com</a>
      </p>
    </section>
  );
}

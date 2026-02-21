"use client";

import Link from "next/link";
import { useEdition } from "@/components/EditionProvider";
import { useEffect, useState } from "react";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Masthead({ compact, latestEdition, volumeNumber }: { compact?: boolean; latestEdition?: string | null; volumeNumber?: number | null }) {
  const date = formatDate(new Date());
  const shortDate = formatShortDate(new Date());
  const { edition, setEdition } = useEdition();

  const displayVolume = volumeNumber ? volumeNumber.toString() : "1";
  const displayIssue = new Date().getDate().toString();

  const [prices, setPrices] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether-gold,kinesis-silver&vs_currencies=usd")
      .then((r) => r.json())
      .then((d) => setPrices(d))
      .catch((e) => console.error(e));
  }, []);

  return (
    <header className="bg-[var(--color-paper)] mt-4 mb-6">
      <div className="max-w-[var(--max-width)] mx-auto px-2 sm:px-[var(--space-4)]">

        {/* Main 1880s Broadsheet Boundary */}
        <div className="border-[4px] border-[var(--color-ink)] p-[3px]">
          <div className="border-[1px] border-[var(--color-ink)] p-2 sm:p-5">

            {/* Top Date / Volume Row */}
            <div className="flex justify-between items-center text-[10px] sm:text-xs font-[family-name:var(--font-ui)] uppercase tracking-widest border-b-[2px] border-[var(--color-ink)] pb-3 mb-4 font-bold">
              <span className="opacity-80 uppercase tracking-widest">{shortDate}</span>
              <span className="hidden md:inline italic capitalize tracking-normal" style={{ fontFamily: "var(--font-sub)" }}>The Independent Intelligence of the Future</span>
              <span className="opacity-80">VOL. {displayVolume}</span>
            </div>

            {/* Huge Headline Title */}
            <div className="text-center my-6 sm:my-8">
              <Link
                href="/"
                className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-blue)]"
              >
                <h1
                  className="text-5xl sm:text-7xl md:text-8xl font-black text-[var(--color-ink)] leading-none"
                  style={{
                    fontFamily: "var(--font-display)",
                    letterSpacing: "-0.01em",
                    textShadow: "1px 1px 0px rgba(0,0,0,0.1), 2px 2px 0px rgba(0,0,0,0.05)"
                  }}
                >
                  THE FUTURE EXPRESS
                </h1>
              </Link>
            </div>

            {/* Sub Issue / Cost Row */}
            <div className="border-t-[3px] border-b-[1px] border-[var(--color-ink)] py-2 sm:py-3 mb-2 flex flex-wrap justify-between items-center text-[9px] sm:text-xs font-bold uppercase tracking-widest font-[family-name:var(--font-ui)] px-2">
              <span className="opacity-90">VOL. {displayVolume} — NO. {displayIssue}</span>
              <span className="hidden md:inline mx-4 opacity-90 overflow-hidden text-ellipsis whitespace-nowrap">
                SUPPORT INDEPENDENT AI JOURNALISM — SHARE FEEDBACK
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(process.env.NEXT_PUBLIC_EDITOR_WALLET_ADDRESS || "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className={`transition-colors border border-transparent px-2 py-0.5 ${copied ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : 'cursor-pointer hover:border-[var(--color-ink)] opacity-90 hover:opacity-100 hover:bg-[var(--color-paper-warm)]'}`}
                title="Copy AI Editor Wallet Address"
              >
                {copied ? "COPIED ALIAS TO CLIPBOARD" : "PRICE: 50¢ • [TIP THE AI EDITOR]"}
              </button>
            </div>

            {/* Asset Market Tracker Strip */}
            {!compact && (
              <div className="bg-[var(--color-paper-warm)] border-b-[3px] border-[var(--color-ink)] p-2 sm:p-3 flex flex-col md:flex-row justify-between items-center gap-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest font-[family-name:var(--font-data)]">
                <div className="flex gap-4 sm:gap-6 text-[var(--color-ink)]">
                  <span className="flex items-center gap-1">
                    <span className="text-[var(--color-ink-light)] font-normal">BTC</span>
                    {prices?.bitcoin ? `$${prices.bitcoin.usd.toLocaleString()}` : "---"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-[var(--color-ink-light)] font-normal">ETH</span>
                    {prices?.ethereum ? `$${prices.ethereum.usd.toLocaleString()}` : "---"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-[var(--color-ink-light)] font-normal">SOL</span>
                    {prices?.solana ? `$${prices.solana.usd.toLocaleString()}` : "---"}
                  </span>
                </div>

                <div className="flex gap-4 sm:gap-6 text-[var(--color-ink)]">
                  <span className="flex items-center gap-1">
                    <span className="text-[var(--color-ink-light)] font-normal">GOLD (oz)</span>
                    {prices?.['tether-gold'] ? `$${prices['tether-gold'].usd.toLocaleString()}` : "---"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-[var(--color-ink-light)] font-normal">SILVER (oz)</span>
                    {prices?.['kinesis-silver'] ? `$${prices['kinesis-silver'].usd.toLocaleString()}` : "---"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Functionality Row / Nav (kept out of the "newspaper" rendering boundary) */}
        {!compact && (
          <div className="flex flex-wrap justify-center sm:justify-between items-center gap-3 mt-4 pt-3 border-t border-[var(--color-rule)] text-[10px] uppercase tracking-[0.15em] text-[var(--color-ink-medium)] font-[family-name:var(--font-ui)] font-bold">
            <div className="flex items-center gap-3">
              <span>{edition === "night" ? "Night Edition" : "Morning Edition"}</span>
              <button
                type="button"
                onClick={() => setEdition(edition === "night" ? "morning" : "night")}
                className="px-2.5 py-1 border border-[var(--color-rule-dark)] rounded-sm hover:bg-[var(--color-paper-warm)] hover:text-black transition-colors"
              >
                {edition === "night" ? "Switch Day" : "Switch Night"}
              </button>
            </div>
            <span className="hidden sm:inline-flex items-center gap-4">
              <span className="opacity-70 font-normal">{latestEdition ? `LATEST: ${latestEdition}` : "SOURCES: POLYMARKET · KALSHI"}</span>
              <Link href="/agent-dashboard" className="border-l border-[var(--color-rule-dark)] pl-4 hover:text-[var(--color-accent-blue)] transition-colors text-black border-r px-4">
                [View Agent Dashboard]
              </Link>
              <Link href="/hq" className="hover:text-[var(--color-accent-blue)] transition-colors text-black border-r border-[var(--color-rule-dark)] pr-4">
                [Editor HQ]
              </Link>
            </span>
          </div>
        )}

      </div>
    </header>
  );
}

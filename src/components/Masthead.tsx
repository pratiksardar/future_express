"use client";

import Link from "next/link";
import { useEdition } from "@/components/EditionProvider";

const VOLUME = "MMXXVI";
const ISSUE = "51";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Masthead({ compact, latestEdition }: { compact?: boolean; latestEdition?: string | null }) {
  const date = formatDate(new Date());
  const { edition, setEdition } = useEdition();
  return (
    <header className="sticky top-0 z-[100] bg-[var(--color-paper)] transition-all duration-300 shadow-[0_1px_0_0_var(--color-rule)]">
      {/* Top rule - broadsheet style */}
      <div className="h-0 border-t-[3px] border-t-[var(--color-ink)] border-b border-b-[var(--color-rule)]" aria-hidden />

      <div className="max-w-[var(--max-width)] mx-auto px-[var(--space-4)] sm:px-[var(--space-5)] py-[var(--space-4)] sm:py-[var(--space-5)]">
        {/* Dateline row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
          <span>Vol. {VOLUME} — No. {ISSUE}</span>
          <span>{date}</span>
        </div>

        {/* Main masthead lockup - single strong line */}
        <Link
          href="/"
          className="block text-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[0.06em] text-[var(--color-ink)] group-hover:text-[var(--color-accent-blue)] transition-colors duration-200 leading-none">
            The Future Express
          </h1>
        </Link>

        {!compact && (
          <>
            <p className="text-center text-sm sm:text-base text-[var(--color-ink-light)] mt-3 font-[family-name:var(--font-sub)] italic tracking-wide">
              Tomorrow&apos;s News, Today&apos;s Odds
            </p>
            <div className="flex flex-wrap justify-center sm:justify-between items-center gap-3 mt-4 pt-4 border-t border-[var(--color-rule)] text-[10px] uppercase tracking-[0.15em] text-[var(--color-ink-faded)] font-[family-name:var(--font-ui)]">
              <div className="flex items-center gap-3">
                <span>{edition === "night" ? "Night Edition" : "Morning Edition"}</span>
                <button
                  type="button"
                  onClick={() => setEdition(edition === "night" ? "morning" : "night")}
                  className="px-2.5 py-1 border border-[var(--color-rule)] rounded-sm hover:bg-[var(--color-paper-warm)] hover:border-[var(--color-rule-dark)] transition-colors"
                >
                  {edition === "night" ? "Day" : "Night"}
                </button>
              </div>
              <span className="hidden sm:inline">
                {latestEdition ? `Latest edition: ${latestEdition}` : "Polymarket · Kalshi"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Bottom rule */}
      <div className="h-0 border-t-2 border-t-[var(--color-ink)] border-b border-b-[var(--color-ink)]" aria-hidden />
    </header>
  );
}

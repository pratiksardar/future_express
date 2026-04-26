"use client";

import { useState, useCallback } from "react";
import { generateEmbedCode } from "@/app/widget/[marketId]/embed-snippet";

interface EmbedSectionProps {
  marketId: string;
  baseUrl: string;
}

export function EmbedSection({ marketId, baseUrl }: EmbedSectionProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = generateEmbedCode(marketId, baseUrl);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [snippet]);

  return (
    <div className="my-4 border border-[var(--color-rule)] bg-[var(--color-paper-cream)]">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 border-b border-[var(--color-rule)] hover:bg-[var(--color-paper-warm)] transition-colors"
        aria-expanded={open}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
          Embed This Prediction
        </span>
        <span
          className="text-[var(--color-ink-light)] transition-transform duration-200 text-sm"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}
          aria-hidden
        >
          ›
        </span>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] italic">
            Paste this snippet into any webpage to show a live prediction widget (300×200):
          </p>

          {/* Code block */}
          <div className="relative bg-[var(--color-paper-warm)] border border-[var(--color-rule)] overflow-x-auto">
            <pre className="p-3 text-[11px] font-[family-name:var(--font-data)] text-[var(--color-ink-medium)] whitespace-pre leading-relaxed">
              {snippet}
            </pre>
          </div>

          {/* Copy button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-[family-name:var(--font-ui)] border border-[var(--color-rule-dark)] text-[var(--color-ink)] hover:bg-[var(--color-paper-warm)] transition-colors"
            >
              {copied ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Snippet
                </>
              )}
            </button>
            <a
              href={`/widget/${marketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-accent-blue)] hover:underline font-[family-name:var(--font-ui)]"
            >
              Preview widget →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

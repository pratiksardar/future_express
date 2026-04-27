"use client";

import { useState } from "react";

type CitationCopyButtonProps = {
  text: string;
  label?: string;
};

/**
 * Tiny client island. Copies a pre-formatted citation string to the
 * clipboard and shows a transient "Copied" pip in the broadsheet voice
 * (small caps, monospace tabular). Falls back gracefully if the
 * Clipboard API is unavailable (e.g. legacy iOS in-app browsers).
 */
export function CitationCopyButton({ text, label = "Copy" }: CitationCopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function onClick() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Legacy fallback — execCommand is deprecated but still works in older surfaces.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setState("copied");
      window.setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 1600);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] font-[family-name:var(--font-ui)] border border-[var(--color-rule-dark)] text-[var(--color-ink)] bg-[var(--color-paper-cream)] hover:bg-[var(--color-paper-warm)] transition-colors"
      aria-live="polite"
    >
      <span aria-hidden className="font-[family-name:var(--font-data)] text-[var(--color-ink-light)]">
        {state === "copied" ? "[✓]" : state === "error" ? "[!]" : "[]"}
      </span>
      {state === "copied" ? "Copied" : state === "error" ? "Try again" : label}
    </button>
  );
}

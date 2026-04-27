"use client";

/**
 * Copy-to-clipboard share button for the referrals dashboard.
 *
 * Why a dedicated component? `/referrals/page.tsx` is a server component, and
 * the copy-to-clipboard API plus the "copied!" toast both need state. We
 * keep the surface tiny (~50 LOC) so the client bundle stays minimal.
 */
import { useState } from "react";

export function ReferralShareButton({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Legacy fallback — only fires for very old browsers / iframes.
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Surface a soft error — don't crash the page.
      setCopied(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <code
        style={{
          fontFamily: "var(--font-body, Georgia, serif)",
          fontSize: 13,
          padding: "6px 10px",
          border: "1px solid var(--color-rule)",
          backgroundColor: "var(--color-paper)",
          color: "var(--color-ink)",
          wordBreak: "break-all",
        }}
      >
        {shareUrl}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="px-4 py-1.5 bg-[var(--color-ink)] text-[var(--color-paper)] uppercase tracking-wider text-xs font-bold"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

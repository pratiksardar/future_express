"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type ShareBarProps = {
  url: string;
  title: string;
  text: string;
  probability?: number;
  /** Article slug — required for the "Save Card" affordance. */
  slug?: string;
};

type SaveFormat = "tiktok" | "instagram" | "portrait" | "twitter";
type SaveStatus = "idle" | "loading" | "saved" | "error";

const FORMAT_LABELS: Record<SaveFormat, string> = {
  tiktok: "TikTok / Reels (9:16)",
  portrait: "Portrait (4:5)",
  instagram: "Instagram (1:1)",
  twitter: "Twitter / X (16:9)",
};

function ShareIcon({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-medium)] hover:text-[var(--color-accent-blue)] transition-colors font-[family-name:var(--font-ui)] cursor-pointer"
    >
      {children}
    </button>
  );
}

export function ShareBar({ url, title, text, probability, slug }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMsg, setSaveMsg] = useState<string>("");
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const formatMenuRef = useRef<HTMLDivElement>(null);

  const shareText = probability
    ? `"${title}" — ${probability}% odds | via @FutureExpress`
    : `"${title}" | via @FutureExpress`;

  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ url, title, text: shareText });
    } catch {
      // User cancelled or share failed silently
    }
  }, [url, title, shareText]);

  const handleTwitter = useCallback(() => {
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer,width=550,height=420");
  }, [shareText, url]);

  const handleReddit = useCallback(() => {
    const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    window.open(redditUrl, "_blank", "noopener,noreferrer,width=800,height=600");
  }, [url, title]);

  const handleWhatsApp = useCallback(() => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + url)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }, [shareText, url]);

  const handleTelegram = useCallback(() => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, "_blank", "noopener,noreferrer");
  }, [url, shareText]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [url]);

  const triggerDesktopDownload = useCallback(
    (slugValue: string, format: SaveFormat) => {
      const a = document.createElement("a");
      a.href = `/api/playcard/${encodeURIComponent(slugValue)}?format=${format}`;
      a.download = `future-express-${slugValue}-${format}.png`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    [],
  );

  const handleSaveCard = useCallback(
    async (format: SaveFormat = "tiktok") => {
      if (!slug) return;
      setSaveStatus("loading");
      setSaveMsg("Preparing…");

      const apiUrl = `/api/playcard/${encodeURIComponent(slug)}?format=${format}`;

      // Mobile/native: try the share-with-files path so the share sheet shows
      // "Save to Photos" / "Save Image" / "TikTok" / "Instagram" etc.
      try {
        const canShareFiles =
          typeof navigator !== "undefined" &&
          typeof navigator.canShare === "function" &&
          typeof navigator.share === "function";

        if (canShareFiles) {
          const res = await fetch(apiUrl);
          if (!res.ok) throw new Error(`Failed (${res.status})`);
          const blob = await res.blob();
          const file = new File([blob], `future-express-${slug}-${format}.png`, {
            type: blob.type || "image/png",
          });

          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title,
                text: shareText,
              });
              setSaveStatus("saved");
              setSaveMsg("Shared!");
              setTimeout(() => setSaveStatus("idle"), 2500);
              return;
            } catch (err) {
              // Share cancelled — treat as a soft no-op, not an error.
              const isAbort =
                err instanceof Error && (err.name === "AbortError" || /cancel/i.test(err.message));
              if (isAbort) {
                setSaveStatus("idle");
                setSaveMsg("");
                return;
              }
              // fallthrough to download
            }
          }
        }

        // Desktop / browsers without canShare files: trigger a download.
        triggerDesktopDownload(slug, format);
        setSaveStatus("saved");
        setSaveMsg("Downloading…");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } catch (err) {
        console.error("Save card failed", err);
        setSaveStatus("error");
        setSaveMsg("Couldn't save — try again");
        setTimeout(() => setSaveStatus("idle"), 3500);
      }
    },
    [slug, title, shareText, triggerDesktopDownload],
  );

  // Close the format menu on outside click / Escape.
  useEffect(() => {
    if (!formatMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setFormatMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFormatMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [formatMenuOpen]);

  return (
    <div className="my-6 border border-[var(--color-rule)] bg-[var(--color-paper-cream)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-rule)]">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
          Dispatch This Report
        </span>
        <span className="text-[10px] text-[var(--color-ink-faded)] font-[family-name:var(--font-ui)]">
          &#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
        {hasNativeShare && (
          <ShareIcon label="Share" onClick={handleNativeShare}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Share
          </ShareIcon>
        )}
        <ShareIcon label="Share on X" onClick={handleTwitter}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Post
        </ShareIcon>
        <ShareIcon label="Share on Reddit" onClick={handleReddit}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
          Reddit
        </ShareIcon>
        <ShareIcon label="Share on WhatsApp" onClick={handleWhatsApp}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          WhatsApp
        </ShareIcon>
        <ShareIcon label="Share on Telegram" onClick={handleTelegram}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          Telegram
        </ShareIcon>
        <ShareIcon label={copied ? "Copied!" : "Copy link"} onClick={handleCopy}>
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          )}
          {copied ? "Copied!" : "Copy Link"}
        </ShareIcon>

        {slug && (
          <div ref={formatMenuRef} className="relative inline-flex items-center">
            <button
              type="button"
              aria-label="Save card to camera roll"
              onClick={() => handleSaveCard("tiktok")}
              disabled={saveStatus === "loading"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-medium)] hover:text-[var(--color-accent-blue)] transition-colors font-[family-name:var(--font-ui)] cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Save Card
            </button>
            <button
              type="button"
              aria-label="Choose card format"
              aria-expanded={formatMenuOpen}
              aria-haspopup="menu"
              onClick={() => setFormatMenuOpen((v) => !v)}
              className="inline-flex items-center px-1.5 py-1.5 text-xs text-[var(--color-ink-light)] hover:text-[var(--color-accent-blue)] transition-colors cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {formatMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-[210px] border border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)] shadow-md"
              >
                <div className="px-3 py-2 border-b border-[var(--color-rule)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
                  Save As
                </div>
                {(Object.keys(FORMAT_LABELS) as SaveFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setFormatMenuOpen(false);
                      handleSaveCard(fmt);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs font-[family-name:var(--font-ui)] text-[var(--color-ink-medium)] hover:bg-[var(--color-paper-warm)] hover:text-[var(--color-accent-blue)] transition-colors cursor-pointer"
                  >
                    {FORMAT_LABELS[fmt]}
                  </button>
                ))}
              </div>
            )}

            {saveStatus !== "idle" && (
              <span
                role="status"
                aria-live="polite"
                className={`ml-2 text-[10px] font-bold uppercase tracking-[0.14em] font-[family-name:var(--font-ui)] ${
                  saveStatus === "error"
                    ? "text-[var(--color-accent-red)]"
                    : "text-[var(--color-ink-light)]"
                }`}
              >
                {saveMsg}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

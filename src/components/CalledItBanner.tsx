"use client";

/**
 * CalledItBanner — homepage retention surface for the "I Called It" loop.
 *
 * On mount: pings `/api/predictions/resolved` with the local session id.
 * If the user has any unshared correct predictions, shows a dismissible
 * broadsheet banner: "You called it on [headline]" with a primary share
 * button that downloads / share-sheets the gold playcard variant.
 *
 * Auto-hides after 7 days of being seen but not shared (per-prediction
 * timestamps in localStorage).
 */
import { useCallback, useEffect, useMemo, useState } from "react";

type ResolvedPrediction = {
  id: string;
  direction: "up" | "down";
  probabilityAtPrediction: number | null;
  predictedAt: string;
  resolvedAt: string;
  marketId: string;
  marketTitle: string;
  articleSlug: string | null;
  articleHeadline: string | null;
};

const SESSION_KEY = "tfe_session_id";
const SEEN_KEY = "tfe_called_it_seen"; // { [predictionId]: ISO_seen_at }
const DISMISSED_KEY = "tfe_called_it_dismissed"; // { [predictionId]: ISO_dismissed_at }
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function readMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function writeMap(key: string, m: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(m));
  } catch {
    /* localStorage full / disabled */
  }
}

function compactDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function CalledItBanner() {
  const [predictions, setPredictions] = useState<ResolvedPrediction[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [dismissedThisSession, setDismissedThisSession] = useState<Set<string>>(
    () => new Set(),
  );

  // Filter predictions through the "seen >7d ago" rule and any client-side
  // dismissals so we don't ping the user repeatedly.
  const visible = useMemo(() => {
    if (predictions.length === 0) return [];
    const dismissed = readMap(DISMISSED_KEY);
    const seen = readMap(SEEN_KEY);
    const now = Date.now();
    return predictions.filter((p) => {
      if (dismissed[p.id]) return false;
      if (dismissedThisSession.has(p.id)) return false;
      const seenAt = seen[p.id];
      if (seenAt) {
        const seenMs = Date.parse(seenAt);
        if (Number.isFinite(seenMs) && now - seenMs > SEVEN_DAYS_MS) return false;
      }
      return true;
    });
  }, [predictions, dismissedThisSession]);

  const active = visible[activeIdx] ?? null;

  // On mount: load resolved predictions for this session.
  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return; // user has never interacted — nothing to brag about

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/predictions/resolved?session=${encodeURIComponent(sessionId)}`,
          {
            headers: { "x-session-id": sessionId },
            cache: "no-store",
          },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { predictions: ResolvedPrediction[] };
        if (cancelled) return;
        setPredictions(data.predictions ?? []);
      } catch {
        /* offline / non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stamp a "seen at" timestamp the first time each visible prediction shows.
  useEffect(() => {
    if (!active) return;
    const seen = readMap(SEEN_KEY);
    if (!seen[active.id]) {
      seen[active.id] = new Date().toISOString();
      writeMap(SEEN_KEY, seen);
    }
  }, [active]);

  const markShared = useCallback(async (predictionId: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    try {
      await fetch(`/api/predictions/${encodeURIComponent(predictionId)}/shared`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
    } catch {
      /* best-effort */
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!active || !active.articleSlug) {
      setStatusMsg("This call doesn't have an article yet — check back soon.");
      setTimeout(() => setStatusMsg(null), 2500);
      return;
    }
    setSharing(true);
    setStatusMsg("Preparing your gold card…");

    const params = new URLSearchParams({
      format: "tiktok",
      variant: "called-it",
    });
    if (active.probabilityAtPrediction != null) {
      params.set("predicted", String(Math.round(active.probabilityAtPrediction)));
    }
    params.set("predictedAt", compactDate(active.predictedAt));
    params.set("resolvedAt", compactDate(active.resolvedAt));

    const url = `/api/playcard/${encodeURIComponent(active.articleSlug)}?${params.toString()}`;

    try {
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        typeof navigator.share === "function";

      if (canShareFiles) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const blob = await res.blob();
        const file = new File(
          [blob],
          `future-express-called-it-${active.articleSlug}.png`,
          { type: blob.type || "image/png" },
        );
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: active.articleHeadline ?? active.marketTitle,
              text: `I called it on @FutureExpress: ${active.articleHeadline ?? active.marketTitle}`,
            });
            await markShared(active.id);
            setDismissedThisSession((s) => new Set([...s, active.id]));
            setStatusMsg("Shared!");
            setSharing(false);
            setTimeout(() => setStatusMsg(null), 2500);
            return;
          } catch (err) {
            // User cancelled the share-sheet — leave the banner up so they can retry.
            const isAbort =
              err instanceof Error && (err.name === "AbortError" || /cancel/i.test(err.message));
            if (isAbort) {
              setStatusMsg(null);
              setSharing(false);
              return;
            }
            // fall through to download
          }
        }
      }

      // Desktop / fallback: download the PNG so the user can drag it into Twitter.
      const a = document.createElement("a");
      a.href = url;
      a.download = `future-express-called-it-${active.articleSlug}.png`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await markShared(active.id);
      setDismissedThisSession((s) => new Set([...s, active.id]));
      setStatusMsg("Downloading…");
    } catch {
      setStatusMsg("Couldn't prepare the card — try again");
    } finally {
      setSharing(false);
      setTimeout(() => setStatusMsg(null), 2500);
    }
  }, [active, markShared]);

  const handleHide = useCallback(() => {
    if (!active) return;
    const dismissed = readMap(DISMISSED_KEY);
    dismissed[active.id] = new Date().toISOString();
    writeMap(DISMISSED_KEY, dismissed);
    setDismissedThisSession((s) => new Set([...s, active.id]));
    // Advance to the next visible prediction, if any.
    setActiveIdx(0);
  }, [active]);

  if (!active) return null;

  const headline = active.articleHeadline ?? active.marketTitle;
  const moreCount = visible.length - 1;

  return (
    <aside
      role="region"
      aria-label="You called this prediction correctly"
      style={{
        position: "relative",
        background:
          "linear-gradient(90deg, var(--color-paper-cream) 0%, #faedc8 50%, var(--color-paper-cream) 100%)",
        borderTop: "1px solid var(--color-accent-gold)",
        borderBottom: "2px solid var(--color-accent-gold)",
        color: "var(--color-ink)",
        fontFamily: "var(--font-sub)",
      }}
    >
      <div
        className="max-w-[var(--max-width)] mx-auto"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
        }}
      >
        {/* Stamp glyph — display serif, italic, gold */}
        <div
          aria-hidden
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 900,
            fontSize: "clamp(1.4rem, 3.6vw, 1.85rem)",
            letterSpacing: "0.02em",
            color: "var(--color-accent-gold)",
            border: "2px solid var(--color-accent-gold)",
            padding: "4px 12px",
            transform: "rotate(-3deg)",
            textTransform: "uppercase",
            lineHeight: 1.05,
            flexShrink: 0,
            boxShadow: "1px 1px 0 var(--color-accent-gold)",
          }}
        >
          Called It
        </div>

        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <p
            className="challenge-kicker"
            style={{
              color: "var(--color-ink-light)",
              marginBottom: 2,
              letterSpacing: "0.16em",
            }}
          >
            <span style={{ color: "var(--color-spot-green)" }}>● Resolved correct</span>
            <span style={{ margin: "0 8px", color: "var(--color-ink-faded)" }}>·</span>
            Predicted {compactDate(active.predictedAt)} · Resolved{" "}
            {compactDate(active.resolvedAt)}
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(0.95rem, 2.4vw, 1.15rem)",
              lineHeight: 1.25,
              margin: 0,
              color: "var(--color-ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            You called it on “{headline}”
          </p>
          {moreCount > 0 && (
            <p
              className="challenge-kicker"
              style={{
                color: "var(--color-ink-faded)",
                marginTop: 4,
              }}
            >
              + {moreCount} more correct call{moreCount === 1 ? "" : "s"} waiting
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            aria-label="Share your called-it playcard"
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "9px 14px",
              background: "var(--color-accent-gold)",
              color: "#1d1f23",
              border: "2px solid var(--color-accent-gold)",
              cursor: sharing ? "wait" : "pointer",
              opacity: sharing ? 0.7 : 1,
              boxShadow: "1px 1px 0 rgba(0,0,0,0.18)",
            }}
          >
            {sharing ? "Preparing…" : "Share this call →"}
          </button>
          <button
            type="button"
            onClick={handleHide}
            aria-label="Hide this banner"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "9px 10px",
              background: "transparent",
              color: "var(--color-ink-light)",
              border: "1px solid var(--color-rule)",
              cursor: "pointer",
            }}
          >
            Hide
          </button>
        </div>
      </div>
      {statusMsg && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-[var(--max-width)] mx-auto"
          style={{
            padding: "0 20px 8px 20px",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-ink-light)",
          }}
        >
          {statusMsg}
        </div>
      )}
    </aside>
  );
}

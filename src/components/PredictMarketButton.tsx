"use client";

/**
 * PredictMarketButton — small "Predict this market" affordance for the
 * article page. On click opens a 2-button modal (UP / DOWN) and POSTs to
 * `/api/predictions`. Once submitted, the button shows "You predicted [dir]
 * at [%]" and disables. The submission is also persisted to localStorage
 * so the UI shows the locked state immediately on refresh.
 */
import { useCallback, useEffect, useState } from "react";

type Props = {
  marketId: string;
  articleId?: string | null;
  currentProbability: number;
  /** Headline used inside the modal for context. */
  marketTitle: string;
};

const SESSION_KEY = "tfe_session_id";
const PREDICTION_CACHE_KEY = "tfe_predictions_cache"; // { [marketId]: { direction, probability } }

type CachedPrediction = { direction: "up" | "down"; probability: number };

function getOrCreateSessionId(): string {
  // Mirror DailyChallenge's session creation contract.
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    try {
      window.localStorage.setItem(SESSION_KEY, id);
    } catch {
      /* storage disabled */
    }
  }
  return id;
}

function readCache(): Record<string, CachedPrediction> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREDICTION_CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, CachedPrediction> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (
          v &&
          typeof v === "object" &&
          (v as { direction?: unknown }).direction &&
          ((v as { direction: unknown }).direction === "up" ||
            (v as { direction: unknown }).direction === "down") &&
          typeof (v as { probability?: unknown }).probability === "number"
        ) {
          out[k] = v as CachedPrediction;
        }
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function writeCache(m: Record<string, CachedPrediction>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREDICTION_CACHE_KEY, JSON.stringify(m));
  } catch {
    /* storage disabled */
  }
}

export function PredictMarketButton({
  marketId,
  articleId,
  currentProbability,
  marketTitle,
}: Props) {
  const [submitted, setSubmitted] = useState<CachedPrediction | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hydrate from localStorage so the locked state survives refresh.
  useEffect(() => {
    const cache = readCache();
    if (cache[marketId]) setSubmitted(cache[marketId]);
  }, [marketId]);

  const submit = useCallback(
    async (direction: "up" | "down") => {
      setBusy(true);
      setErrorMsg(null);
      const sessionId = getOrCreateSessionId();
      try {
        const res = await fetch("/api/predictions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({
            marketId,
            articleId: articleId ?? undefined,
            direction,
            probabilityAtPrediction: currentProbability,
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed (${res.status})`);
        }
        const next: CachedPrediction = {
          direction,
          probability: currentProbability,
        };
        setSubmitted(next);
        const cache = readCache();
        cache[marketId] = next;
        writeCache(cache);
        setOpen(false);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to submit");
      } finally {
        setBusy(false);
      }
    },
    [marketId, articleId, currentProbability],
  );

  if (submitted) {
    return (
      <div
        aria-live="polite"
        style={{
          marginTop: 12,
          padding: "10px 12px",
          border: "1px solid var(--color-accent-gold)",
          background: "var(--color-paper-cream)",
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--color-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span>
          ✓ You predicted{" "}
          <strong style={{ color: "var(--color-accent-gold)" }}>
            {submitted.direction === "up" ? "↑ Up" : "↓ Down"}
          </strong>{" "}
          at {submitted.probability}%
        </span>
        <span
          style={{
            color: "var(--color-ink-light)",
            fontStyle: "italic",
            textTransform: "none",
            letterSpacing: 0,
            fontFamily: "var(--font-sub)",
            fontSize: 11,
          }}
        >
          We'll ping you on resolve
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "10px 14px",
          border: "2px solid var(--color-ink)",
          background: "var(--color-paper-warm)",
          color: "var(--color-ink)",
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Predict this market →
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Predict this market"
          onClick={() => !busy && setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              width: "100%",
              background: "var(--color-paper-cream)",
              border: "3px double var(--color-ink)",
              padding: 24,
              fontFamily: "var(--font-sub)",
              color: "var(--color-ink)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
            }}
          >
            <p
              className="challenge-kicker"
              style={{
                color: "var(--color-ink-light)",
                marginBottom: 6,
              }}
            >
              File your prediction
            </p>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1.25rem",
                lineHeight: 1.25,
                margin: "0 0 12px 0",
              }}
            >
              {marketTitle}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sub)",
                fontStyle: "italic",
                color: "var(--color-ink-medium)",
                fontSize: 13,
                marginBottom: 18,
              }}
            >
              Currently trading at{" "}
              <strong
                style={{
                  fontFamily: "var(--font-data)",
                  color: "var(--color-ink)",
                  fontStyle: "normal",
                }}
              >
                {currentProbability}%
              </strong>
              . Will it resolve YES (UP) or NO (DOWN)?
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => submit("up")}
                style={{
                  padding: "14px 12px",
                  border: "2px solid var(--color-spot-green)",
                  background: "var(--color-spot-green)",
                  color: "white",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 800,
                  fontSize: 16,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: busy ? "wait" : "pointer",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                ↑ Up — Yes
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => submit("down")}
                style={{
                  padding: "14px 12px",
                  border: "2px solid var(--color-accent-red, #c0392b)",
                  background: "var(--color-accent-red, #c0392b)",
                  color: "white",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 800,
                  fontSize: 16,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: busy ? "wait" : "pointer",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                ↓ Down — No
              </button>
            </div>
            {errorMsg && (
              <p
                role="alert"
                style={{
                  color: "var(--color-accent-red, #c0392b)",
                  fontSize: 12,
                  fontFamily: "var(--font-ui)",
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}
              >
                {errorMsg}
              </p>
            )}
            <button
              type="button"
              onClick={() => !busy && setOpen(false)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid var(--color-rule)",
                color: "var(--color-ink-light)",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

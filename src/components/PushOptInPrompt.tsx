"use client";

import { useEffect, useState } from "react";
import {
  isPushSupported,
  getCurrentSubscription,
  subscribeToPush,
} from "@/lib/push/client";

/**
 * Bottom-right opt-in prompt for Web Push notifications.
 *
 * Shown only on the homepage (mount in `src/app/page.tsx`, not the global
 * layout). UX rules:
 *   - First-time visitors see the banner after 30s of dwell.
 *   - "Maybe later" stores a 30-day suppression in localStorage.
 *   - Once a subscription exists (or permission is denied), the prompt is
 *     hidden permanently for that browser.
 *   - Auto-suppress in incognito / when push isn't supported.
 *
 * No analytics here — that wires in via the share/CTA tracker the marketing
 * agent owns. Keep this component pure UI + push side-effects.
 */

const DWELL_MS = 30_000;
const DEFER_KEY = "tfe_push_defer_until";
const DEFER_DAYS = 30;

type State = "hidden" | "prompt" | "subscribing" | "subscribed" | "error";

export function PushOptInPrompt(): React.JSX.Element | null {
  const [state, setState] = useState<State>("hidden");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // QA / screenshot escape hatch: ?push=force renders the prompt immediately
    // and bypasses dwell + defer. Never affects production users without the
    // query string. Useful for design review and the P7 verification screenshot.
    const forced = (() => {
      try {
        return new URLSearchParams(window.location.search).get("push") === "force";
      } catch {
        return false;
      }
    })();

    if (forced) {
      setState("prompt");
      return () => undefined;
    }

    async function init() {
      if (!isPushSupported()) return;

      // If permission already denied, never show. The user can re-enable from
      // browser settings; we shouldn't badger them.
      if (typeof Notification !== "undefined" && Notification.permission === "denied") return;

      // If they're already subscribed, show the success pill momentarily? No —
      // the prompt is opt-IN; once subscribed we just stay quiet.
      try {
        const existing = await getCurrentSubscription();
        if (existing) return;
      } catch {
        /* fall through and try the prompt */
      }

      // Honour 30-day "maybe later" defer.
      try {
        const deferStr = window.localStorage.getItem(DEFER_KEY);
        if (deferStr) {
          const deferUntil = Number(deferStr);
          if (Number.isFinite(deferUntil) && deferUntil > Date.now()) return;
        }
      } catch {
        /* localStorage disabled — show anyway */
      }

      timer = setTimeout(() => {
        if (!cancelled) setState("prompt");
      }, DWELL_MS);
    }

    init();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  async function handleAllow() {
    setState("subscribing");
    setErrorMsg(null);
    try {
      await subscribeToPush(["breaking", "edition", "prediction"]);
      setState("subscribed");
      // Auto-dismiss the success pill after 5s.
      window.setTimeout(() => setState("hidden"), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not enable notifications";
      setErrorMsg(msg);
      setState("error");
    }
  }

  function handleDismiss() {
    try {
      const until = Date.now() + DEFER_DAYS * 24 * 60 * 60 * 1000;
      window.localStorage.setItem(DEFER_KEY, String(until));
    } catch {
      /* ignore */
    }
    setState("hidden");
  }

  if (state === "hidden") return null;

  return (
    <div
      data-testid="push-opt-in-prompt"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border-2 shadow-lg"
      style={{
        background: "var(--color-paper, #f5efdf)",
        borderColor: "var(--color-rule, #1c1816)",
        color: "var(--color-ink, #1c1816)",
        fontFamily: "var(--font-sub, ui-serif, Georgia, serif)",
        padding: "14px 16px",
      }}
      role="dialog"
      aria-live="polite"
      aria-label="Push notification opt-in"
    >
      {state === "subscribed" ? (
        <p className="text-sm font-medium">
          <span aria-hidden>✓ </span>You&apos;ll get breaking-news alerts.
        </p>
      ) : state === "error" ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Couldn&apos;t enable notifications</p>
          <p className="text-xs opacity-75">{errorMsg}</p>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold mb-1" style={{ fontFamily: "var(--font-display, ui-serif, Georgia, serif)" }}>
              Get notified when odds shift &gt;10%
            </p>
            <p className="text-xs opacity-75">
              Breaking-news alerts, new editions, and prediction outcomes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAllow}
              disabled={state === "subscribing"}
              className="text-xs uppercase tracking-wider px-3 py-2 border-2 font-semibold disabled:opacity-50"
              style={{
                background: "var(--color-ink, #1c1816)",
                color: "var(--color-paper, #f5efdf)",
                borderColor: "var(--color-ink, #1c1816)",
              }}
            >
              {state === "subscribing" ? "Enabling…" : "Allow notifications"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs uppercase tracking-wider px-3 py-2 underline opacity-70 hover:opacity-100"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PushOptInPrompt;

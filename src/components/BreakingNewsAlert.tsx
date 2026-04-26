"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type BreakingAlert = {
  marketId: string;
  articleId: string;
  slug: string;
  headline: string;
  probabilityBefore: number;
  probabilityNow: number;
  delta: number;
  alertedAt: string;
};

const POLL_MS = 60_000;
const DISMISSED_KEY = "tfe_dismissed_breaking";
/** Cap the dismissed-set so we don't grow localStorage forever. */
const DISMISSED_MAX = 200;

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function persistDismissed(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    // Trim oldest if over cap. Set preserves insertion order.
    let arr = Array.from(set);
    if (arr.length > DISMISSED_MAX) {
      arr = arr.slice(arr.length - DISMISSED_MAX);
    }
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch {
    // Quota exceeded / disabled — silently skip.
  }
}

/**
 * Stable id for an alert: composite of marketId + alertedAt so a re-fired
 * alert (after suppression lifts) can be re-shown.
 */
function alertId(a: BreakingAlert): string {
  return `${a.marketId}:${a.alertedAt}`;
}

/**
 * Polls `/api/breaking/recent` every 60s and surfaces the newest non-dismissed
 * alert as a fixed banner. Dismissed alerts are remembered in localStorage so
 * a refresh doesn't re-show what the user just closed.
 *
 * Animation: slide-in-top (240ms) on appear; on dismiss we add an exit class
 * and unmount after the transition.
 */
export function BreakingNewsAlert() {
  const [alert, setAlert] = useState<BreakingAlert | null>(null);
  const [exiting, setExiting] = useState<boolean>(false);
  const dismissedRef = useRef<Set<string>>(new Set());

  // Hydrate dismissed set once.
  useEffect(() => {
    dismissedRef.current = loadDismissed();
  }, []);

  const pickAlert = useCallback((alerts: BreakingAlert[]): BreakingAlert | null => {
    const dismissed = dismissedRef.current;
    for (const a of alerts) {
      if (!dismissed.has(alertId(a))) return a;
    }
    return null;
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/breaking/recent", {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { alerts?: BreakingAlert[] };
        if (cancelled) return;
        const alerts = Array.isArray(data.alerts) ? data.alerts : [];
        const next = pickAlert(alerts);
        // Only update if the picked alert is different — avoids unnecessary
        // re-renders / re-animation on each poll.
        setAlert((curr) => {
          if (!next) return null;
          if (curr && alertId(curr) === alertId(next)) return curr;
          return next;
        });
      } catch {
        // Ignore — next interval retries.
      }
    };

    poll();
    const id = window.setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(id);
    };
  }, [pickAlert]);

  const dismiss = useCallback(() => {
    if (!alert) return;
    const id = alertId(alert);
    dismissedRef.current.add(id);
    persistDismissed(dismissedRef.current);
    setExiting(true);
    // Wait for the slide-out to finish before unmounting.
    window.setTimeout(() => {
      setAlert(null);
      setExiting(false);
    }, 240);
  }, [alert]);

  if (!alert) return null;

  const deltaSign = alert.delta > 0 ? "+" : "";
  const deltaLabel = `${deltaSign}${Math.round(alert.delta)}pts`;
  const probLabel = `${Math.round(alert.probabilityNow)}%`;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-red-700 px-4 py-3 shadow-lg"
      role="alert"
      aria-live="assertive"
      style={{
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        opacity: exiting ? 0 : 1,
        transition: "transform 240ms ease-in, opacity 240ms ease-in",
        animation: exiting ? "none" : "slide-in-top 0.24s ease-out",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-red-200">
          Breaking
        </span>
        <Link
          href={`/article/${alert.slug}`}
          className="truncate text-sm font-bold text-white hover:underline"
        >
          {alert.headline}
        </Link>
        <span className="shrink-0 text-xs text-red-200 font-mono">
          {probLabel} · {deltaLabel}
        </span>
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss breaking news alert"
        className="shrink-0 text-red-200 hover:text-white text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
}

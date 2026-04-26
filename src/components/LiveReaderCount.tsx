"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** URL slug for the article (e.g. "trump-election-2024"). */
  articleSlug: string;
  /** Heartbeat interval in ms. Defaults to 30s — matches server bucket TTL. */
  heartbeatMs?: number;
  /** Read-back poll interval in ms. Defaults to heartbeatMs. */
  pollMs?: number;
};

const SESSION_KEY = "tfe_session_id";
const DEFAULT_HEARTBEAT_MS = 30_000;

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = window.crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private mode / disabled storage — fall back to a per-tab id so heartbeat
    // still works for this session (won't dedupe across tabs, but no crash).
    return window.crypto.randomUUID();
  }
}

/**
 * Live "reading now" count.
 *
 * - Client heartbeats every 30s with its sessionId.
 * - Server keeps a HyperLogLog of unique sessionIds per minute bucket.
 * - This component polls /api/presence/{slug} on the same interval and shows
 *   the sliding-window count.
 * - Renders nothing if count <= 1 (so we don't flash "1 reading now" at
 *   yourself, which feels like a lie).
 */
export function LiveReaderCount({
  articleSlug,
  heartbeatMs = DEFAULT_HEARTBEAT_MS,
  pollMs,
}: Props) {
  const [count, setCount] = useState<number>(0);
  const [punch, setPunch] = useState<boolean>(false);
  const lastCountRef = useRef<number>(0);

  useEffect(() => {
    if (!articleSlug) return;
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    let cancelled = false;
    const ac = new AbortController();
    const heartbeatInterval = heartbeatMs;
    const pollInterval = pollMs ?? heartbeatMs;

    const heartbeat = async () => {
      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleSlug, sessionId }),
          signal: ac.signal,
          // No need to keep this in browser cache.
          cache: "no-store",
        });
      } catch {
        // Network blip — next interval will retry.
      }
    };

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/presence/${encodeURIComponent(articleSlug)}`,
          { signal: ac.signal, cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { readers?: number };
        if (cancelled) return;
        const next = typeof data.readers === "number" && data.readers >= 0 ? data.readers : 0;
        if (next !== lastCountRef.current) {
          lastCountRef.current = next;
          setCount(next);
          // Trigger a brief "punch" pulse on change.
          setPunch(true);
          window.setTimeout(() => setPunch(false), 240);
        }
      } catch {
        // ignored
      }
    };

    // Fire once immediately so the user doesn't wait 30s for the first count.
    heartbeat();
    poll();

    const hbId = window.setInterval(heartbeat, heartbeatInterval);
    const pollId = window.setInterval(poll, pollInterval);

    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(hbId);
      window.clearInterval(pollId);
    };
  }, [articleSlug, heartbeatMs, pollMs]);

  // Trivial-self case: don't show "1 reading now" — it's true but unflattering.
  if (count <= 1) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-gray-500"
      style={{
        transform: punch ? "scale(1.06)" : "scale(1)",
        transition: "transform 240ms ease-out",
      }}
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span>
        <strong className="font-semibold text-gray-700">{count.toLocaleString()}</strong>{" "}
        reading now
      </span>
    </span>
  );
}

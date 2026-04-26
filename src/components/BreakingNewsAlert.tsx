"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BreakingEvent = {
  type: "breaking";
  articleId: string;
  headline: string;
  slug: string;
  probability: number;
};

export function BreakingNewsAlert() {
  const [alert, setAlert] = useState<BreakingEvent | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/events/breaking");

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as BreakingEvent;
        if (payload.type === "breaking") {
          setAlert(payload);
          // Auto-dismiss after 8 seconds.
          setTimeout(() => setAlert(null), 8_000);
        }
      } catch {
        // Malformed payload — ignore.
      }
    };

    return () => es.close();
  }, []);

  if (!alert) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-red-700 px-4 py-3 shadow-lg animate-slide-in-top"
      role="alert"
      aria-live="assertive"
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
        <span className="shrink-0 text-xs text-red-200">
          {Math.round(alert.probability * 100)}%
        </span>
      </div>

      <button
        onClick={() => setAlert(null)}
        aria-label="Dismiss breaking news alert"
        className="shrink-0 text-red-200 hover:text-white text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
}

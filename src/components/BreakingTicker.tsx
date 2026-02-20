"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TickerItem = {
  id: string;
  title: string;
  probability: string | null;
  category: string;
  slug: string | null;
};

export function BreakingTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetch("/api/ticker")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="bg-[var(--color-accent-red)] text-[var(--color-paper-cream)] overflow-hidden border-y-2 border-[var(--color-ink)]"
      role="marquee"
      aria-live="off"
    >
      <div className="flex animate-ticker gap-10 whitespace-nowrap py-3 px-2">
        <span className="text-[var(--color-accent-gold)] font-bold text-xs uppercase tracking-[0.2em] font-[family-name:var(--font-ui)] shrink-0">
          ◆ BREAKING ◆
        </span>
        {items.slice(0, 8).map((item) => (
          <Link
            key={item.id}
            href={item.slug ? `/article/${item.slug}` : `/section/${item.category}`}
            className="text-[13px] font-semibold uppercase tracking-wide hover:underline font-[family-name:var(--font-ui)] text-[var(--color-paper-cream)]"
          >
            {item.title.slice(0, 60)}
            {item.title.length > 60 ? "…" : ""} — {item.probability ?? "—"}%
          </Link>
        ))}
      </div>
    </div>
  );
}

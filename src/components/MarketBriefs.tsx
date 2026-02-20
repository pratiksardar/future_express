"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Brief = {
  id: string;
  title: string;
  category: string;
  currentProbability: string | null;
  volume24h: string | null;
};

export function MarketBriefs() {
  const [items, setItems] = useState<Brief[]>([]);

  useEffect(() => {
    fetch("/api/markets?limit=8")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  return (
    <aside className="p-0">
      <h2 className="section-title mb-4">
        Market Briefs
      </h2>
      <ul className="space-y-0">
        {items.map((item) => (
          <li key={item.id} className="border-b border-[var(--color-rule)] py-2 first:pt-0">
            <Link
              href={`/section/${item.category}?m=${item.id}`}
              className="text-sm font-[family-name:var(--font-sub)] text-[var(--color-ink)] hover:text-[var(--color-accent-blue)]"
            >
              {item.title.slice(0, 50)}
              {item.title.length > 50 ? "…" : ""}
            </Link>
            <div className="text-xs font-[family-name:var(--font-data)] text-[var(--color-ink-light)] mt-0.5">
              {item.currentProbability ?? "—"}% · {item.volume24h ? `$${item.volume24h}` : "—"}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { Masthead } from "@/components/Masthead";
import { SectionNav } from "@/components/SectionNav";
import { ArticleCard } from "@/components/ArticleCard";
import Link from "next/link";

type Hit = {
  id: string;
  headline: string;
  subheadline?: string | null;
  slug: string;
  category: string;
  probabilityAtPublish?: string | null;
  publishedAt?: string;
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="paper-texture min-h-screen">
      <Masthead />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-5)] py-[var(--space-6)]">
        <h1
          className="text-2xl font-black text-[var(--color-ink)] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Search the Express
        </h1>
        <div className="flex gap-2 mb-8">
          <input
            type="search"
            placeholder="Search headlines and stories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="flex-1 px-4 py-2 border border-[var(--color-rule)] bg-[var(--color-paper-cream)] text-[var(--color-ink)] font-[family-name:var(--font-body)]"
          />
          <button
            type="button"
            onClick={search}
            className="px-6 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold uppercase tracking-wider text-sm font-[family-name:var(--font-ui)] hover:bg-[var(--color-accent-blue)] transition-colors"
          >
            Search
          </button>
        </div>

        {loading && (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton w-full h-24 rounded" />
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <ul className="space-y-4">
            {results.map((a) => (
              <li key={a.id}>
                <ArticleCard
                  headline={a.headline}
                  subheadline={a.subheadline}
                  slug={a.slug}
                  category={a.category}
                  probabilityAtPublish={a.probabilityAtPublish}
                  publishedAt={a.publishedAt}
                  size="compact"
                />
              </li>
            ))}
          </ul>
        )}

        {!loading && q && results.length === 0 && (
          <p className="text-[var(--color-ink-light)] italic font-[family-name:var(--font-sub)]">
            No articles found for &quot;{q}&quot;.
          </p>
        )}

        <footer className="mt-12 py-6 text-center text-sm text-[var(--color-ink-light)]">
          <Link href="/" className="hover:text-[var(--color-accent-blue)]">
            ← Back to Front Page
          </Link>
        </footer>
      </main>
    </div>
  );
}

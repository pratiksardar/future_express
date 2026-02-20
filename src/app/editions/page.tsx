import { Masthead } from "@/components/Masthead";
import { SectionNav } from "@/components/SectionNav";
import Link from "next/link";
import { db } from "@/lib/db";
import { editions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function EditionsPage() {
  const list = await db
    .select({
      id: editions.id,
      type: editions.type,
      date: editions.date,
      volumeNumber: editions.volumeNumber,
      publishedAt: editions.publishedAt,
    })
    .from(editions)
    .orderBy(desc(editions.publishedAt))
    .limit(100);

  return (
    <div className="paper-texture min-h-screen">
      <Masthead compact />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-4)] sm:px-[var(--space-5)] py-[var(--space-6)] sm:py-[var(--space-7)]">
        <h1
          className="text-3xl font-black text-[var(--color-ink)] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Past editions
        </h1>
        <p className="text-[var(--color-ink-light)] font-[family-name:var(--font-sub)] mb-8">
          Browse the newspaper by volume. Each edition is generated every four hours from the top trending prediction markets.
        </p>

        {list.length === 0 ? (
          <p className="text-[var(--color-ink-light)] italic">No editions yet. They are created every 4 hours.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((e) => {
              const pub = e.publishedAt
                ? new Date(e.publishedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "";
              const vol = e.volumeNumber != null ? `Vol. ${e.volumeNumber}` : "—";
              const href = e.volumeNumber != null ? `/edition/${e.volumeNumber}` : `/edition/${e.id}`;
              return (
                <li key={e.id}>
                  <Link
                    href={href}
                    className="flex flex-wrap items-baseline gap-2 py-2 border-b border-[var(--color-rule)] hover:bg-[var(--color-paper-warm)] hover:border-[var(--color-rule-dark)] transition-colors px-2 -mx-2 rounded-sm"
                  >
                    <span className="font-semibold text-[var(--color-ink)]" style={{ fontFamily: "var(--font-display)" }}>
                      {vol}
                    </span>
                    <span className="text-[var(--color-ink-light)] text-sm">{pub}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-10 text-sm">
          <Link href="/" className="underline hover:text-[var(--color-accent-blue)] transition-colors">
            ← Back to Front Page
          </Link>
        </p>
      </main>
    </div>
  );
}

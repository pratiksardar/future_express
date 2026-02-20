import { Masthead } from "@/components/Masthead";
import { SectionNav } from "@/components/SectionNav";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="paper-texture min-h-screen">
      <Masthead />
      <SectionNav />

      <main className="max-w-[var(--article-max-width)] mx-auto px-[var(--space-5)] py-[var(--space-6)]">
        <h1
          className="text-3xl font-black text-[var(--color-ink)] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          About The Future Express
        </h1>
        <p className="text-[var(--color-ink-medium)] leading-relaxed font-[family-name:var(--font-body)] mb-4">
          The Future Express is the newspaper of record for what hasn&apos;t happened yet. We turn prediction market data from Polymarket and Kalshi into researched, readable articles—so you get tomorrow&apos;s news with today&apos;s odds.
        </p>
        <p className="text-[var(--color-ink-medium)] leading-relaxed font-[family-name:var(--font-body)] mb-4">
          Our articles are generated with AI using current market probabilities and recent context from the web. Every probability is attributed to prediction markets, not to us. We are not giving financial or gambling advice.
        </p>
        <p className="text-[var(--color-ink-medium)] leading-relaxed font-[family-name:var(--font-body)] mb-6">
          Data is refreshed regularly. Morning editions are generated daily. For methodology and data sources, see our API and attribution in each article.
        </p>
        <p className="text-sm text-[var(--color-ink-light)]">
          <Link href="/" className="underline hover:text-[var(--color-accent-blue)]">
            ← Back to Front Page
          </Link>
        </p>
      </main>
    </div>
  );
}

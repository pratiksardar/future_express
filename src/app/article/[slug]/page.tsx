import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq, desc, ne } from "drizzle-orm";
import { Masthead } from "@/components/Masthead";
import { AgentIdentityStrip } from "@/components/AgentIdentityStrip";
import { SectionNav } from "@/components/SectionNav";
import { UniswapSwapWidget } from "@/components/UniswapSwapWidget";
import { ShareBar } from "@/components/ShareBar";
import { EmbedSection } from "@/components/EmbedSection";
import { AccuracyBadge } from "@/components/AccuracyBadge";
import { PredictMarketButton } from "@/components/PredictMarketButton";
import { PlatformConfidence } from "@/components/PlatformConfidence";
import { WhatIfGenerator } from "@/components/WhatIfGenerator";
import { LiveReaderCount } from "@/components/LiveReaderCount";
import { getAppUrl } from "@/lib/url";

import Image from "next/image";

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economy: "Economy",
  crypto: "Crypto",
  sports: "Sports",
  science: "Science",
  entertainment: "Entertainment",
  world: "World",
};

function probLabel(p: number): string {
  if (p >= 90) return "Near Certain";
  if (p >= 70) return "Very Likely";
  if (p >= 50) return "Leaning Yes";
  if (p >= 40) return "Toss-Up";
  if (p >= 20) return "Leaning No";
  if (p >= 5) return "Unlikely";
  return "Long Shot";
}

function probColor(p: number): string {
  if (p >= 70) return "var(--color-spot-green)";
  if (p >= 40) return "var(--color-ink-light)";
  return "var(--color-spot-red)";
}

/**
 * Build the V4 ASCII odds box. Every interior row is exactly 29 cols
 * between │ │ (= 31 chars total). Box-drawing alignment is fatal if
 * off-by-one — match V4 page.tsx:25-39 exactly.
 */
function buildAsciiOddsBox(args: {
  probability: number;
  label: string;
  source: string;
  volume: string | null;
  traders: string;
}): string[] {
  const buildBar = (pct: number, width = 24) => {
    const filled = Math.round((pct / 100) * width);
    return "━".repeat(filled) + "░".repeat(Math.max(0, width - filled));
  };
  const probStr = String(Math.max(0, Math.min(99, args.probability))).padStart(2, " ");
  const labelStr = args.label.toUpperCase().slice(0, 25).padEnd(25, " ");
  const sourceStr = args.source.toUpperCase().slice(0, 25).padEnd(25, " ");
  const volStr = (args.volume ?? "—").slice(0, 20).padEnd(20, " ");
  const tradersStr = args.traders.slice(0, 17).padEnd(17, " ");
  return [
    "┌─── MARKET ODDS ─────────────┐",
    "│                             │",
    `│   ${probStr}%                       │`,
    `│   ${buildBar(args.probability)}  │`,
    `│   ${labelStr} │`,
    "│                             │",
    `│   ${sourceStr} │`,
    `│   VOL: ${volStr} │`,
    `│   TRADERS: ${tradersStr}│`,
    "└─────────────────────────────┘",
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rows = await db
    .select({
      headline: articles.headline,
      subheadline: articles.subheadline,
      category: articles.category,
      probability: articles.probabilityAtPublish,
    })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return { title: "Not Found" };
  const title = `${row.headline} | The Future Express`;
  const description = (row.subheadline ?? row.headline).slice(0, 160);
  const base = getAppUrl();
  const prob = row.probability ? parseInt(String(row.probability), 10) : null;
  const ogImageUrl = `${base}/article/${slug}/opengraph-image`;
  const ogImageAlt = `${row.headline} — The Future Express`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${base}/article/${slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          alt: ogImageAlt,
        },
      ],
      ...(prob != null && {
        label1: "Market Odds",
        data1: `${prob}%`,
        label2: "Category",
        data2: row.category ? row.category.charAt(0).toUpperCase() + row.category.slice(1) : "News",
      }),
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await db
    .select()
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .where(eq(articles.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  const article = row.articles;
  const market = row.markets;
  const prob = market.currentProbability ? parseInt(String(market.currentProbability), 10) : 50;

  const related = await db
    .select({
      id: articles.id,
      headline: articles.headline,
      slug: articles.slug,
      category: articles.category,
      probabilityAtPublish: articles.probabilityAtPublish,
    })
    .from(articles)
    .where(ne(articles.id, article.id))
    .orderBy(desc(articles.publishedAt))
    .limit(3);

  const appUrl = getAppUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.headline,
    "description": article.subheadline ?? article.headline,
    "image": article.imageUrl ? [article.imageUrl] : [],
    "datePublished": article.publishedAt.toISOString(),
    "dateModified": article.updatedAt.toISOString(),
    "author": [{
      "@type": "Organization",
      "name": "The Future Express Autonomous Staff",
      "url": appUrl
    }],
    "publisher": {
      "@type": "Organization",
      "name": "The Future Express",
      "logo": {
        "@type": "ImageObject",
        "url": `${appUrl}/favicon.ico`
      }
    },
    // Custom prop commonly mapped to by AI scrapers: Let them read the raw body fast!
    "articleBody": article.body
  };

  // V4 FILED slug — Reuters-style filing line with ML confidence score.
  // Format: FILED 2026-04-26 22:14 UTC · AGENT editor@futureexpress · CONFIDENCE 0.86
  // TODO(confidence-live): wire CONFIDENCE from accuracy data
  // (src/lib/articles/accuracy.ts). Hardcoded 0.86 mirrors V4 prototype
  // until the per-article confidence field is exposed.
  const filedIso = article.publishedAt.toISOString();
  const filedStamp = `${filedIso.slice(0, 10)} ${filedIso.slice(11, 16)} UTC`;
  const filedLine = `FILED ${filedStamp} · AGENT editor@futureexpress · CONFIDENCE 0.86`;

  // Build ASCII odds box for the sidebar — same data binding as the
  // existing widget (probability, label, source, volume24h).
  const sourceLabel = market.kalshiTicker ? "POLYMARKET · KALSHI" : "POLYMARKET";
  const volumeLabel = market.volume24h ? `$${market.volume24h}` : "—";
  const oddsBox = buildAsciiOddsBox({
    probability: prob,
    label: probLabel(prob),
    source: sourceLabel,
    volume: volumeLabel,
    traders: "—",
  });

  return (
    <div className="paper-texture min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* V4 above-fold agent identity strip — links to /transparency. */}
      <AgentIdentityStrip />
      <Masthead compact />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-5)] py-[var(--space-6)]">
        <div className="section-title mb-2">
          {CATEGORY_LABELS[article.category] ?? article.category}
        </div>
        {article.imageUrl && (
          <div className="mb-6 overflow-hidden rounded shadow-sm relative aspect-[21/9]">
            <Image priority src={article.imageUrl} alt={article.headline} fill className="object-cover" />
          </div>
        )}
        <h1
          className="text-3xl md:text-4xl font-bold leading-tight text-[var(--color-ink)] mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {article.headline}
        </h1>
        {article.subheadline && (
          <p className="text-xl italic text-[var(--color-ink-medium)] mb-4 font-[family-name:var(--font-sub)] max-w-2xl">
            {article.subheadline}
          </p>
        )}
        <p className="text-sm italic text-[var(--color-ink-light)] font-[family-name:var(--font-sub)] mb-2">
          By The Future Express Newsroom ·{" "}
          {new Date(article.publishedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })} · 5 min read
        </p>
        {/* V4 FILED line — Reuters-style filing slug + ML CONFIDENCE token */}
        <div className="fe-v4-filed mb-6" aria-label="Filing dispatch line">
          {filedLine}
        </div>
        <div className="mb-4">
          <LiveReaderCount articleSlug={slug} />
        </div>

        <ShareBar
          url={`${appUrl}/article/${slug}`}
          title={article.headline}
          text={article.subheadline ?? article.headline}
          probability={prob}
          slug={slug}
        />

        <EmbedSection
          marketId={market.id}
          baseUrl={appUrl}
        />

        <div className="divider-double pt-4" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
          <div className="lg:col-span-2 max-w-[var(--article-max-width)]">
            <div
              className="article-body text-[var(--color-ink-medium)] text-lg leading-[1.65] font-[family-name:var(--font-body)] [&>p]:mb-5  [&>blockquote]:border-l-4 [&>blockquote]:border-[var(--color-accent-red)] [&>blockquote]:pl-5 [&>blockquote]:py-2 [&>blockquote]:italic [&>blockquote]:text-xl [&>blockquote]:font-[family-name:var(--font-display)]"
              dangerouslySetInnerHTML={{
                __html: article.body
                  .split(/\n\n+/)
                  .map((p) => `<p>${p.replace(/\n/g, " ")}</p>`)
                  .join(""),
              }}
            />
            {article.contrarianTake && (
              <div className="mt-8 p-4 border border-[var(--color-rule)] bg-[var(--color-paper-cream)]">
                <h4 className="section-title text-xs mb-2">
                  The Contrarian
                </h4>
                <p className="italic font-[family-name:var(--font-sub)] text-[var(--color-ink-medium)]">
                  {article.contrarianTake}
                </p>
              </div>
            )}
            <div className="mt-8 p-3 border border-[var(--color-rule)] text-[10px] uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
              AI-Generated Article · Based on prediction market data from Polymarket and Kalshi. Not financial advice.
            </div>
            <WhatIfGenerator
              market={{
                id: market.id,
                title: market.title,
                currentProbability: prob,
              }}
            />
            <UniswapSwapWidget />
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* V4 ASCII odds box — the eye-grabbing primary visual.
                  Same data binding as the legacy odds widget below; the
                  ASCII frame is the screenshot moneyshot per the
                  marketing review. */}
              <pre className="fe-v4-odds-ascii" aria-label={`Market odds: ${prob}% — ${probLabel(prob)}`}>
                {oddsBox.map((line, i) => {
                  if (i === 2) {
                    return (
                      <span key={i}>
                        <span>{"│   "}</span>
                        <span className="fe-v4-odds-pct">
                          {String(Math.max(0, Math.min(99, prob))).padStart(2, " ")}%
                        </span>
                        <span>{"                       │\n"}</span>
                      </span>
                    );
                  }
                  if (i === 3) {
                    return (
                      <span key={i} className="fe-v4-odds-bar-line">
                        {line + "\n"}
                      </span>
                    );
                  }
                  if (i >= 6 && i <= 8) {
                    return (
                      <span key={i} className="fe-v4-odds-meta">
                        {line + "\n"}
                      </span>
                    );
                  }
                  return <span key={i}>{line + "\n"}</span>;
                })}
              </pre>

              {/* Affiliate CTAs — same destinations as before, just under the
                  ASCII frame instead of inside the legacy box. */}
              <Link
                href={process.env.NEXT_PUBLIC_POLYMARKET_AFFILIATE_URL ?? "https://polymarket.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="fe-v4-odds-cta"
              >
                ► Trade on Polymarket
              </Link>
              {market.kalshiTicker && (
                <Link
                  href={process.env.NEXT_PUBLIC_KALSHI_AFFILIATE_URL ?? "https://kalshi.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fe-v4-odds-cta"
                >
                  ► Trade on Kalshi
                </Link>
              )}

              {/* Legacy odds widget — kept for the affiliate disclosure +
                  AccuracyBadge data, but shifted below the ASCII box so the
                  ASCII frame leads the eye. */}
              <div className="p-4 border-2 border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)]">
                <h4 className="section-title mb-3">
                  The Odds
                </h4>
                <div
                  className="text-4xl font-bold font-[family-name:var(--font-data)] mb-1"
                  style={{ color: probColor(prob) }}
                  data-odds={(prob / 100).toFixed(2)}
                  data-odds-label={probLabel(prob)}
                  data-odds-percent={prob}
                >
                  {prob}%
                </div>
                <div className="text-xs uppercase text-[var(--color-ink-light)] mb-4">
                  {probLabel(prob)}
                </div>
                <div className="divider-thin py-2 text-xs text-[var(--color-ink-light)]">
                  Source: Polymarket{market.kalshiTicker ? " · Kalshi" : ""}
                </div>
                {market.volume24h && (
                  <div className="text-xs text-[var(--color-ink-light)]">
                    Volume: ${market.volume24h}
                  </div>
                )}
                {article.probabilityAtPublish && (
                  <div className="mt-3 mb-3">
                    <AccuracyBadge
                      probabilityAtPublish={parseInt(String(article.probabilityAtPublish), 10)}
                      currentProbability={prob}
                      resolutionOutcome={market.resolutionOutcome}
                      size="md"
                    />
                  </div>
                )}
                <p className="text-[10px] text-[var(--color-ink-faded)] mb-2">
                  We may earn a commission if you sign up or trade.
                </p>
                <PredictMarketButton
                  marketId={market.id}
                  articleId={article.id}
                  currentProbability={prob}
                  marketTitle={market.title}
                />
              </div>
              <div>
                <PlatformConfidence />
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t-[var(--border-double)]">
            <h2 className="section-title mb-4">
              Related Stories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/article/${r.slug}`}
                  className="block p-4 bg-[var(--color-paper-warm)] group"
                >
                  <h4 className="font-bold text-[var(--color-ink)] group-hover:text-[var(--color-accent-blue)] font-[family-name:var(--font-display)]">
                    {r.headline}
                  </h4>
                  <span className="text-sm font-[family-name:var(--font-data)]" style={{ color: probColor(parseInt(String(r.probabilityAtPublish ?? 50), 10)) }}>
                    {r.probabilityAtPublish ?? "—"}%
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-12 py-6 text-center text-sm text-[var(--color-ink-light)]">
          {/* V4 brand-thesis tagline — see CMO review §2 */}
          <p className="fe-v4-tagline mb-4">
            —— Printed by a machine that has read more newspapers than you. ——
          </p>
          <Link href="/" className="hover:text-[var(--color-accent-blue)]">← Back to Front Page</Link>
          <span className="mx-3" aria-hidden>·</span>
          <Link href="/transparency" className="hover:text-[var(--color-accent-blue)]">Verified by ledger →</Link>
        </footer>
      </main>
    </div>
  );
}

import { Masthead } from "@/components/Masthead";
import { AgentIdentityStrip } from "@/components/AgentIdentityStrip";
import { BreakingTicker } from "@/components/BreakingTicker";
import { SectionNav } from "@/components/SectionNav";
import { ArticleCard } from "@/components/ArticleCard";
import { MarketBriefs } from "@/components/MarketBriefs";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { Classifieds } from "@/components/Classifieds";
import { AdSlot } from "@/components/AdSlot";
import { PlatformConfidence } from "@/components/PlatformConfidence";
import { PushOptInPrompt } from "@/components/PushOptInPrompt";
import { CalledItBanner } from "@/components/CalledItBanner";
import { EditionHeader } from "@/components/EditionHeader";
import Link from "next/link";
import { db } from "@/lib/db";
import { articles, markets, editions, editionArticles } from "@/lib/db/schema";
import { desc, eq, asc, inArray } from "drizzle-orm";
import { getTrendingMarkets } from "@/lib/articles/trending";
import { getAppUrl } from "@/lib/url";

async function getLatestEdition() {
  try {
    const [e] = await db.select().from(editions).orderBy(desc(editions.publishedAt)).limit(1);
    return e ?? null;
  } catch {
    return null;
  }
}

/** Articles for the latest edition (volume), in edition order. Uses current market data for dynamic UI. */
async function getArticlesForLatestEdition(editionId: string) {
  try {
    const eaList = await db
      .select({ articleId: editionArticles.articleId, position: editionArticles.position })
      .from(editionArticles)
      .where(eq(editionArticles.editionId, editionId))
      .orderBy(asc(editionArticles.position));
    const ids = eaList.map((r) => r.articleId);
    if (ids.length === 0) return [];
    const rows = await db
      .select({
        id: articles.id,
        headline: articles.headline,
        subheadline: articles.subheadline,
        slug: articles.slug,
        category: articles.category,
        imageUrl: articles.imageUrl,
        probabilityAtPublish: articles.probabilityAtPublish,
        publishedAt: articles.publishedAt,
        currentProbability: markets.currentProbability,
        volume24h: markets.volume24h,
        marketId: articles.marketId,
      })
      .from(articles)
      .innerJoin(markets, eq(articles.marketId, markets.id))
      .where(inArray(articles.id, ids));
    const byId = new Map(rows.map((r) => [r.id, r]));
    return eaList.map((ea) => byId.get(ea.articleId)).filter(Boolean) as typeof rows;
  } catch {
    return [];
  }
}

/** Fallback: latest 24 articles by publishedAt. */
async function getArticlesFallback() {
  try {
    return await db
      .select({
        id: articles.id,
        headline: articles.headline,
        subheadline: articles.subheadline,
        slug: articles.slug,
        category: articles.category,
        imageUrl: articles.imageUrl,
        probabilityAtPublish: articles.probabilityAtPublish,
        publishedAt: articles.publishedAt,
        currentProbability: markets.currentProbability,
        volume24h: markets.volume24h,
        marketId: articles.marketId,
      })
      .from(articles)
      .innerJoin(markets, eq(articles.marketId, markets.id))
      .orderBy(desc(articles.publishedAt))
      .limit(24);
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const appUrl = getAppUrl();
  const latestEdition = await getLatestEdition();
  const editionArticlesList = latestEdition?.id
    ? await getArticlesForLatestEdition(latestEdition.id)
    : [];
  const list = editionArticlesList.length > 0 ? editionArticlesList : await getArticlesFallback();

  // Fetch trending data for badges
  let trendingMap = new Map<string, { delta: number }>();
  try {
    const trending = await getTrendingMarkets(24, 5);
    trendingMap = trending;
  } catch {
    // Non-critical: trending badges just won't show
  }
  const [lead, second, third, fourth, ...rest] = list;
  const latestEditionLabel = latestEdition?.publishedAt
    ? new Date(latestEdition.publishedAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    : null;
  const volumeLabel =
    latestEdition?.volumeNumber != null ? `Vol. ${latestEdition.volumeNumber}` : null;
  const mastheadEditionLabel =
    volumeLabel && latestEditionLabel ? `${volumeLabel} · ${latestEditionLabel}` : latestEditionLabel;

  // JSON-LD: ItemList for homepage — lets agents parse structured headlines without DOM traversal
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": latestEdition ? `The Future Express — Vol. ${latestEdition.volumeNumber ?? ""}` : "The Future Express",
    "description": "AI-generated prediction market news powered by Polymarket and Kalshi.",
    "url": appUrl,
    "numberOfItems": list.length,
    "itemListElement": list.slice(0, 12).map((a, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "NewsArticle",
        "headline": a.headline,
        "description": a.subheadline ?? a.headline,
        "url": `${appUrl}/article/${a.slug}`,
        "datePublished": a.publishedAt ? new Date(a.publishedAt).toISOString() : null,
        "articleSection": a.category,
        "keywords": `prediction market, ${a.category}, odds ${a.currentProbability ?? a.probabilityAtPublish}%`,
      },
    })),
  };

  return (
    <div className="paper-texture min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* V4 above-fold agent identity strip — links to /transparency for the
          full ceremonial receipt. Per CMO + marketing review consensus, the
          wallet narrative is the brand surface but the full hex moves to a
          dedicated page so Wedge A (finance pros) doesn't bounce. */}
      <AgentIdentityStrip />
      <CalledItBanner />
      <Masthead
        latestEdition={mastheadEditionLabel}
        volumeNumber={latestEdition?.volumeNumber}
      />
      <BreakingTicker />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-4)] sm:px-[var(--space-5)] py-[var(--space-6)] sm:py-[var(--space-7)]">

        {/* V4 edition header — thin 1px top bar: edition no. / broadsheet date / ☀☾ toggle.
            Sits above the broadsheet grid as a orientation layer for print-literate readers. */}
        <EditionHeader editionNumber={latestEdition?.volumeNumber} />

        {/* V4 five-column broadsheet grid — mobile: single column (stacked),
            desktop (≥768px): 2fr 1fr 1fr 1fr 1fr via .fe-broadsheet-grid.
            Lead story spans the first 2 cols (.fe-broadsheet-lead).
            Grid classes and responsive rules defined in globals.css. */}
        <section className="pb-[var(--space-8)]" style={{ borderBottom: "var(--border-double)" }}>
          <div className="fe-broadsheet-grid">

            {/* Lead story — spans 2 columns on desktop (.fe-broadsheet-lead) */}
            <div className="fe-broadsheet-lead">
              {lead ? (
                <ArticleCard
                  headline={lead.headline}
                  subheadline={lead.subheadline}
                  slug={lead.slug}
                  category={lead.category}
                  imageUrl={lead.imageUrl}
                  probabilityAtPublish={lead.probabilityAtPublish}
                  currentProbability={lead.currentProbability}
                  publishedAt={lead.publishedAt?.toISOString()}
                  volume24h={lead.volume24h}
                  size="hero"
                  trendingDelta={trendingMap.get(lead.marketId)?.delta ?? null}
                />
              ) : (
                <div className="py-12 text-center text-[var(--color-ink-light)] font-[family-name:var(--font-sub)] space-y-3">
                  <p className="italic">No stories yet.</p>
                  <p className="text-sm">
                    Run <code className="px-1.5 py-0.5 bg-[var(--color-paper-warm)] rounded">POST /api/ingest</code> with body{" "}
                    <code className="px-1.5 py-0.5 bg-[var(--color-paper-warm)] rounded">{`{ "generateArticles": true }`}</code> to fetch markets and generate the latest edition, or wait for the 4-hour cron.
                  </p>
                  <p className="text-sm">
                    <Link href="/editions" className="underline hover:text-[var(--color-accent-blue)]">Past editions</Link>
                    {" · "}
                    <Link href="/edition/1" className="underline hover:text-[var(--color-accent-blue)]">Vol. 1</Link>
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar stories — columns 3, 4, 5 of the 5-col grid */}
            {second && (
              <div className="fe-broadsheet-col">
                <ArticleCard
                  headline={second.headline}
                  subheadline={second.subheadline}
                  slug={second.slug}
                  category={second.category}
                  imageUrl={second.imageUrl}
                  probabilityAtPublish={second.probabilityAtPublish}
                  currentProbability={second.currentProbability}
                  publishedAt={second.publishedAt?.toISOString()}
                  size="compact"
                  trendingDelta={trendingMap.get(second.marketId)?.delta ?? null}
                />
              </div>
            )}
            {third && (
              <div className="fe-broadsheet-col">
                <ArticleCard
                  headline={third.headline}
                  subheadline={third.subheadline}
                  slug={third.slug}
                  category={third.category}
                  imageUrl={third.imageUrl}
                  probabilityAtPublish={third.probabilityAtPublish}
                  currentProbability={third.currentProbability}
                  publishedAt={third.publishedAt?.toISOString()}
                  size="compact"
                  trendingDelta={trendingMap.get(third.marketId)?.delta ?? null}
                />
              </div>
            )}
            {fourth && (
              <div className="fe-broadsheet-col">
                <ArticleCard
                  headline={fourth.headline}
                  subheadline={fourth.subheadline}
                  slug={fourth.slug}
                  category={fourth.category}
                  imageUrl={fourth.imageUrl}
                  probabilityAtPublish={fourth.probabilityAtPublish}
                  currentProbability={fourth.currentProbability}
                  publishedAt={fourth.publishedAt?.toISOString()}
                  size="compact"
                  trendingDelta={trendingMap.get(fourth.marketId)?.delta ?? null}
                />
              </div>
            )}
          </div>
        </section>

        {/* V4 section rule — 1px ink hairline between hero grid and secondary sections */}
        <hr className="fe-v4-section-rule" />

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 pt-[var(--space-8)]">
          {(() => {
            const politicsArticles = rest.filter((a) => a.category === "politics").slice(0, 3);
            if (!politicsArticles.length) return null;
            return (
              <div className="md:col-span-1 lg:pr-[var(--space-6)] border-r-0 md:border-r border-[var(--color-rule)] p-4 md:p-5">
                <h2 className="section-title mb-4">Politics</h2>
                {politicsArticles.map((a) => (
                  <ArticleCard key={a.id} {...a} publishedAt={a.publishedAt?.toISOString()} size="compact" trendingDelta={trendingMap.get(a.marketId)?.delta ?? null} />
                ))}
              </div>
            );
          })()}
          {(() => {
            const cryptoArticles = rest.filter((a) => a.category === "crypto").slice(0, 3);
            if (!cryptoArticles.length) return null;
            return (
              <div className="md:col-span-1 lg:pr-[var(--space-6)] border-r-0 md:border-r border-[var(--color-rule)] p-4 md:p-5">
                <h2 className="section-title mb-4">Crypto</h2>
                {cryptoArticles.map((a) => (
                  <ArticleCard key={a.id} {...a} publishedAt={a.publishedAt?.toISOString()} size="compact" trendingDelta={trendingMap.get(a.marketId)?.delta ?? null} />
                ))}
              </div>
            );
          })()}
          <div className="md:col-span-2 lg:col-span-1 p-4 md:p-5 space-y-6">
            <MarketBriefs />
            <PlatformConfidence />
          </div>
        </section>

        {/* V4 section rule — 1px ink hairline before "More Stories" */}
        <hr className="fe-v4-section-rule" />

        <section className="pt-[var(--space-8)] mt-[var(--space-8)]" style={{ borderTop: "var(--border-double)" }}>
          <h2 className="section-title mb-5">
            More Stories
          </h2>
          <div className="mb-6 max-w-md mx-auto">
            <AdSlot />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rest.slice(0, 8).map((a) => (
              <ArticleCard key={a.id} {...a} publishedAt={a.publishedAt?.toISOString()} trendingDelta={trendingMap.get(a.marketId)?.delta ?? null} />
            ))}
          </div>
        </section>

        <div className="mt-[var(--space-9)]">
          <NewsletterSignup />
          <Classifieds />
        </div>
        <footer className="py-[var(--space-8)] text-center font-[family-name:var(--font-sub)]" style={{ borderTop: "var(--border-double)" }}>
          <p className="text-[var(--color-ink)] font-semibold text-base" style={{ fontFamily: "var(--font-display)" }}>
            The Future Express
          </p>
          <p className="text-sm text-[var(--color-ink-light)] mt-1 italic">
            Est. 2025 — Tomorrow&apos;s News, Today&apos;s Odds
          </p>
          {/* V4 brand-thesis line — per CMO review §2, this is the single line that
              should appear on every brand surface. */}
          <p className="fe-v4-tagline">
            —— Printed by a machine that has read more newspapers than you. ——
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-wider text-[var(--color-ink-faded)]">
            <Link href="/about" className="underline hover:text-[var(--color-accent-blue)] transition-colors">About</Link>
            <span className="mx-2" aria-hidden>·</span>
            <Link href="/transparency" className="underline hover:text-[var(--color-accent-blue)] transition-colors">Transparency</Link>
            <span className="mx-2" aria-hidden>·</span>
            <Link href="/editions" className="underline hover:text-[var(--color-accent-blue)] transition-colors">Past editions</Link>
            <span className="mx-2" aria-hidden>·</span>
            <Link href="/search" className="underline hover:text-[var(--color-accent-blue)] transition-colors">Search</Link>
            <span className="mx-2" aria-hidden>·</span>
            <Link href="/accuracy" className="underline hover:text-[var(--color-accent-blue)] transition-colors">Track Record</Link>
            <span className="mx-2" aria-hidden>·</span>
            <Link href="/methodology" className="underline hover:text-[var(--color-accent-blue)] transition-colors">Methodology</Link>
          </p>
        </footer>
      </main>
      <PushOptInPrompt />
    </div>
  );
}

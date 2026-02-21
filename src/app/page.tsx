import { Masthead } from "@/components/Masthead";
import { BreakingTicker } from "@/components/BreakingTicker";
import { SectionNav } from "@/components/SectionNav";
import { ArticleCard } from "@/components/ArticleCard";
import { MarketBriefs } from "@/components/MarketBriefs";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { Classifieds } from "@/components/Classifieds";
import { AdSlot } from "@/components/AdSlot";
import Link from "next/link";
import { db } from "@/lib/db";
import { articles, markets, editions, editionArticles } from "@/lib/db/schema";
import { desc, eq, asc, inArray } from "drizzle-orm";

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
  const latestEdition = await getLatestEdition();
  const editionArticlesList = latestEdition?.id
    ? await getArticlesForLatestEdition(latestEdition.id)
    : [];
  const list = editionArticlesList.length > 0 ? editionArticlesList : await getArticlesFallback();
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

  return (
    <div className="paper-texture min-h-screen">
      <Masthead
        latestEdition={mastheadEditionLabel}
        volumeNumber={latestEdition?.volumeNumber}
      />
      <BreakingTicker />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-4)] sm:px-[var(--space-5)] py-[var(--space-6)] sm:py-[var(--space-7)]">
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-0 pb-[var(--space-8)]" style={{ borderBottom: "var(--border-double)" }}>
          <div className="lg:col-span-3 lg:pr-[var(--space-6)] lg:border-r border-[var(--color-rule)]">
            {lead && (
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
              />
            )}
            {!lead && (
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
          <div className="hidden lg:block lg:pl-[var(--space-6)]">
            <div className="space-y-6">
              {second && (
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
                />
              )}
              {third && (
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
                />
              )}
              {fourth && (
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
                />
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 pt-[var(--space-8)]">
          <div className="md:col-span-1 lg:pr-[var(--space-6)] border-r-0 md:border-r border-[var(--color-rule)] p-4 md:p-5">
            <h2 className="section-title mb-4">
              Politics
            </h2>
            {rest
              .filter((a) => a.category === "politics")
              .slice(0, 3)
              .map((a) => (
                <ArticleCard key={a.id} {...a} publishedAt={a.publishedAt?.toISOString()} size="compact" />
              ))}
          </div>
          <div className="md:col-span-1 lg:pr-[var(--space-6)] border-r-0 md:border-r border-[var(--color-rule)] p-4 md:p-5">
            <h2 className="section-title mb-4">
              Crypto
            </h2>
            {rest
              .filter((a) => a.category === "crypto")
              .slice(0, 3)
              .map((a) => (
                <ArticleCard key={a.id} {...a} publishedAt={a.publishedAt?.toISOString()} size="compact" />
              ))}
          </div>
          <div className="md:col-span-2 lg:col-span-1 p-4 md:p-5">
            <MarketBriefs />
          </div>
        </section>

        <section className="pt-[var(--space-8)] mt-[var(--space-8)]" style={{ borderTop: "var(--border-double)" }}>
          <h2 className="section-title mb-5">
            More Stories
          </h2>
          <div className="mb-6 max-w-md mx-auto">
            <AdSlot />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rest.slice(0, 8).map((a) => (
              <ArticleCard key={a.id} {...a} publishedAt={a.publishedAt?.toISOString()} />
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
          <p className="mt-4 text-[11px] uppercase tracking-wider text-[var(--color-ink-faded)]">
            <Link href="/about" className="underline hover:text-[var(--color-accent-blue)] transition-colors">About</Link>
            <span className="mx-2" aria-hidden>·</span>
            <Link href="/editions" className="underline hover:text-[var(--color-accent-blue)] transition-colors">Past editions</Link>
            <span className="mx-2" aria-hidden>·</span>
            <Link href="/search" className="underline hover:text-[var(--color-accent-blue)] transition-colors">Search</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

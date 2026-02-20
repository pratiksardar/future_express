import { Masthead } from "@/components/Masthead";
import { SectionNav } from "@/components/SectionNav";
import { ArticleCard } from "@/components/ArticleCard";
import { MarketBriefs } from "@/components/MarketBriefs";
import { AdSlot } from "@/components/AdSlot";
import Link from "next/link";
import { db } from "@/lib/db";
import { articles, markets, editions, editionArticles } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/** Resolve edition by UUID or by volume number (e.g. "1", "0" → Vol. 1). */
async function getEditionByIdOrVolume(idOrVol: string) {
  const numeric = /^\d+$/.test(idOrVol);
  const volNum = numeric ? Math.max(1, parseInt(idOrVol, 10)) : null;

  if (volNum != null) {
    const [edition] = await db
      .select()
      .from(editions)
      .where(eq(editions.volumeNumber, volNum))
      .limit(1);
    return edition ?? null;
  }
  const [edition] = await db
    .select()
    .from(editions)
    .where(eq(editions.id, idOrVol))
    .limit(1);
  return edition ?? null;
}

async function getEditionWithArticles(editionId: string) {
  const edition = await getEditionByIdOrVolume(editionId);
  if (!edition) return null;
  const editionIdVal = edition.id;

  const eaList = await db
    .select({ articleId: editionArticles.articleId, position: editionArticles.position })
    .from(editionArticles)
    .where(eq(editionArticles.editionId, editionIdVal))
    .orderBy(asc(editionArticles.position));
  const ids = eaList.map((r) => r.articleId);
  if (ids.length === 0) return { edition, articles: [] };

  const rows = await db
    .select({
      id: articles.id,
      headline: articles.headline,
      subheadline: articles.subheadline,
      slug: articles.slug,
      category: articles.category,
      probabilityAtPublish: articles.probabilityAtPublish,
      publishedAt: articles.publishedAt,
      currentProbability: markets.currentProbability,
      volume24h: markets.volume24h,
    })
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .where(inArray(articles.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = eaList.map((ea) => byId.get(ea.articleId)).filter(Boolean) as typeof rows;
  return { edition, articles: ordered };
}

export default async function EditionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEditionWithArticles(id.trim());
  if (!data) notFound();

  const { edition, articles: list } = data;
  const [lead, second, third, fourth, ...rest] = list;
  const volLabel = edition.volumeNumber != null ? `Vol. ${edition.volumeNumber}` : "Edition";
  const dateLabel = edition.publishedAt
    ? new Date(edition.publishedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="paper-texture min-h-screen">
      <Masthead latestEdition={`${volLabel} · ${dateLabel}`} />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-4)] sm:px-[var(--space-5)] py-[var(--space-6)] sm:py-[var(--space-7)]">
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-[var(--color-ink-light)]">
          <Link href="/editions" className="underline hover:text-[var(--color-accent-blue)]">
            ← All editions
          </Link>
          <span aria-hidden>·</span>
          <span className="font-semibold text-[var(--color-ink)]">{volLabel}</span>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-0 pb-[var(--space-8)]" style={{ borderBottom: "var(--border-double)" }}>
          <div className="lg:col-span-3 lg:pr-[var(--space-6)] lg:border-r border-[var(--color-rule)]">
            {lead ? (
              <ArticleCard
                headline={lead.headline}
                subheadline={lead.subheadline}
                slug={lead.slug}
                category={lead.category}
                probabilityAtPublish={lead.probabilityAtPublish}
                currentProbability={lead.currentProbability}
                publishedAt={lead.publishedAt?.toISOString()}
                volume24h={lead.volume24h}
                size="hero"
              />
            ) : (
              <div className="py-12 text-center text-[var(--color-ink-light)] font-[family-name:var(--font-sub)] italic">
                No stories in this edition.
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
            <h2 className="section-title mb-4">Politics</h2>
            {rest
              .filter((a) => a.category === "politics")
              .slice(0, 3)
              .map((a) => (
                <ArticleCard key={a.id} {...a} publishedAt={a.publishedAt?.toISOString()} size="compact" />
              ))}
          </div>
          <div className="md:col-span-1 lg:pr-[var(--space-6)] border-r-0 md:border-r border-[var(--color-rule)] p-4 md:p-5">
            <h2 className="section-title mb-4">Crypto</h2>
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
          <h2 className="section-title mb-5">More from this edition</h2>
          <div className="mb-6 max-w-md mx-auto">
            <AdSlot />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rest.slice(0, 8).map((a) => (
              <ArticleCard key={a.id} {...a} publishedAt={a.publishedAt?.toISOString()} />
            ))}
          </div>
        </section>

        <footer className="py-[var(--space-8)] text-center font-[family-name:var(--font-sub)]" style={{ borderTop: "var(--border-double)" }}>
          <p className="text-sm">
            <Link href="/editions" className="underline hover:text-[var(--color-accent-blue)]">
              Browse all editions
            </Link>
            <span className="mx-2" aria-hidden>·</span>
            <Link href="/" className="underline hover:text-[var(--color-accent-blue)]">
              Latest
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Masthead } from "@/components/Masthead";
import { SectionNav } from "@/components/SectionNav";
import { ArticleCard } from "@/components/ArticleCard";

const VALID_CATEGORIES = [
  "politics",
  "economy",
  "crypto",
  "sports",
  "science",
  "entertainment",
  "world",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economy: "Economy",
  crypto: "Crypto",
  sports: "Sports",
  science: "Science",
  entertainment: "Entertainment",
  world: "World",
};

export default async function SectionPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    notFound();
  }

  const list = await db
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
    .where(eq(articles.category, category as (typeof VALID_CATEGORIES)[number]))
    .orderBy(desc(articles.publishedAt))
    .limit(24);

  const [featured, ...rest] = list;

  return (
    <div className="paper-texture min-h-screen">
      <Masthead />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-5)] py-[var(--space-6)]">
        <header
          className="pb-6 border-b-4 mb-8"
          style={{ borderColor: "var(--color-accent-blue)" }}
        >
          <h1
            className="text-3xl font-black text-[var(--color-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {CATEGORY_LABELS[category] ?? category}
          </h1>
          <p className="text-[var(--color-ink-light)] italic mt-2 font-[family-name:var(--font-sub)]">
            Prediction stories in this section.
          </p>
        </header>

        {featured && (
          <section className="mb-10">
            <ArticleCard
              {...featured}
              publishedAt={featured.publishedAt?.toISOString()}
              size="hero"
            />
          </section>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(featured ? rest : list).slice(0, 12).map((a) => (
            <ArticleCard
              key={a.id}
              {...a}
              publishedAt={a.publishedAt?.toISOString()}
            />
          ))}
        </section>

        <footer className="mt-12 py-6 text-center text-sm text-[var(--color-ink-light)]">
          <a href="/" className="hover:text-[var(--color-accent-blue)]">
            ← Back to Front Page
          </a>
        </footer>
      </main>
    </div>
  );
}

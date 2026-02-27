import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq, desc, ne } from "drizzle-orm";
import { Masthead } from "@/components/Masthead";
import { SectionNav } from "@/components/SectionNav";
import { UniswapSwapWidget } from "@/components/UniswapSwapWidget";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rows = await db
    .select({ headline: articles.headline, subheadline: articles.subheadline, imageUrl: articles.imageUrl })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return { title: "Not Found" };
  const title = `${row.headline} | The Future Express`;
  const description = (row.subheadline ?? row.headline).slice(0, 160);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://thefutureexpress.com";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${base}/article/${slug}`,
      images: row.imageUrl ? [{ url: `${base}${row.imageUrl}` }] : [],
    },
    twitter: { card: "summary_large_image", title, description, images: row.imageUrl ? [`${base}${row.imageUrl}`] : undefined },
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
      "url": process.env.NEXT_PUBLIC_APP_URL || "https://future-express.vercel.app"
    }],
    "publisher": {
      "@type": "Organization",
      "name": "The Future Express",
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.NEXT_PUBLIC_APP_URL || "https://future-express.vercel.app"}/favicon.ico`
      }
    },
    // Custom prop commonly mapped to by AI scrapers: Let them read the raw body fast!
    "articleBody": article.body
  };

  return (
    <div className="paper-texture min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
        <p className="text-sm italic text-[var(--color-ink-light)] font-[family-name:var(--font-sub)] mb-6">
          By The Future Express Newsroom ·{" "}
          {article.publishedAt?.toLocaleDateString?.() ?? new Date(article.publishedAt).toLocaleDateString()} · 5 min read
        </p>

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
            <UniswapSwapWidget />
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 p-4 border-2 border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)]">
              <h4 className="section-title mb-3">
                The Odds
              </h4>
              <div
                className="text-4xl font-bold font-[family-name:var(--font-data)] mb-1"
                style={{ color: probColor(prob) }}
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
              <p className="text-[10px] text-[var(--color-ink-faded)] mb-2">
                We may earn a commission if you sign up or trade.
              </p>
              <Link
                href={process.env.NEXT_PUBLIC_POLYMARKET_AFFILIATE_URL ?? "https://polymarket.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-[family-name:var(--font-ui)] font-bold uppercase tracking-wide text-[var(--color-accent-blue)] hover:underline"
              >
                Trade it on Polymarket →
              </Link>
              {market.kalshiTicker && (
                <Link
                  href={process.env.NEXT_PUBLIC_KALSHI_AFFILIATE_URL ?? "https://kalshi.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 ml-4 inline-block text-sm font-[family-name:var(--font-ui)] font-bold uppercase tracking-wide text-[var(--color-accent-blue)] hover:underline"
                >
                  Trade on Kalshi →
                </Link>
              )}
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
          <Link href="/" className="hover:text-[var(--color-accent-blue)]">← Back to Front Page</Link>
        </footer>
      </main>
    </div>
  );
}

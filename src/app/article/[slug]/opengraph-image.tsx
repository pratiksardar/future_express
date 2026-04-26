/**
 * Dynamic OG image for article pages.
 * Reuses the existing EditorialCard playcard component to generate
 * beautiful retro newspaper share cards for every article link.
 */
import { db } from "@/lib/db";
import { articles, markets, editionArticles, editions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generatePlaycardResponse } from "@/lib/articles/playcard";
import type { PlaycardPayload } from "@/lib/articles/playcard";

export const runtime = "nodejs";
export const contentType = "image/png";
// Universal 1.91:1 ratio — renders without center-crop on Twitter, LinkedIn,
// Facebook, WhatsApp, Slack, iMessage. (Was 1200x675 16:9, which got cropped.)
export const size = { width: 1200, height: 630 };
export const alt = "The Future Express — Article Preview";
// Articles are immutable per slug → cache the rendered card aggressively so
// social-platform crawlers (Twitterbot, Slackbot, LinkedInBot, Discordbot) and
// WhatsApp/iMessage proxies don't re-trigger the DB join on every unfurl.
export const revalidate = 86400; // 24h

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const rows = await db
    .select({
      headline: articles.headline,
      subheadline: articles.subheadline,
      body: articles.body,
      slug: articles.slug,
      category: articles.category,
      publishedAt: articles.publishedAt,
      probability: markets.currentProbability,
      volumeNumber: editions.volumeNumber,
      issueNumber: editionArticles.position,
    })
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .leftJoin(editionArticles, eq(articles.id, editionArticles.articleId))
    .leftJoin(editions, eq(editionArticles.editionId, editions.id))
    .where(eq(articles.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) {
    // Fallback: return a generic branded image. Cache this only briefly so a
    // missing-slug 404 doesn't get pinned in CDN/social caches for 24h.
    const { ImageResponse } = await import("next/og");
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f6f3ec",
            color: "#1d1f23",
            fontFamily: "Georgia, serif",
            fontSize: 64,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          THE FUTURE EXPRESS
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  }

  const payload: PlaycardPayload = {
    headline: row.headline,
    subheadline: row.subheadline,
    bodyExcerpt: row.body?.slice(0, 300) ?? null,
    slug: row.slug,
    category: row.category,
    publishedAt: new Date(row.publishedAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    probability: row.probability ? Number(row.probability) : null,
    volumeNumber: row.volumeNumber ?? 1,
    issueNumber: row.issueNumber ?? 1,
    format: "twitter",
  };

  return generatePlaycardResponse(payload);
}

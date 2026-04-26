/**
 * GET /api/playcard/[slug]
 *
 * On-demand playcard PNG generator for sharing/saving.
 * - ?format=tiktok|twitter|instagram|portrait (default: tiktok)
 * - Sets Content-Disposition: attachment so browsers prompt a download.
 * - CDN-cacheable for a day; stale-while-revalidate for a week.
 *
 * This is the canonical endpoint the ShareBar "Save Card" button hits to fetch
 * the PNG (so we can hand it to navigator.share / native iOS Save to Photos).
 */
import { db } from "@/lib/db";
import { articles, markets, editionArticles, editions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generatePlaycardResponse, type PlaycardFormat, type PlaycardPayload } from "@/lib/articles/playcard";

export const runtime = "nodejs";

const ALLOWED_FORMATS: ReadonlySet<PlaycardFormat> = new Set([
  "twitter",
  "instagram",
  "portrait",
  "tiktok",
]);

function parseFormat(value: string | null): PlaycardFormat {
  if (value && (ALLOWED_FORMATS as Set<string>).has(value)) {
    return value as PlaycardFormat;
  }
  return "tiktok";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const format = parseFormat(searchParams.get("format"));

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
    return new Response("Not found", { status: 404 });
  }

  const payload: PlaycardPayload = {
    headline: row.headline,
    subheadline: row.subheadline,
    bodyExcerpt: row.body?.slice(0, 360) ?? null,
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
    format,
  };

  const response = await generatePlaycardResponse(payload);
  // Re-wrap so we can layer on download + cache headers without breaking the
  // PNG body produced by next/og's ImageResponse.
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Disposition",
    `attachment; filename="future-express-${slug}-${format}.png"`,
  );
  headers.set(
    "Cache-Control",
    "public, max-age=86400, stale-while-revalidate=604800",
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

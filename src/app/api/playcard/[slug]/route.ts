/**
 * GET /api/playcard/[slug]
 *
 * On-demand playcard PNG generator for sharing/saving.
 * - ?format=tiktok|twitter|instagram|portrait (default: tiktok)
 * - ?variant=default|called-it           (default: default)
 *   When `called-it`, the gold "I Called It" brag-share variant is rendered.
 *   Optional query params populate the user-specific stamp:
 *     ?predicted=72        — the user's probability at prediction (0-100)
 *     ?predictedAt=Apr+12  — display string for "PREDICTED …"
 *     ?resolvedAt=Apr+25   — display string for "RESOLVED …"
 * - Sets Content-Disposition: attachment so browsers prompt a download.
 * - CDN-cacheable for a day; stale-while-revalidate for a week (default
 *   variant only — called-it cards are user-personalised so we don't share-
 *   cache them across users).
 *
 * This is the canonical endpoint the ShareBar "Save Card" button hits to fetch
 * the PNG (so we can hand it to navigator.share / native iOS Save to Photos).
 */
import { db } from "@/lib/db";
import { articles, markets, editionArticles, editions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  generatePlaycardResponse,
  type PlaycardFormat,
  type PlaycardPayload,
  type PlaycardVariant,
} from "@/lib/articles/playcard";

export const runtime = "nodejs";

const ALLOWED_FORMATS: ReadonlySet<PlaycardFormat> = new Set([
  "twitter",
  "instagram",
  "portrait",
  "tiktok",
]);

const ALLOWED_VARIANTS: ReadonlySet<PlaycardVariant> = new Set([
  "default",
  "called-it",
]);

function parseFormat(value: string | null): PlaycardFormat {
  if (value && (ALLOWED_FORMATS as Set<string>).has(value)) {
    return value as PlaycardFormat;
  }
  return "tiktok";
}

function parseVariant(value: string | null): PlaycardVariant {
  if (value && (ALLOWED_VARIANTS as Set<string>).has(value)) {
    return value as PlaycardVariant;
  }
  return "default";
}

function parseProbabilityNum(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const format = parseFormat(searchParams.get("format"));
  const variant = parseVariant(searchParams.get("variant"));
  const predictedQuery = parseProbabilityNum(searchParams.get("predicted"));
  const predictedAtQuery = searchParams.get("predictedAt");
  const resolvedAtQuery = searchParams.get("resolvedAt");

  const rows = await db
    .select({
      headline: articles.headline,
      subheadline: articles.subheadline,
      body: articles.body,
      slug: articles.slug,
      category: articles.category,
      publishedAt: articles.publishedAt,
      probability: markets.currentProbability,
      probabilityAtPublish: articles.probabilityAtPublish,
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

  // Reasonable defaults for the called-it variant: predicted = published-prob,
  // dates = publishedAt and now, all overridable by the URL.
  const publishedAtCompact = new Date(row.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const todayCompact = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

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
    variant,
    predictedProbability:
      variant === "called-it"
        ? predictedQuery ??
          (row.probabilityAtPublish ? Number(row.probabilityAtPublish) : null)
        : null,
    predictedAt: variant === "called-it" ? predictedAtQuery ?? publishedAtCompact : null,
    resolvedAt: variant === "called-it" ? resolvedAtQuery ?? todayCompact : null,
  };

  const response = await generatePlaycardResponse(payload);
  // Re-wrap so we can layer on download + cache headers without breaking the
  // PNG body produced by next/og's ImageResponse.
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Disposition",
    `attachment; filename="future-express-${slug}-${format}${variant === "called-it" ? "-called-it" : ""}.png"`,
  );
  // Don't share-cache called-it cards (per-user predicted%/dates).
  headers.set(
    "Cache-Control",
    variant === "called-it"
      ? "private, no-store"
      : "public, max-age=86400, stale-while-revalidate=604800",
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

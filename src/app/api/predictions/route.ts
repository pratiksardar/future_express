/**
 * POST /api/predictions
 *
 * Records an ad-hoc directional prediction on a market. The session id is
 * read from the `x-session-id` header (set client-side from `tfe_session_id`
 * localStorage). Idempotent on (sessionId, marketId) — re-submission updates
 * the existing row's direction and probability.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { predictions, markets, articles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type PostBody = {
  marketId?: unknown;
  direction?: unknown;
  probabilityAtPrediction?: unknown;
  articleId?: unknown;
};

function readSessionId(req: NextRequest): string | null {
  const id = req.headers.get("x-session-id");
  if (!id || typeof id !== "string") return null;
  if (id.length < 8 || id.length > 128) return null;
  return id;
}

export async function POST(req: NextRequest) {
  const sessionId = readSessionId(req);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing x-session-id header" },
      { status: 400 },
    );
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const marketId = typeof body.marketId === "string" ? body.marketId : null;
  const direction =
    body.direction === "up" || body.direction === "down" ? body.direction : null;
  const probabilityAtPrediction =
    typeof body.probabilityAtPrediction === "number" &&
    Number.isFinite(body.probabilityAtPrediction)
      ? Math.max(0, Math.min(100, body.probabilityAtPrediction))
      : null;
  const articleId = typeof body.articleId === "string" ? body.articleId : null;

  if (!marketId || !direction) {
    return NextResponse.json(
      { error: "marketId and direction ('up' | 'down') are required" },
      { status: 400 },
    );
  }

  // Confirm the market exists (cheap guard against typos / stale UI state).
  const [marketRow] = await db
    .select({ id: markets.id })
    .from(markets)
    .where(eq(markets.id, marketId))
    .limit(1);
  if (!marketRow) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  // Resolve articleId from a slug if the caller passed one (the WhatIf
  // surface knows the slug, not the article uuid).
  let resolvedArticleId: string | null = articleId;
  if (resolvedArticleId) {
    const [a] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, resolvedArticleId))
      .limit(1);
    if (!a) resolvedArticleId = null;
  }

  const [inserted] = await db
    .insert(predictions)
    .values({
      sessionId,
      marketId,
      articleId: resolvedArticleId,
      direction,
      probabilityAtPrediction:
        probabilityAtPrediction != null ? String(probabilityAtPrediction) : null,
    })
    .onConflictDoUpdate({
      target: [predictions.sessionId, predictions.marketId],
      set: {
        direction,
        probabilityAtPrediction:
          probabilityAtPrediction != null ? String(probabilityAtPrediction) : null,
        articleId: resolvedArticleId,
      },
    })
    .returning({
      id: predictions.id,
      direction: predictions.direction,
      probabilityAtPrediction: predictions.probabilityAtPrediction,
      predictedAt: predictions.predictedAt,
    });

  return NextResponse.json({
    id: inserted.id,
    direction: inserted.direction,
    probabilityAtPrediction:
      inserted.probabilityAtPrediction != null
        ? Number(inserted.probabilityAtPrediction)
        : null,
    predictedAt: inserted.predictedAt,
  });
}

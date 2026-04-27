/**
 * GET /api/predictions/resolved
 *
 * Returns the calling session's recently resolved correct predictions that
 * have NOT yet been "I Called It"-shared. Capped at 5; newest first. Powers
 * the homepage `<CalledItBanner />`.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnsharedCalledItPredictions } from "@/lib/predictions/resolve";

function readSessionId(req: NextRequest): string | null {
  // Prefer the explicit header; fall back to the ?session= query (handy for
  // testing via gstack browse, where setting a header is awkward).
  const headerId = req.headers.get("x-session-id");
  if (headerId && headerId.length >= 8 && headerId.length <= 128) {
    return headerId;
  }
  const url = new URL(req.url);
  const queryId = url.searchParams.get("session");
  if (queryId && queryId.length >= 8 && queryId.length <= 128) return queryId;
  return null;
}

export async function GET(req: NextRequest) {
  const sessionId = readSessionId(req);
  if (!sessionId) {
    return NextResponse.json({ predictions: [] });
  }

  const rows = await getUnsharedCalledItPredictions(sessionId, 5);

  return NextResponse.json(
    {
      predictions: rows.map((r) => ({
        id: r.predictionId,
        direction: r.direction,
        probabilityAtPrediction: r.probabilityAtPrediction,
        predictedAt: r.predictedAt.toISOString(),
        resolvedAt: r.resolvedAt.toISOString(),
        marketId: r.marketId,
        marketTitle: r.marketTitle,
        articleSlug: r.articleSlug,
        articleHeadline: r.articleHeadline,
      })),
    },
    {
      headers: {
        // Per-session — don't let CDN edges share these between users.
        "Cache-Control": "private, no-store",
      },
    },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getStreakForSession } from "@/lib/challenge/streak";

export const dynamic = "force-dynamic";

/**
 * GET /api/challenge/streak?sessionId=...
 *
 * Returns the current StreakState for the given `tfe_session_id`. The
 * sessionId is taken from either the `sessionId` query param OR the
 * `x-tfe-session-id` request header (the client uses the query param).
 *
 * No auth — identity is the localStorage session id (LAUNCH.md v1).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId =
      url.searchParams.get("sessionId") ??
      req.headers.get("x-tfe-session-id") ??
      undefined;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const state = await getStreakForSession(sessionId);
    return NextResponse.json(state, {
      headers: {
        // Per-session, mutable on every play. Avoid CDN caching.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[challenge streak GET]", err);
    return NextResponse.json(
      { error: "Failed to load streak" },
      { status: 500 }
    );
  }
}

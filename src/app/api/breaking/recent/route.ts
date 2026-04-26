import { NextResponse } from "next/server";
import { getRecentAlerts } from "@/lib/breaking/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/breaking/recent
 *
 * Returns the latest 10 breaking-news alerts (newest first), built by the
 * `detectBreaking` Inngest cron. Polled by `<BreakingNewsAlert/>` every 60s.
 *
 * Response: { alerts: BreakingAlert[] }
 *
 * BreakingAlert {
 *   marketId, articleId, slug, headline,
 *   probabilityBefore, probabilityNow, delta, alertedAt
 * }
 */
export async function GET(): Promise<NextResponse> {
  try {
    const alerts = await getRecentAlerts(10);
    return NextResponse.json(
      { alerts },
      {
        headers: {
          // 30s edge cache is fine — banner polls every 60s and 30s skew is
          // acceptable for a "live energy" metric. Stale-while-revalidate so
          // the next fetch updates the cache without blocking the user.
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    // Never let banner errors crash the page — return empty alerts.
    // eslint-disable-next-line no-console
    console.error("[breaking/recent] failed:", err);
    return NextResponse.json({ alerts: [] }, { status: 200 });
  }
}

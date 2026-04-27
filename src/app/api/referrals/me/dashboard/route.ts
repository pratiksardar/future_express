/**
 * GET /api/referrals/me/dashboard
 *
 * Auth: We don't have a real session/auth system on the public site (LAUNCH.md
 * Phase 1-3 explicitly defers auth). For the referral dashboard we identify
 * the subscriber via their per-recipient `unsubscribeToken` — the same token
 * the digest emails embed in unsubscribe links. The token is a UUID, so it's
 * unguessable, and possession of the token already grants the user power
 * over their subscription, so we treat it as a proof-of-ownership for the
 * read-only dashboard too.
 *
 * Query params:
 *   - `token` (required) — subscriber's unsubscribe_token UUID.
 *
 * Response: 200 with the shape spec'd in LAUNCH.md Phase 4. 404 when the
 * token is unknown or the subscriber is inactive.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAppUrl } from "@/lib/url";
import { getOrCreateReferralCode } from "@/lib/referral/code";
import {
  buildShareUrl,
  loadRecentReferrals,
  loadReferralStats,
} from "@/lib/referral/funnel";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !UUID_RE.test(token)) {
    return NextResponse.json(
      { error: "A valid `token` query parameter is required." },
      { status: 400 }
    );
  }

  const [subscriber] = await db
    .select({
      id: subscribers.id,
      email: subscribers.email,
      status: subscribers.status,
      referralCode: subscribers.referralCode,
    })
    .from(subscribers)
    .where(eq(subscribers.unsubscribeToken, token))
    .limit(1);

  if (!subscriber) {
    return NextResponse.json(
      { error: "Subscriber not found." },
      { status: 404 }
    );
  }

  if (subscriber.status !== "active") {
    return NextResponse.json(
      { error: "Subscriber is not active." },
      { status: 410 }
    );
  }

  // Lazily mint a referral code if the row predates the referral system.
  const code = subscriber.referralCode ?? (await getOrCreateReferralCode(subscriber.id));

  const baseUrl = getAppUrl();
  const shareUrl = buildShareUrl(baseUrl, code);

  const [stats, recentReferrals] = await Promise.all([
    loadReferralStats(subscriber.id),
    loadRecentReferrals(subscriber.id, 10),
  ]);

  return NextResponse.json(
    {
      myCode: code,
      shareUrl,
      stats,
      recentReferrals: recentReferrals.map((r) => ({
        stage: r.stage,
        clickedAt: r.clickedAt.toISOString(),
        signedUpAt: r.signedUpAt?.toISOString() ?? null,
        activatedAt: r.activatedAt?.toISOString() ?? null,
      })),
    },
    {
      headers: {
        // Per-user state — never cache.
        "Cache-Control": "private, no-store",
      },
    }
  );
}

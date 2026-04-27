/**
 * POST /api/referrals/track
 *
 * Body: { code: string, sessionId: string, utm?: UtmTags }
 * Records a click against the supplied referral code. Idempotent on
 * (code, sessionId) — the unique constraint on `referrals` ensures the same
 * visitor session can't double-count clicks for the same code.
 *
 * Response shape:
 *   201 { ok: true, outcome: "created" | "deduped", referralId: string }
 *   400 { error: "..." } on bad payload
 *   404 { error: "Unknown referral code" } on shape-valid but not-found code
 */
import { NextRequest, NextResponse } from "next/server";
import {
  findReferrerByCode,
  hashIp,
  recordClick,
  type UtmTags,
} from "@/lib/referral/funnel";

interface TrackBody {
  code?: unknown;
  sessionId?: unknown;
  utm?: unknown;
}

function parseUtm(input: unknown): UtmTags {
  if (!input || typeof input !== "object") return {};
  const obj = input as Record<string, unknown>;
  const pick = (k: string): string | null =>
    typeof obj[k] === "string" && (obj[k] as string).length > 0
      ? (obj[k] as string).slice(0, 128)
      : null;
  return {
    source: pick("source"),
    medium: pick("medium"),
    campaign: pick("campaign"),
  };
}

function clientIpFrom(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return null;
}

export async function POST(req: NextRequest) {
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.code !== "string" || body.code.length === 0) {
    return NextResponse.json(
      { error: "`code` is required." },
      { status: 400 }
    );
  }
  if (typeof body.sessionId !== "string" || body.sessionId.length === 0) {
    return NextResponse.json(
      { error: "`sessionId` is required." },
      { status: 400 }
    );
  }

  const referrer = await findReferrerByCode(body.code);
  if (!referrer) {
    return NextResponse.json(
      { error: "Unknown referral code." },
      { status: 404 }
    );
  }

  // Cap sessionId length to keep the unique constraint sane.
  const sessionId = body.sessionId.slice(0, 128);
  const utm = parseUtm(body.utm);

  const userAgent = req.headers.get("user-agent")?.slice(0, 256) ?? null;
  const ipHash = hashIp(clientIpFrom(req));

  try {
    const result = await recordClick({
      referrerSubscriberId: referrer.id,
      clickSessionId: sessionId,
      utm,
      userAgent,
      ipHash,
    });

    return NextResponse.json(
      { ok: true, outcome: result.outcome, referralId: result.referralId },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/referrals/track] failed", err);
    return NextResponse.json(
      { error: "Failed to record click." },
      { status: 500 }
    );
  }
}

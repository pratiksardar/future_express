import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { presenceKey, currentMinute } from "@/lib/presence/keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HeartbeatBody = {
  articleSlug?: unknown;
  sessionId?: unknown;
};

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,127}$/i;
const SESSION_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

/**
 * POST /api/presence/heartbeat
 * Body: { articleSlug, sessionId }
 *
 * Pings the slug's HyperLogLog bucket for the current minute. Client calls
 * this every 30s. We TTL each bucket to 120s — at any given read, "current"
 * and "previous" are both still alive, giving us a 2-minute sliding window
 * without writing to two keys per heartbeat.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: HeartbeatBody;
  try {
    body = (await req.json()) as HeartbeatBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const slug = typeof body.articleSlug === "string" ? body.articleSlug : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }
  if (!SESSION_REGEX.test(sessionId)) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  }

  const redis = getRedis();
  const minute = currentMinute();
  const key = presenceKey(slug, minute);

  await redis.pfadd(key, sessionId);
  // 120s ensures the bucket survives long enough to be the "previous" minute
  // when the next minute starts. Refreshed on each heartbeat — cheap and safe.
  await redis.expire(key, 120);

  return NextResponse.json({ ok: true });
}

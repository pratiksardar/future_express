import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { presenceKey, currentMinute } from "@/lib/presence/keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,127}$/i;

/**
 * GET /api/presence/[slug]
 * Returns: { readers: number }
 *
 * Reads the current minute + previous minute HLL buckets and sums their
 * approximate counts. This sliding 2-minute window gives a stable count
 * (clients heartbeat every 30s) and avoids the "1 -> 0 -> 1" flicker at
 * minute boundaries.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json({ readers: 0, error: "invalid_slug" }, { status: 400 });
  }

  const redis = getRedis();
  const minute = currentMinute();
  const [curr, prev] = await Promise.all([
    redis.pfcount(presenceKey(slug, minute)),
    redis.pfcount(presenceKey(slug, minute - 1)),
  ]);

  // Sum gives a good "readers in last 2 min" approximation. A session active
  // across both minutes is counted twice — tolerable for a vibey UI metric.
  const readers = curr + prev;
  return NextResponse.json(
    { readers },
    {
      headers: {
        // Don't let CDNs cache live counts.
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

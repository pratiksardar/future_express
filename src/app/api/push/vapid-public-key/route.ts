/**
 * GET /api/push/vapid-public-key
 *
 * Returns the VAPID public key for clients to use when subscribing.
 * Optional — clients can also read `NEXT_PUBLIC_VAPID_PUBLIC_KEY` directly
 * from the bundler. This endpoint exists so that swapping keys without a
 * redeploy is possible (and keeps a single source of truth on the server).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
  if (!key) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json({ key });
}

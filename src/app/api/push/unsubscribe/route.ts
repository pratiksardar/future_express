/**
 * POST /api/push/unsubscribe
 *
 * Body: { endpoint: string }
 *
 * Removes the row keyed by `endpoint`. Always returns 200 even if the row
 * didn't exist (idempotent). Bad request only when `endpoint` is missing
 * or non-string.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { endpoint } = (body ?? {}) as { endpoint?: unknown };
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  try {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/push/unsubscribe] delete failed:", err);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}

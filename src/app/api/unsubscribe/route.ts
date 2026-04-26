/**
 * POST /api/unsubscribe
 *
 * Body: { token: string }   // unsubscribe_token from the subscribers row
 *
 * Marks the matching subscriber as `unsubscribed`. Returns 200 even when the
 * token is unknown (don't leak which tokens are valid).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token =
    body && typeof body === "object" && "token" in body
      ? (body as { token: unknown }).token
      : null;

  if (typeof token !== "string" || !UUID_RE.test(token)) {
    return NextResponse.json(
      { error: "Invalid unsubscribe token." },
      { status: 400 }
    );
  }

  try {
    await db
      .update(subscribers)
      .set({ status: "unsubscribed" })
      .where(eq(subscribers.unsubscribeToken, token));

    // Always 200 — don't disclose token validity.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/unsubscribe]", err);
    return NextResponse.json(
      { error: "Failed to unsubscribe." },
      { status: 500 }
    );
  }
}

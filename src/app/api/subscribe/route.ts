/**
 * POST /api/subscribe
 *
 * Body: { email: string, timezone?: string, preferredSendHour?: number }
 *
 * Creates an active subscriber row. If the email already exists and is
 * `active`, returns 200 with `existing: true` (idempotent — re-subscribing
 * shouldn't fail). If the email exists but was `unsubscribed`, we re-activate
 * it and refresh the timezone (user changed their mind).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidIanaTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, timezone, preferredSendHour } = (body ?? {}) as {
    email?: unknown;
    timezone?: unknown;
    preferredSendHour?: unknown;
  };

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  let tz = "UTC";
  if (typeof timezone === "string" && timezone.length > 0) {
    if (!isValidIanaTimezone(timezone)) {
      return NextResponse.json(
        { error: "Invalid timezone." },
        { status: 400 }
      );
    }
    tz = timezone;
  }

  let hour = 7;
  if (typeof preferredSendHour === "number") {
    if (
      !Number.isInteger(preferredSendHour) ||
      preferredSendHour < 0 ||
      preferredSendHour > 23
    ) {
      return NextResponse.json(
        { error: "preferredSendHour must be an integer 0–23." },
        { status: 400 }
      );
    }
    hour = preferredSendHour;
  }

  try {
    const [existing] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, normalizedEmail))
      .limit(1);

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json({ ok: true, existing: true });
      }
      // Re-activate (handles unsubscribed and bounced flips back)
      await db
        .update(subscribers)
        .set({ status: "active", timezone: tz, preferredSendHour: hour })
        .where(eq(subscribers.id, existing.id));
      return NextResponse.json({ ok: true, reactivated: true });
    }

    await db.insert(subscribers).values({
      email: normalizedEmail,
      timezone: tz,
      preferredSendHour: hour,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/subscribe]", err);
    return NextResponse.json(
      { error: "Failed to subscribe." },
      { status: 500 }
    );
  }
}

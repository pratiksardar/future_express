/**
 * POST /api/subscribe
 *
 * Body: {
 *   email: string,
 *   timezone?: string,
 *   preferredSendHour?: number,
 *   referredByCode?: string,    // optional — auto-filled from `tfe_ref` cookie
 *   sessionId?: string,         // optional — used to match a prior click
 * }
 *
 * Creates an active subscriber row. If the email already exists and is
 * `active`, returns 200 with `existing: true` (idempotent — re-subscribing
 * shouldn't fail). If the email exists but was `unsubscribed`, we re-activate
 * it and refresh the timezone (user changed their mind).
 *
 * Referral attribution:
 *   - Reads `referredByCode` from the JSON body, falling back to the
 *     `tfe_ref` cookie (set by `src/middleware.ts` when a visitor lands on
 *     `/?ref=<code>`).
 *   - Reads `sessionId` from the JSON body, falling back to the
 *     `tfe_session_id` cookie if the client set it (we don't currently set
 *     that cookie server-side).
 *   - On a fresh signup we mint a referral code, fire a welcome email, and
 *     attribute the signup against the supplied code.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateReferralCode } from "@/lib/referral/code";
import {
  attributeSignup,
  findReferrerByCode,
  hashIp,
} from "@/lib/referral/funnel";
import { sendWelcomeEmail } from "@/lib/email/send";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidIanaTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function clientIpFrom(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    email,
    timezone,
    preferredSendHour,
    referredByCode: bodyReferredByCode,
    sessionId: bodySessionId,
  } = (body ?? {}) as {
    email?: unknown;
    timezone?: unknown;
    preferredSendHour?: unknown;
    referredByCode?: unknown;
    sessionId?: unknown;
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

  // ── Resolve referral attribution inputs ────────────────────────────────
  const cookieReferredByCode = req.cookies.get("tfe_ref")?.value ?? null;
  const referredByCodeRaw =
    typeof bodyReferredByCode === "string" && bodyReferredByCode.length > 0
      ? bodyReferredByCode
      : cookieReferredByCode;

  const cookieSessionId = req.cookies.get("tfe_session_id")?.value ?? null;
  const sessionId =
    typeof bodySessionId === "string" && bodySessionId.length > 0
      ? bodySessionId.slice(0, 128)
      : cookieSessionId?.slice(0, 128) ?? null;

  // Look up the referrer up-front so we can return a useful error on bad codes
  // without polluting the subscribers row.
  const referrer = referredByCodeRaw
    ? await findReferrerByCode(referredByCodeRaw)
    : null;

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
      // Re-activate (handles unsubscribed and bounced flips back). We do NOT
      // overwrite an existing referredByCode — first-touch attribution wins.
      await db
        .update(subscribers)
        .set({ status: "active", timezone: tz, preferredSendHour: hour })
        .where(eq(subscribers.id, existing.id));
      return NextResponse.json({ ok: true, reactivated: true });
    }

    const [created] = await db
      .insert(subscribers)
      .values({
        email: normalizedEmail,
        timezone: tz,
        preferredSendHour: hour,
        referredByCode: referrer ? referrer.referralCode : null,
      })
      .returning({
        id: subscribers.id,
        email: subscribers.email,
        unsubscribeToken: subscribers.unsubscribeToken,
        timezone: subscribers.timezone,
      });

    // Mint a referral code for the new subscriber so the welcome email and
    // dashboard have something to render on first visit.
    const myCode = await getOrCreateReferralCode(created.id);

    // Attribute against the referrer, if any.
    if (referrer) {
      try {
        await attributeSignup({
          referrerSubscriberId: referrer.id,
          referredSubscriberId: created.id,
          referredEmail: created.email,
          clickSessionId: sessionId,
          userAgent: req.headers.get("user-agent")?.slice(0, 256) ?? null,
          ipHash: hashIp(clientIpFrom(req)),
        });
      } catch (err) {
        // Attribution failure must NOT block signup — log and move on.
        console.error("[api/subscribe] referral attribution failed", err);
      }
    }

    // Fire the welcome email (non-blocking on error).
    try {
      await sendWelcomeEmail({
        subscriberId: created.id,
        email: created.email,
        unsubscribeToken: created.unsubscribeToken,
        referralCode: myCode,
        timezone: created.timezone,
      });
    } catch (err) {
      console.error("[api/subscribe] welcome email failed", err);
    }

    return NextResponse.json({
      ok: true,
      referralCode: myCode,
      attributed: Boolean(referrer),
    });
  } catch (err) {
    console.error("[api/subscribe]", err);
    return NextResponse.json(
      { error: "Failed to subscribe." },
      { status: 500 }
    );
  }
}

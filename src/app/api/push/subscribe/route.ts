/**
 * POST /api/push/subscribe
 *
 * Body:
 *   {
 *     subscription: { endpoint: string, keys: { p256dh: string, auth: string } },
 *     topics?: string[],
 *     sessionId?: string,
 *     userAgent?: string
 *   }
 *
 * Idempotent: if `endpoint` already exists, refresh `topics`, `sessionId`,
 * and `lastActiveAt` (re-subscribing on a different device or after a topic
 * change). The endpoint column is unique, so the conflict-on-update pattern
 * is the right primitive here.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

const ALLOWED_TOPICS = new Set(["breaking", "edition", "prediction"]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    subscription,
    topics,
    sessionId,
    userAgent,
  } = (body ?? {}) as {
    subscription?: {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown } | null;
    };
    topics?: unknown;
    sessionId?: unknown;
    userAgent?: unknown;
  };

  const endpoint = typeof subscription?.endpoint === "string" ? subscription.endpoint : null;
  const p256dh =
    subscription?.keys && typeof subscription.keys.p256dh === "string"
      ? subscription.keys.p256dh
      : null;
  const auth =
    subscription?.keys && typeof subscription.keys.auth === "string"
      ? subscription.keys.auth
      : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "subscription.endpoint, keys.p256dh, and keys.auth are required" },
      { status: 400 }
    );
  }

  const session = typeof sessionId === "string" && sessionId.length > 0 ? sessionId : null;
  if (!session) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const validTopics: string[] = Array.isArray(topics)
    ? topics.filter((t): t is string => typeof t === "string" && ALLOWED_TOPICS.has(t))
    : ["breaking", "edition", "prediction"];

  const ua = typeof userAgent === "string" ? userAgent.slice(0, 500) : null;

  try {
    await db
      .insert(pushSubscriptions)
      .values({
        sessionId: session,
        endpoint,
        p256dh,
        auth,
        topics: validTopics,
        userAgent: ua,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          sessionId: session,
          p256dh,
          auth,
          topics: validTopics,
          userAgent: ua,
          lastActiveAt: new Date(),
        },
      });
    return NextResponse.json({ ok: true, topics: validTopics });
  } catch (err) {
    console.error("[/api/push/subscribe] insert failed:", err);
    return NextResponse.json({ error: "Failed to store subscription" }, { status: 500 });
  }
}

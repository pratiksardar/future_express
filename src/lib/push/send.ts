/**
 * Server-side Web Push delivery.
 *
 * Three fan-out events, all routed through one transport:
 *   sendBreakingPush   — when `detectBreaking` records a >10pt 24h move
 *   sendEditionPush    — when the 4h edition pipeline publishes a new volume
 *   sendPredictionPush — when a user's submitted Daily Challenge prediction resolves
 *
 * Behaviour:
 *  - Resolves subscribers from `pushSubscriptions` (filtered by topic for the
 *    fan-out events; filtered by `sessionId` for the per-user prediction event).
 *  - Calls `web-push.sendNotification` with the JSON-encoded payload.
 *  - HTTP 410 / 404 from the push service means the subscription is dead — we
 *    delete the row so the table doesn't bloat.
 *  - Other errors are logged and counted but never thrown out: one bad
 *    subscriber should not block the rest of the fan-out.
 *  - If `VAPID_PUBLIC_KEY` is unset (e.g. local dev without keys), we log a
 *    one-shot warning and no-op gracefully — the cron MUST NOT crash.
 *
 * Type quirk:
 *   `web-push` ships a CommonJS default export shaped like
 *   `{ sendNotification, setVapidDetails, ... }`. Under TS strict module
 *   resolution we import the namespace with `import * as webpush` so that
 *   `webpush.sendNotification` is fully typed via @types/web-push. No
 *   `@ts-expect-error` was needed.
 */
import * as webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq, sql, inArray } from "drizzle-orm";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  icon?: string;
  badge?: string;
  tag?: string;
};

export type BreakingPushPayload = PushPayload;
export type EditionPushPayload = PushPayload;
export type PredictionPushPayload = PushPayload;

type SendCounts = { sent: number; failed: number };

let vapidConfigured = false;
let warnedNoVapid = false;

/** Initialise web-push with VAPID details on first use. Returns false if keys are missing. */
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:editor@futureexpress.eth";

  if (!publicKey || !privateKey) {
    if (!warnedNoVapid) {
      console.warn(
        "[push/send] VAPID keys not configured (set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY); push delivery is a no-op"
      );
      warnedNoVapid = true;
    }
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.warn("[push/send] Failed to configure VAPID:", err);
    return false;
  }
}

type SubscriberRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Push services return 404/410 when a subscription is permanently invalid. */
function isGoneStatus(err: unknown): boolean {
  if (err && typeof err === "object" && "statusCode" in err) {
    const sc = (err as { statusCode: number }).statusCode;
    return sc === 404 || sc === 410;
  }
  return false;
}

async function deleteDeadSubscriptions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, ids));
  } catch (err) {
    console.warn("[push/send] Failed to prune dead subscriptions:", err);
  }
}

async function fanOut(rows: SubscriberRow[], payload: PushPayload): Promise<SendCounts> {
  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;
  let failed = 0;

  // Sequential is fine at our volume; parallel adds little while increasing the
  // chance of getting throttled by FCM/Mozilla's autopush. Switch to a bounded
  // concurrency map if subscriber count grows past ~1k.
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      if (isGoneStatus(err)) {
        dead.push(row.id);
      } else {
        console.warn("[push/send] delivery failed:", err);
      }
    }
  }

  await deleteDeadSubscriptions(dead);
  return { sent, failed };
}

async function findSubscribersByTopic(topic: string): Promise<SubscriberRow[]> {
  // Postgres array contains operator. drizzle's typed helpers don't expose `@>`
  // for text[] cleanly so we use a sql template here — that's fine, the input
  // is a string literal we control.
  return db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(sql`${pushSubscriptions.topics} @> ARRAY[${topic}]::text[]`);
}

async function findSubscribersBySessionAndTopic(
  sessionId: string,
  topic: string
): Promise<SubscriberRow[]> {
  return db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(
      sql`${pushSubscriptions.sessionId} = ${sessionId} AND ${pushSubscriptions.topics} @> ARRAY[${topic}]::text[]`
    );
}

export async function sendBreakingPush(payload: BreakingPushPayload): Promise<SendCounts> {
  if (!ensureVapid()) return { sent: 0, failed: 0 };
  try {
    const rows = await findSubscribersByTopic("breaking");
    if (rows.length === 0) return { sent: 0, failed: 0 };
    return await fanOut(rows, { tag: "fe-breaking", ...payload });
  } catch (err) {
    console.warn("[push/send] sendBreakingPush failed:", err);
    return { sent: 0, failed: 0 };
  }
}

export async function sendEditionPush(payload: EditionPushPayload): Promise<SendCounts> {
  if (!ensureVapid()) return { sent: 0, failed: 0 };
  try {
    const rows = await findSubscribersByTopic("edition");
    if (rows.length === 0) return { sent: 0, failed: 0 };
    return await fanOut(rows, { tag: "fe-edition", ...payload });
  } catch (err) {
    console.warn("[push/send] sendEditionPush failed:", err);
    return { sent: 0, failed: 0 };
  }
}

export async function sendPredictionPush(
  sessionId: string,
  payload: PredictionPushPayload
): Promise<SendCounts> {
  if (!ensureVapid()) return { sent: 0, failed: 0 };
  if (!sessionId) return { sent: 0, failed: 0 };
  try {
    const rows = await findSubscribersBySessionAndTopic(sessionId, "prediction");
    if (rows.length === 0) return { sent: 0, failed: 0 };
    return await fanOut(rows, { tag: "fe-prediction", ...payload });
  } catch (err) {
    console.warn("[push/send] sendPredictionPush failed:", err);
    return { sent: 0, failed: 0 };
  }
}

/** Useful for tests and admin debug tooling. */
export async function _markSubscriptionActive(endpoint: string): Promise<void> {
  await db
    .update(pushSubscriptions)
    .set({ lastActiveAt: new Date() })
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

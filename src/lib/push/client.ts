/**
 * Browser-side helpers for the Web Push subscription lifecycle.
 *
 * Standard Web Push (VAPID + Service Worker) — no third-party SDK. The
 * service worker lives at `/sw.js` (a vanilla JS file in `public/`).
 *
 * Lifecycle:
 *   isPushSupported() → check API availability
 *   subscribeToPush() → register SW, request permission, create subscription,
 *                       persist to /api/push/subscribe
 *   getCurrentSubscription() → read existing subscription (no-op if none)
 *   unsubscribeFromPush() → unsubscribe locally and tell the server
 */

const SW_PATH = "/sw.js";

const SESSION_KEY = "tfe_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = window.crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return window.crypto.randomUUID();
  }
}

/** True if the browser exposes the push primitives we need. */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

/**
 * VAPID public keys are URL-safe base64; the PushManager expects a Uint8Array.
 * Convert here once.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Allocate a plain ArrayBuffer (not SharedArrayBuffer) so the resulting
  // Uint8Array satisfies PushSubscriptionOptionsInit.applicationServerKey,
  // which on newer DOM lib typings is BufferSource = ArrayBufferView<ArrayBuffer>.
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) output[i] = rawData.charCodeAt(i);
  return output;
}

async function getVapidPublicKey(): Promise<string> {
  // Prefer the env-injected public key (no extra round-trip).
  const inline = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (inline && inline.length > 0) return inline;

  // Fallback: ask the server.
  const res = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
  if (!res.ok) throw new Error("VAPID public key unavailable");
  const json = (await res.json()) as { key?: string };
  if (!json.key) throw new Error("VAPID public key not configured on server");
  return json.key;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await getOrRegisterServiceWorker();
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(
  topics: string[] = ["breaking", "edition", "prediction"]
): Promise<PushSubscription> {
  if (!isPushSupported()) throw new Error("Push notifications unsupported");

  const reg = await getOrRegisterServiceWorker();

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission denied");

  const existing = await reg.pushManager.getSubscription();
  let subscription = existing;
  if (!subscription) {
    const vapidKey = await getVapidPublicKey();
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  // Persist server-side. JSON-serialize via the spec-defined toJSON().
  const json = subscription.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: json,
      topics,
      sessionId: getOrCreateSessionId(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    }),
  });

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!reg) return;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Best-effort — local unsubscribe already happened.
  }
}

/* eslint-disable */
// Future Express — Web Push service worker (push-only; no caching).
// Keep this file dependency-free: it is served as a static asset and runs
// in the Service Worker scope, so it cannot import from the bundler.

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

// No precaching, no fetch handler — we don't want a PWA shell yet.
// Activate immediately on first install so push works on the visit that opted in.
sw.addEventListener("install", (event) => {
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "The Future Express", body: event.data.text() };
  }

  const title = payload.title || "The Future Express";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon.png",
    badge: payload.badge || "/icon.png",
    tag: payload.tag || "future-express",
    data: { url: payload.url || "/" },
    requireInteraction: false,
  };

  event.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(url, clientUrl.origin);
          if (clientUrl.origin === targetUrl.origin && "focus" in client) {
            client.navigate(targetUrl.toString());
            return client.focus();
          }
        } catch {
          /* ignore URL parse errors */
        }
      }
      if (sw.clients.openWindow) return sw.clients.openWindow(url);
    })
  );
});

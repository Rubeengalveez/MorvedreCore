/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";
import { getSafeNotificationPath } from "@/lib/pwa/notification-url";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const STATIC_CACHE_NAME = "morvedre-static-assets-v2";
const PRECACHE_ENTRIES = self.__SW_MANIFEST ?? [];
const ACTA_SHELL_REVISION = JSON.stringify(PRECACHE_ENTRIES).split("").reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0).toString();

const serwist = new Serwist({
  cacheId: "morvedre-core-v2",
  precacheEntries: [...PRECACHE_ENTRIES, { url: "/offline", revision: ACTA_SHELL_REVISION }, { url: "/acta", revision: ACTA_SHELL_REVISION }],
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: "/acta",
        matcher({ request }) {
          return request.destination === "document" && new URL(request.url).pathname === "/acta";
        },
      },
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname.startsWith("/brand/") ||
          url.pathname.startsWith("/icons/") ||
          /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|ttf|otf)$/.test(url.pathname)),
      handler: new CacheFirst({
        cacheName: STATIC_CACHE_NAME,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
  ],
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== serwist.precacheStrategy.cacheName && name !== STATIC_CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || "Morvedre Core";
    const options: NotificationOptions = {
      body: data.body || "",
      icon: "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      data: {
        href: getSafeNotificationPath(data.href),
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Morvedre Core", {
        body: text,
        icon: "/brand/icon-192.png",
        badge: "/brand/icon-192.png",
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = getSafeNotificationPath(
    (event.notification.data as { href?: string } | undefined)?.href,
  );
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("navigate" in client && new URL(client.url).origin === self.location.origin) {
          return client.focus().then(() => (client as WindowClient).navigate(href));
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(href);
      }
    }),
  );
});

serwist.addEventListeners();

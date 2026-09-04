/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { cacheNames, CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const STATIC_CACHE_NAME = "morvedre-static-assets-v2";

const serwist = new Serwist({
  cacheId: "morvedre-core-v2",
  precacheEntries: [
    ...(self.__SW_MANIFEST ?? []),
    { url: "/offline", revision: "1" },
  ],
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
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
            .filter((name) => name !== cacheNames.precache && name !== STATIC_CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

serwist.addEventListeners();

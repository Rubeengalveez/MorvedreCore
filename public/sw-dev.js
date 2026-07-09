// Dummy service worker for local development (no caching, no 404 errors)
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through all requests
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Morvedre Core";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      data: { href: data.href || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(href);
          return client.focus();
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});

/* Retirement-only worker: replaces legacy Workbox when an existing browser
 * registration checks for updates. No requests are intercepted or cached. */
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => /^(workbox-|lyceum-)/.test(name)).map((name) => caches.delete(name)),
      );
      await self.registration.unregister();
    })(),
  );
});

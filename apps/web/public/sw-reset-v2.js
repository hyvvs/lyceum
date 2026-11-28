/* One-time same-origin migration. Never delete storage unrelated to Lyceum. */
if ("serviceWorker" in navigator && "caches" in window) {
  (async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const lyceumRegistrations = registrations.filter(
        (registration) => registration.scope === new URL("/", location.href).href,
      );
      await Promise.all(lyceumRegistrations.map((registration) => registration.unregister()));
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.filter((key) => /^(workbox-|lyceum-)/.test(key)).map((key) => caches.delete(key)),
      );
      if (navigator.serviceWorker.controller && !sessionStorage.getItem("lyceum.sw-retired.v2")) {
        sessionStorage.setItem("lyceum.sw-retired.v2", "1");
        location.replace(
          `${location.pathname}${location.search}${location.search ? "&" : "?"}ui=v2${location.hash}`,
        );
      }
    } catch {
      // A blocked Service Worker or Storage API must not block application startup.
    }
  })();
}

import { useEffect, useRef, useState } from "react";

/** Native SW registration avoids introducing a new workbox-window direct runtime dependency. */
export function usePwaUpdate(): { needsRefresh: boolean; update: () => void } {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const updatePending = useRef(false);
  const controllerCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let active = true;
    let detachListeners: (() => void) | null = null;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((service) => {
        if (!active) return;
        registration.current = service;
        const promptIfWaiting = () => {
          if (service.waiting && navigator.serviceWorker.controller) setNeedsRefresh(true);
        };
        let removeStateListener: (() => void) | null = null;
        const onUpdateFound = () => {
          removeStateListener?.();
          const installing = service.installing;
          if (!installing) return;
          const onStateChange = () => {
            if (installing.state === "installed") promptIfWaiting();
            if (installing.state === "activated" || installing.state === "redundant") {
              removeStateListener?.();
              removeStateListener = null;
            }
          };
          installing.addEventListener("statechange", onStateChange);
          removeStateListener = () => installing.removeEventListener("statechange", onStateChange);
        };
        service.addEventListener("updatefound", onUpdateFound);
        detachListeners = () => {
          service.removeEventListener("updatefound", onUpdateFound);
          removeStateListener?.();
        };
        promptIfWaiting();
        if (service.installing) onUpdateFound();
      })
      .catch(() => {
        /* Offline/browser-blocked SW is a supported shell fallback. */
      });
    return () => {
      active = false;
      detachListeners?.();
      controllerCleanup.current?.();
      controllerCleanup.current = null;
      updatePending.current = false;
      registration.current = null;
    };
  }, []);

  const update = () => {
    const waiting = registration.current?.waiting;
    if (!waiting || updatePending.current) return;
    updatePending.current = true;
    const onControllerChange = () => {
      controllerCleanup.current?.();
      controllerCleanup.current = null;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, {
      once: true,
    });
    controllerCleanup.current = () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    try {
      waiting.postMessage({ type: "SKIP_WAITING" });
    } catch {
      controllerCleanup.current();
      controllerCleanup.current = null;
      updatePending.current = false;
    }
  };
  return { needsRefresh, update };
}

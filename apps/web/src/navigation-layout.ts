import { useLayoutEffect, useRef, useState } from "react";

type NavigationMode = "reserved" | "flow";

/** Private shell geometry only; routing and focus remain browser/Router-owned. */
export function useNavigationLayout(hasUpdate: boolean) {
  const [mode, setMode] = useState<NavigationMode>("reserved");
  const modeRef = useRef<NavigationMode>(mode);
  const frameRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const auxiliaryRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLElement>(null);
  const pendingScrollRef = useRef<{ to: NavigationMode; offset: number } | null>(null);

  useLayoutEffect(() => {
    const root = frameRef.current?.parentElement;
    const auxiliary = auxiliaryRef.current;
    if (!root || !auxiliary) return;

    const measure = () => {
      const visualHeight = window.visualViewport?.height ?? window.innerHeight;
      const visibleHeight = Math.max(1, Math.min(window.innerHeight, visualHeight));
      const heightValue = `${Math.floor(visibleHeight)}px`;
      if (root.style.getPropertyValue("--shell-visible-height") !== heightValue) {
        root.style.setProperty("--shell-visible-height", heightValue);
      }

      const rootFont = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const safeFont = Number.isFinite(rootFont) ? rootFont : 16;
      const auxiliaryStyle = getComputedStyle(auxiliary);
      const padding =
        Number.parseFloat(auxiliaryStyle.paddingTop) +
        Number.parseFloat(auxiliaryStyle.paddingBottom);
      const gap = Number.parseFloat(auxiliaryStyle.rowGap) || 0;
      const dockHeight = dockRef.current?.getBoundingClientRect().height ?? 0;
      const bannerHeight = hasUpdate ? (bannerRef.current?.getBoundingClientRect().height ?? 0) : 0;
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const frame = frameRef.current;
      const main = frame?.querySelector("main");
      const initialReadingInset =
        (frame ? Number.parseFloat(getComputedStyle(frame).paddingTop) || 0 : 0) +
        (main ? Number.parseFloat(getComputedStyle(main).paddingTop) || 0 : 0);

      // Reserve at least 14 root text lines or 224 CSS px of actual reading
      // height *after* persistent nav/update chrome and the first-view header.
      // This is a measured viewport/content decision, not device detection.
      const minimumReadingHeight = Math.max(224, 14 * safeFont);
      // The desktop Dock occupies a logical inline gutter, not a bottom row.
      const navRowHeight = window.innerWidth <= 900 ? dockHeight : 0;
      const reservedChrome = navRowHeight + bannerHeight + padding + (bannerHeight ? gap : 0);
      const usableReadingHeight =
        visibleHeight - reservedChrome - headerHeight - initialReadingInset;
      const next: NavigationMode = usableReadingHeight < minimumReadingHeight ? "flow" : "reserved";

      if (next !== modeRef.current) {
        const frame = frameRef.current;
        pendingScrollRef.current = {
          to: next,
          offset: modeRef.current === "reserved" ? (frame?.scrollTop ?? 0) : window.scrollY,
        };
        modeRef.current = next;
        setMode(next);
      }
    };

    const observer = new ResizeObserver(measure);
    for (const node of [headerRef.current, dockRef.current, bannerRef.current, auxiliary]) {
      if (node) observer.observe(node);
    }
    const rootObserver = new MutationObserver(measure);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class", "data-theme", "data-transparency", "data-contrast"],
    });
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      rootObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [hasUpdate]);

  useLayoutEffect(() => {
    const pending = pendingScrollRef.current;
    if (!pending || pending.to !== mode) return;
    pendingScrollRef.current = null;
    if (mode === "flow") window.scrollTo({ top: pending.offset, behavior: "instant" });
    else if (frameRef.current) frameRef.current.scrollTop = pending.offset;

    // A resize can move an *already focused* control outside the new scroll
    // owner. Reveal that control without taking focus or owning a focus scope.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest(".application")) {
      requestAnimationFrame(() => {
        if (document.activeElement === active && active.isConnected) {
          const focus = active.getBoundingClientRect();
          const scrollport = mode === "reserved" ? frameRef.current?.getBoundingClientRect() : null;
          const top = scrollport && !active.closest(".shell-auxiliary") ? scrollport.top : 0;
          const bottom =
            scrollport && !active.closest(".shell-auxiliary")
              ? scrollport.bottom
              : (window.visualViewport?.height ?? window.innerHeight);
          if (focus.top < top || focus.bottom > bottom) {
            active.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
          }
        }
      });
    }
  }, [mode]);

  return { mode, frameRef, headerRef, dockRef, auxiliaryRef, bannerRef };
}

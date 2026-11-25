import {
  Dock,
  PillNav,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyceum/ui";
import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./icons";
import { useNavigationLayout } from "./navigation-layout";
import { TodayScreen } from "./today";
import { usePwaUpdate } from "./use-pwa-update";

const LazySettingsScreen = lazy(async () => ({
  default: (await import("./settings-screen")).SettingsScreen,
}));

function SettingsRoute() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<output className="glass-reading">{t("settings.loading")}</output>}>
      <LazySettingsScreen />
    </Suspense>
  );
}

function Brand() {
  const { t } = useTranslation();
  return (
    <Link className="brand" to="/">
      <span className="brand-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span>
        <span className="brand-title">
          lyceum<span className="brand-dot">.</span>
        </span>
        <span className="brand-subtitle">{t("brand.tagline")}</span>
      </span>
    </Link>
  );
}

// The app alone owns real destinations, translation and active route semantics.
// Both separately named desktop landmarks remain keyboard-operable in B3;
// duplicate destinations are documented rather than hiding focusable controls.
const shellDestinations = [
  { to: "/", label: "navigation.today", icon: "home" },
  { to: "/settings", label: "navigation.settings", icon: "settings" },
] as const;

function Navigation() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <PillNav className="pill-navigation" aria-label={t("navigation.primary")}>
      {shellDestinations.map((destination) => (
        <Link
          key={destination.to}
          to={destination.to}
          aria-current={pathname === destination.to ? "page" : undefined}
          activeOptions={{ exact: destination.to === "/" }}
          activeProps={{ className: "pill-link is-active" }}
          inactiveProps={{ className: "pill-link" }}
        >
          <Icon name={destination.icon} />
          <span>{t(destination.label)}</span>
        </Link>
      ))}
    </PillNav>
  );
}

// The existing Tooltip's mobile sideOffset and collisionPadding are 16px and
// 12px respectively. Use the same values for the app's preflight geometry.
const mobileTooltipOffset = 16;
const mobileTooltipCollisionPadding = 12;

/** App-only measured Tooltip layout; B2 still owns reserved/flow mode. */
function useDockTooltipPlacement(
  dockRef: React.RefObject<HTMLElement | null>,
  todayLabel: string,
  settingsLabel: string,
) {
  const [placement, setPlacement] = useState(() => ({
    mobile: window.matchMedia("(max-width: 900px)").matches,
    rtl: getComputedStyle(document.documentElement).direction === "rtl",
    top: false,
    lane: 0,
  }));

  useLayoutEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 900px)");
    const update = () => {
      const mobile = mobileQuery.matches;
      const rtl = getComputedStyle(document.documentElement).direction === "rtl";
      let top = false;
      let lane = 0;
      const links = Array.from(
        dockRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [],
      );
      if (mobile && links.length === 2) {
        // Match the real shared Tooltip's font, padding, wrapping and current
        // locale without rendering an operable or accessible extra control.
        const probe = document.createElement("div");
        probe.className = "lyceum-tooltip";
        probe.style.position = "fixed";
        probe.style.visibility = "hidden";
        probe.style.pointerEvents = "none";
        probe.style.animation = "none";
        probe.style.width = "max-content";
        document.body.append(probe);
        const sizes = [todayLabel, settingsLabel].map((label) => {
          probe.textContent = label;
          const rect = probe.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
        probe.remove();
        const left = window.visualViewport?.offsetLeft ?? 0;
        const right = Math.min(
          window.innerWidth,
          left + (window.visualViewport?.width ?? window.innerWidth),
        );
        top = links.some((link, index) => {
          const rect = link.getBoundingClientRect();
          const outwardRight = (index === 0) === rtl;
          const available =
            (outwardRight ? right - rect.right : rect.left - left) -
            mobileTooltipOffset -
            mobileTooltipCollisionPadding;
          // A 2px rounding margin prevents a nominally fitting hint from
          // flipping inward when platform font metrics differ at the edge.
          return available < (sizes[index]?.width ?? Number.POSITIVE_INFINITY) + 2;
        });
        if (top) {
          lane = Math.ceil(
            Math.max(...sizes.map((size) => size.height)) +
              mobileTooltipOffset +
              mobileTooltipCollisionPadding,
          );
        }
      }
      setPlacement((current) =>
        current.mobile === mobile &&
        current.rtl === rtl &&
        current.top === top &&
        current.lane === lane
          ? current
          : { mobile, rtl, top, lane },
      );
    };
    const rootObserver = new MutationObserver(update);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir", "style", "class"],
    });
    const dockObserver = new ResizeObserver(update);
    if (dockRef.current) dockObserver.observe(dockRef.current);
    mobileQuery.addEventListener("change", update);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    update();
    return () => {
      rootObserver.disconnect();
      dockObserver.disconnect();
      mobileQuery.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [dockRef, todayLabel, settingsLabel]);

  return placement;
}

function DockNavigation({
  navRef,
  placement,
}: {
  navRef: React.Ref<HTMLElement>;
  placement: ReturnType<typeof useDockTooltipPlacement>;
}) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { mobile, rtl, top } = placement;
  return (
    <TooltipProvider>
      <Dock ref={navRef} className="icon-dock" aria-label={t("navigation.dock")}>
        <span className="dock-grip" aria-hidden="true">
          •••
        </span>
        {shellDestinations.map((destination, index) => (
          <Tooltip key={destination.to}>
            <TooltipTrigger asChild>
              <Link
                to={destination.to}
                aria-current={pathname === destination.to ? "page" : undefined}
                activeOptions={{ exact: destination.to === "/" }}
                aria-label={t(destination.label)}
                activeProps={{ className: "dock-link is-active" }}
                inactiveProps={{ className: "dock-link" }}
              >
                <Icon name={destination.icon} />
              </Link>
            </TooltipTrigger>
            <TooltipContent
              // Only use outward placement when the actual translated label
              // fits beside its native trigger without Radix flipping inward.
              side={mobile && !top ? ((index === 0) === rtl ? "right" : "left") : "top"}
              sideOffset={mobile ? mobileTooltipOffset : undefined}
              collisionPadding={mobile ? mobileTooltipCollisionPadding : undefined}
              text={t(destination.label)}
            />
          </Tooltip>
        ))}
        <span className="dock-trail" aria-hidden="true" />
      </Dock>
    </TooltipProvider>
  );
}

export function ErrorScreen({
  missing = false,
  retry,
  nativeHome = false,
}: {
  missing?: boolean;
  retry?: () => void;
  nativeHome?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="error-screen glass-reading">
      <span className="error-symbol" aria-hidden="true">
        !
      </span>
      <h1 tabIndex={-1}>{t(missing ? "errors.missingTitle" : "errors.title")}</h1>
      <p>{t(missing ? "errors.missingBody" : "errors.description")}</p>
      <div className="error-actions">
        {retry && (
          <button className="secondary-action" type="button" onClick={retry}>
            {t("errors.retry")}
          </button>
        )}
        {nativeHome ? (
          <a href="/" className="primary-action">
            {t("errors.home")}
            <Icon name="arrow" />
          </a>
        ) : (
          <Link to="/" className="primary-action">
            {t("errors.home")}
            <Icon name="arrow" />
          </Link>
        )}
      </div>
    </div>
  );
}

function RootLayout() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const previous = useRef(pathname);
  const { needsRefresh, update } = usePwaUpdate();
  const { mode, frameRef, headerRef, dockRef, auxiliaryRef, bannerRef } =
    useNavigationLayout(needsRefresh);
  const tooltipPlacement = useDockTooltipPlacement(
    dockRef,
    t("navigation.today"),
    t("navigation.settings"),
  );

  useEffect(() => {
    if (pathname === previous.current) return;
    previous.current = pathname;
    const main = document.getElementById("main-content");
    if (!main) return;
    let handled = false;
    const revealHeading = () => {
      if (handled) return;
      const heading = main.querySelector<HTMLElement>("h1");
      if (!heading) return;
      handled = true;
      observer.disconnect();
      heading.focus();
      heading.scrollIntoView({ block: "start", inline: "nearest" });
    };
    // A lazy route can render after the pathname changes. Listen for its real
    // heading rather than moving focus to a missing Suspense child.
    const observer = new MutationObserver(revealHeading);
    observer.observe(main, { childList: true, subtree: true });
    const frame = requestAnimationFrame(revealHeading);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <div className="application" data-navigation-mode={mode}>
      <a href="#main-content" className="skip-link">
        {t("navigation.skip")}
      </a>
      <div className="atmosphere" aria-hidden="true">
        <span className="atmosphere-a" />
        <span className="atmosphere-b" />
        <span className="atmosphere-c" />
      </div>
      <div ref={frameRef} className="application-frame">
        <header ref={headerRef} className="topbar">
          <Brand />
          <Navigation />
          <div className="topbar-status">
            <span className="online-indicator" aria-hidden="true" />
            <span>{t("shell.private")}</span>
            <Icon name="shield" />
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="footer">
          <span>{t("shell.footer")}</span>
          <span className="placeholder-label">{t("shell.placeholder")}</span>
        </footer>
      </div>
      <div
        ref={auxiliaryRef}
        className="shell-auxiliary"
        data-update-pending={needsRefresh ? "true" : undefined}
        data-tooltip-placement={
          tooltipPlacement.mobile ? (tooltipPlacement.top ? "top" : "outward") : "desktop"
        }
        style={
          tooltipPlacement.mobile && tooltipPlacement.top
            ? needsRefresh
              ? { rowGap: `${tooltipPlacement.lane}px` }
              : { paddingBlockStart: `${tooltipPlacement.lane}px` }
            : undefined
        }
      >
        {needsRefresh && (
          <aside ref={bannerRef} className="update-banner glass-reading">
            <output>{t("updates.ready")}</output>
            <button type="button" className="secondary-action" onClick={update}>
              {t("updates.action")}
            </button>
          </aside>
        )}
        <DockNavigation navRef={dockRef} placement={tooltipPlacement} />
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: () => <ErrorScreen retry={() => window.location.reload()} />,
  notFoundComponent: () => <ErrorScreen missing />,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: TodayScreen,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsRoute,
});
const routeTree = rootRoute.addChildren([homeRoute, settingsRoute]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

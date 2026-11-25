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
import { Suspense, lazy, useEffect, useRef, useState } from "react";
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

/** App-only responsive Tooltip positioning; no public UI routing/viewport policy. */
function useDockTooltipPlacement() {
  const [placement, setPlacement] = useState(() => ({
    mobile: window.matchMedia("(max-width: 900px)").matches,
    rtl: getComputedStyle(document.documentElement).direction === "rtl",
  }));

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 900px)");
    const update = () => {
      const mobile = mobileQuery.matches;
      const rtl = getComputedStyle(document.documentElement).direction === "rtl";
      setPlacement((current) =>
        current.mobile === mobile && current.rtl === rtl ? current : { mobile, rtl },
      );
    };
    const rootObserver = new MutationObserver(update);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    mobileQuery.addEventListener("change", update);
    update();
    return () => {
      rootObserver.disconnect();
      mobileQuery.removeEventListener("change", update);
    };
  }, []);

  return placement;
}

function DockNavigation({ navRef }: { navRef: React.Ref<HTMLElement> }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { mobile, rtl } = useDockTooltipPlacement();
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
              // On a reserved mobile row, leave both the actual reading scrollport
              // and the other Dock link clear. Desktop retains normal top hints.
              side={mobile ? ((index === 0) === rtl ? "right" : "left") : "top"}
              sideOffset={mobile ? 16 : undefined}
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
      <div ref={auxiliaryRef} className="shell-auxiliary">
        {needsRefresh && (
          <aside ref={bannerRef} className="update-banner glass-reading">
            <output>{t("updates.ready")}</output>
            <button type="button" className="secondary-action" onClick={update}>
              {t("updates.action")}
            </button>
          </aside>
        )}
        <DockNavigation navRef={dockRef} />
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

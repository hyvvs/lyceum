import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./icons";
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

function Navigation() {
  const { t } = useTranslation();
  return (
    <>
      <nav className="pill-navigation glass-float" aria-label={t("navigation.primary")}>
        <Link
          to="/"
          activeOptions={{ exact: true }}
          activeProps={{ className: "pill-link is-active" }}
          inactiveProps={{ className: "pill-link" }}
        >
          <Icon name="home" />
          <span>{t("navigation.today")}</span>
        </Link>
        <Link
          to="/settings"
          activeProps={{ className: "pill-link is-active" }}
          inactiveProps={{ className: "pill-link" }}
        >
          <Icon name="settings" />
          <span>{t("navigation.settings")}</span>
        </Link>
      </nav>
      <nav className="icon-dock glass-float" aria-label={t("navigation.dock")}>
        <span className="dock-grip" aria-hidden="true">
          •••
        </span>
        <Link
          to="/"
          activeOptions={{ exact: true }}
          aria-label={t("navigation.today")}
          activeProps={{ className: "dock-link is-active" }}
          inactiveProps={{ className: "dock-link" }}
        >
          <Icon name="home" />
        </Link>
        <Link
          to="/settings"
          aria-label={t("navigation.settings")}
          activeProps={{ className: "dock-link is-active" }}
          inactiveProps={{ className: "dock-link" }}
        >
          <Icon name="settings" />
        </Link>
        <span className="dock-trail" aria-hidden="true" />
      </nav>
    </>
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

  function revealFocusedControl(target: HTMLElement) {
    if (window.innerWidth > 900 || !target.isConnected) return;
    const dock = document.querySelector<HTMLElement>(".icon-dock");
    if (!dock) return;
    const control = target.getBoundingClientRect();
    const overlay = dock.getBoundingClientRect();
    if (control.bottom > overlay.top - 12 && control.top < overlay.bottom) {
      window.scrollBy({ top: control.bottom - overlay.top + 16, behavior: "instant" });
    }
  }

  return (
    <div className="application">
      <a href="#main-content" className="skip-link">
        {t("navigation.skip")}
      </a>
      <div className="atmosphere" aria-hidden="true">
        <span className="atmosphere-a" />
        <span className="atmosphere-b" />
        <span className="atmosphere-c" />
      </div>
      <div className="application-frame">
        <header className="topbar">
          <Brand />
          <Navigation />
          <div className="topbar-status">
            <span className="online-indicator" aria-hidden="true" />
            <span>{t("shell.private")}</span>
            <Icon name="shield" />
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          onFocusCapture={(event) => {
            const target = event.target;
            requestAnimationFrame(() => revealFocusedControl(target));
          }}
        >
          <Outlet />
        </main>
        <footer className="footer">
          <span>{t("shell.footer")}</span>
          <span className="placeholder-label">{t("shell.placeholder")}</span>
        </footer>
      </div>
      {needsRefresh && (
        <aside className="update-banner glass-reading">
          <output>{t("updates.ready")}</output>
          <button type="button" className="secondary-action" onClick={update}>
            {t("updates.action")}
          </button>
        </aside>
      )}
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

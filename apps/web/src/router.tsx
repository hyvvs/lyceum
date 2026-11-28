import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TodayScreen } from "./today";

/** The production application has one UI entry point. Design studies are not routes. */
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
    <main className="lyceum-error" id="main-content">
      <h1>{t(missing ? "errors.missingTitle" : "errors.title")}</h1>
      <p>{t(missing ? "errors.missingBody" : "errors.description")}</p>
      {retry && (
        <button type="button" onClick={retry}>
          {t("errors.retry")}
        </button>
      )}
      <a href="/">{t("errors.home")}</a>
    </main>
  );
}

const rootRoute = createRootRoute({
  component: Outlet,
  errorComponent: () => <ErrorScreen retry={() => window.location.reload()} />,
  notFoundComponent: () => <ErrorScreen missing />,
});

// The single route is deliberately explicit so unknown paths show the not-found state.
const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: TodayScreen,
});
export const router = createRouter({
  routeTree: rootRoute.addChildren([todayRoute]),
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

import { RouterProvider } from "@tanstack/react-router";
import { Component, type ErrorInfo, type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import "@lyceum/ui/glass.css";
import "./shell.css";
import "./shell-navigation.css";
import "./shell-panels.css";
import "./shell-settings.css";
import "./responsive.css";
import { createTranslations } from "./i18n";
import { applyPreferences, readPreferences } from "./preferences";
import { ErrorScreen, router } from "./router";
import { PreferenceProvider } from "./settings";

class ApplicationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // No learner content or stack trace is collected, logged or transmitted by default.
  }
  override render() {
    return this.state.failed ? (
      <div className="application">
        <main id="main-content">
          <ErrorScreen nativeHome retry={() => this.setState({ failed: false })} />
        </main>
      </div>
    ) : (
      this.props.children
    );
  }
}

async function start() {
  const preferences = readPreferences();
  applyPreferences(preferences);
  const translations = await createTranslations(preferences.locale);
  const mount = document.getElementById("root");
  if (!mount) throw new Error("Lyceum application root not found");
  createRoot(mount).render(
    <StrictMode>
      <I18nextProvider i18n={translations}>
        <ApplicationBoundary>
          <PreferenceProvider>
            <RouterProvider router={router} />
          </PreferenceProvider>
        </ApplicationBoundary>
      </I18nextProvider>
    </StrictMode>,
  );
}

void start().catch(() => {
  // Bootstrap failures occur before the React boundary is mounted. Do not
  // expose error stacks or learner content; render a router-free retry path.
  const mount = document.getElementById("root");
  if (!mount) return;
  createRoot(mount).render(
    <div className="application">
      <main id="main-content">
        <div className="error-screen glass-reading">
          <h1>This screen couldn't start.</h1>
          <p>Reload the page to try again. No learning session has been started.</p>
          <button
            type="button"
            className="secondary-action"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </main>
    </div>,
  );
});

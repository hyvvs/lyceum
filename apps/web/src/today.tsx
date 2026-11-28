import { Dock, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@lyceum/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./icons";
import { usePreferences } from "./settings";
import { FidelityToday } from "./today-dashboard";
import { useDocumentTitle } from "./use-document-title";

const sections = [{ id: "today", label: "Today", icon: "home" }] as const;

type Overlay = "settings" | null;

function PreferencesPanel() {
  const { preferences, storageAvailable, change } = usePreferences();
  return (
    <div className="lyceum-preferences">
      <label htmlFor="lyceum-theme">Theme</label>
      <select
        id="lyceum-theme"
        value={preferences.theme}
        onChange={(event) => change({ theme: event.target.value as typeof preferences.theme })}
      >
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="high-contrast">High contrast</option>
      </select>
      <label htmlFor="lyceum-transparency">Transparency</label>
      <select
        id="lyceum-transparency"
        value={preferences.transparency}
        onChange={(event) =>
          change({ transparency: event.target.value as typeof preferences.transparency })
        }
      >
        <option value="full">Full</option>
        <option value="reduced">Reduced</option>
        <option value="off">Off</option>
      </select>
      <label htmlFor="lyceum-language">Language</label>
      <select
        id="lyceum-language"
        value={preferences.locale}
        onChange={(event) => change({ locale: event.target.value as typeof preferences.locale })}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
      <small>
        {storageAvailable
          ? "Appearance settings saved on this device"
          : "Settings are not saved in this browser"}
      </small>
    </div>
  );
}

export function TodayScreen() {
  const { t } = useTranslation();
  useDocumentTitle(t("navigation.today"));
  const { preferences } = usePreferences();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [goalDraft, setGoalDraft] = useState("");
  const overlayRef = useRef<HTMLElement | null>(null);
  const overlayTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!overlay) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOverlay(null);
        overlayTrigger.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [overlay]);

  function showOverlay(next: Overlay, event?: React.MouseEvent<HTMLButtonElement>) {
    if (event) overlayTrigger.current = event.currentTarget;
    setOverlay((current) => (current === next ? null : next));
  }

  const renderSection = (
    id: string,
    label: string,
    icon: (typeof sections)[number]["icon"],
    compact: boolean,
  ) => (
    <button
      key={id}
      type="button"
      aria-current={id === "today" ? "page" : undefined}
      aria-label={compact ? label : undefined}
      title={label}
      className="is-active"
      onClick={() => {
        document.getElementById("main-content")?.focus();
        setOverlay(null);
      }}
    >
      <Icon name={icon} />
      {!compact && <span>{label}</span>}
    </button>
  );

  return (
    <div
      className="lyceum-app"
      data-testid="lyceum-live-today"
      data-screen="today"
      data-theme-pref={preferences.theme}
    >
      <div className="rp-environment" aria-hidden="true" />
      <a href="#main-content" className="rp-skip">
        Skip to main content
      </a>
      <div className="rp-frame">
        <header className="rp-header">
          <div className="rp-brand" aria-label="Lyceum workspace">
            <strong className="rp-brand-word">
              lyceum<span aria-hidden="true">.</span>
            </strong>
            <span className="rp-brand-descriptor">Workspace</span>
          </div>
          <nav className="rp-top-navigation" aria-label="Main sections">
            {sections.map(({ id, label, icon }) => renderSection(id, label, icon, false))}
          </nav>
          <div className="rp-header-actions">
            <span className="rp-demo-chip">Demo data</span>
            <button
              type="button"
              className="rp-header-round"
              aria-label="Settings"
              aria-expanded={overlay === "settings"}
              onClick={(e) => showOverlay("settings", e)}
            >
              <Icon name="settings" />
            </button>
          </div>
        </header>

        {overlay && (
          <section ref={overlayRef} className="rp-top-popover" aria-label="Appearance settings">
            <div className="lyceum-popover-heading">
              <strong>Settings</strong>
              <button type="button" aria-label="Close panel" onClick={() => setOverlay(null)}>
                ×
              </button>
            </div>
            <PreferencesPanel />
          </section>
        )}

        {sections.length > 1 && (
          <TooltipProvider>
            <Dock
              orientation="vertical"
              className="lyceum-today-dock"
              aria-label="Section shortcuts"
            >
              {sections.map(({ id, label, icon }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>{renderSection(id, label, icon, true)}</TooltipTrigger>
                  <TooltipContent text={label} side="right" />
                </Tooltip>
              ))}
            </Dock>
          </TooltipProvider>
        )}

        <main id="main-content" className="lyceum-today-main" tabIndex={-1}>
          <h1 className="rp-visually-hidden">Today</h1>
          <FidelityToday
            synthetic
            goalDraft={goalDraft}
            onGoalChange={setGoalDraft}
            onSetup={() => setOverlay("settings")}
          />
        </main>
      </div>
    </div>
  );
}

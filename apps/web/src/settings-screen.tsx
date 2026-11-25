import { useTranslation } from "react-i18next";
import type { LocaleChoice, ThemeChoice, TransparencyChoice } from "./preferences";
import { usePreferences } from "./settings";
import { useDocumentTitle } from "./use-document-title";

/** Lazy route-only view; preference provider stays mounted across navigation. */
export function SettingsScreen() {
  const { t } = useTranslation();
  const { preferences, storageAvailable, change } = usePreferences();
  useDocumentTitle(t("navigation.settings"));
  return (
    <div className="screen settings-screen">
      <header className="screen-heading">
        <p className="eyebrow">{t("settings.appearance")}</p>
        <h1 tabIndex={-1}>{t("settings.title")}</h1>
        <p className="lede">{t("settings.description")}</p>
      </header>
      <section className="settings-panel glass-reading" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading">{t("settings.appearance")}</h2>
        <div className="settings-field">
          <label htmlFor="theme">{t("settings.theme")}</label>
          <select
            id="theme"
            value={preferences.theme}
            onChange={(event) => change({ theme: event.target.value as ThemeChoice })}
          >
            <option value="system">{t("settings.system")}</option>
            <option value="light">{t("settings.light")}</option>
            <option value="dark">{t("settings.dark")}</option>
            <option value="high-contrast">{t("settings.highContrast")}</option>
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="transparency">{t("settings.transparency")}</label>
          <select
            id="transparency"
            value={preferences.transparency}
            onChange={(event) => change({ transparency: event.target.value as TransparencyChoice })}
          >
            <option value="full">{t("settings.full")}</option>
            <option value="reduced">{t("settings.reduced")}</option>
            <option value="off">{t("settings.off")}</option>
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="language">{t("settings.language")}</label>
          <select
            id="language"
            value={preferences.locale}
            onChange={(event) => change({ locale: event.target.value as LocaleChoice })}
          >
            <option value="en">{t("settings.english")}</option>
            <option value="es">{t("settings.spanish")}</option>
          </select>
        </div>
        <output className="settings-feedback">
          {storageAvailable ? t("settings.saved") : t("settings.unsaved")}
        </output>
      </section>
      <aside className="settings-note glass">
        <span className="note-mark" aria-hidden="true">
          ◇
        </span>
        <p>{t("app.notConfigured")}</p>
      </aside>
    </div>
  );
}

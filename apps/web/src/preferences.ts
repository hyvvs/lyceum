/** UI-only preferences. No learner, provider or tutoring data is stored here. */
export const PREFERENCE_KEY = "lyceum.web.preferences.v1";

export type ThemeChoice = "system" | "light" | "dark" | "high-contrast";
export type LocaleChoice = "en" | "es";
export type TransparencyChoice = "full" | "reduced" | "off";

export interface Preferences {
  theme: ThemeChoice;
  locale: LocaleChoice;
  transparency: TransparencyChoice;
}

export const defaults: Preferences = {
  theme: "system",
  locale: "en",
  transparency: "full",
};

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

export function normalizePreferences(value: unknown): Preferences {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    theme:
      input.theme === "light" || input.theme === "dark" || input.theme === "high-contrast"
        ? input.theme
        : "system",
    locale: input.locale === "es" ? "es" : "en",
    transparency:
      input.transparency === "reduced" || input.transparency === "off"
        ? input.transparency
        : "full",
  };
}

export function readPreferences(storage?: ReadStorage): Preferences {
  try {
    const target = storage ?? window.localStorage;
    const raw = target.getItem(PREFERENCE_KEY);
    return raw ? normalizePreferences(JSON.parse(raw)) : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function canReadStorage(storage?: ReadStorage): boolean {
  try {
    (storage ?? window.localStorage).getItem(PREFERENCE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function savePreferences(
  storage: WriteStorage | undefined,
  preferences: Preferences,
): boolean {
  try {
    (storage ?? window.localStorage).setItem(
      PREFERENCE_KEY,
      JSON.stringify(normalizePreferences(preferences)),
    );
    return true;
  } catch {
    return false;
  }
}

export function resolveAppearance(
  theme: ThemeChoice,
  prefersLight: boolean,
): {
  theme: "auto" | "light" | "dark";
  contrast: "standard" | "high";
} {
  return {
    theme:
      theme === "system"
        ? "auto"
        : theme === "high-contrast"
          ? prefersLight
            ? "light"
            : "dark"
          : theme,
    contrast: theme === "high-contrast" ? "high" : "standard",
  };
}

export function applyPreferences(preferences: Preferences): void {
  const root = document.documentElement;
  const prefersLight = matchMedia("(prefers-color-scheme: light)").matches;
  const appearance = resolveAppearance(preferences.theme, prefersLight);
  root.dataset.theme = appearance.theme;
  if (appearance.contrast === "high") root.dataset.contrast = "high";
  else delete root.dataset.contrast; // Let native prefers-contrast media queries work.
  root.dataset.transparency =
    preferences.theme === "high-contrast" ? "off" : preferences.transparency;
  root.lang = preferences.locale;
  root.dir = "ltr"; // LTR resources are shipped first; preserve RTL-ready layout and future locale support.
}

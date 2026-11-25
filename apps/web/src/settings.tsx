import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type Preferences,
  applyPreferences,
  canReadStorage,
  readPreferences,
  savePreferences,
} from "./preferences";

interface PreferenceContextValue {
  preferences: Preferences;
  storageAvailable: boolean;
  change: (patch: Partial<Preferences>) => void;
}

const Context = createContext<PreferenceContextValue | null>(null);

export function PreferenceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [storageAvailable, setStorageAvailable] = useState(canReadStorage);
  const { i18n } = useTranslation();

  useEffect(() => {
    applyPreferences(preferences);
    void i18n.changeLanguage(preferences.locale);
  }, [i18n, preferences]);

  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: light)");
    const update = () => {
      if (preferences.theme === "system" || preferences.theme === "high-contrast")
        applyPreferences(preferences);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [preferences]);

  const change = (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setStorageAvailable(savePreferences(undefined, next));
  };

  return (
    <Context.Provider value={{ preferences, storageAvailable, change }}>
      {children}
    </Context.Provider>
  );
}

export function usePreferences(): PreferenceContextValue {
  const result = useContext(Context);
  if (!result) throw new Error("Preferences unavailable");
  return result;
}

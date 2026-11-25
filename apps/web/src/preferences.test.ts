import { describe, expect, it } from "vitest";
import {
  canReadStorage,
  normalizePreferences,
  readPreferences,
  resolveAppearance,
  savePreferences,
} from "./preferences";

describe("device-only validated preferences", () => {
  it("rejects invalid theme, contrast and locale while keeping a safe default", () => {
    expect(
      normalizePreferences({ theme: "javascript:evil", locale: "xx", transparency: "unknown" }),
    ).toEqual({
      theme: "system",
      locale: "en",
      transparency: "full",
    });
  });

  it("uses system light color scheme and a solid high-contrast option", () => {
    expect(resolveAppearance("system", true)).toEqual({ theme: "auto", contrast: "standard" });
    expect(resolveAppearance("high-contrast", false)).toEqual({ theme: "dark", contrast: "high" });
  });

  it("falls back on denied or corrupted local storage, without throwing", () => {
    const denied = {
      getItem: (_key: string) => {
        throw new Error("denied");
      },
      setItem: (_key: string, _value: string) => {
        throw new Error("denied");
      },
    };
    expect(readPreferences(denied)).toEqual({
      theme: "system",
      locale: "en",
      transparency: "full",
    });
    expect(savePreferences(denied, { theme: "light", locale: "en", transparency: "off" })).toBe(
      false,
    );
    expect(canReadStorage(denied)).toBe(false);
    expect(readPreferences({ getItem: () => "{not-json" })).toEqual({
      theme: "system",
      locale: "en",
      transparency: "full",
    });
  });
});

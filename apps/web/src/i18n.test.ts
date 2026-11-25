import { describe, expect, it } from "vitest";
import { createTranslations } from "./i18n";

describe("approved ICU localization", () => {
  it("interpolates names and ICU plurals", async () => {
    const translator = await createTranslations("en");
    expect(translator.t("app.welcome", { product: "Lyceum" })).toContain("Lyceum");
    expect(translator.t("setup.steps", { count: 1 })).toBe("1 step to begin");
    expect(translator.t("setup.steps", { count: 2 })).toBe("2 steps to begin");
  });

  it("switches language and falls back to English", async () => {
    const translator = await createTranslations("en");
    await translator.changeLanguage("es");
    expect(translator.t("navigation.today")).toBe("Hoy");
    expect(translator.t("setup.steps", { count: 2 })).toBe("2 pasos para empezar");
    await translator.changeLanguage("xx");
    expect(translator.t("navigation.today")).toBe("Today");
  });
});

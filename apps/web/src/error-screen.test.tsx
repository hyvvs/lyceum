import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createTranslations } from "./i18n";
import { ErrorScreen } from "./router";

describe("root application error fallback", () => {
  it("renders its retry/home actions without requiring the router context", async () => {
    const i18n = await createTranslations("en");
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ErrorScreen nativeHome retry={() => {}} />
      </I18nextProvider>,
    );
    expect(markup).toContain("This screen couldn&#x27;t load.");
    expect(markup).toContain('href="/"');
    expect(markup).toContain("Go to Today");
    expect(markup).toContain("Try again");
  });
});

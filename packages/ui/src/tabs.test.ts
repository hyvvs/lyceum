import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Tabs,
  TabsContent,
  type TabsContentProps,
  TabsList,
  type TabsListProps,
  TabsTrigger,
  type TabsTriggerProps,
} from "./tabs";

describe("Tabs semantic contract", () => {
  it("renders named tablist, non-submitting native triggers and associated panel", () => {
    const html = renderToStaticMarkup(
      createElement(
        "form",
        null,
        createElement(
          Tabs,
          { defaultValue: "review" },
          createElement(
            TabsList,
            { "aria-label": "Study sections" },
            createElement(TabsTrigger, { value: "review" }, "Review"),
            createElement(TabsTrigger, { value: "plan", disabled: true }, "Plan"),
          ),
          createElement(TabsContent, { value: "review" }, "Review material"),
          createElement(TabsContent, { value: "plan" }, "Plan material"),
        ),
      ),
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-controls="');
    expect(html).toContain('aria-labelledby="');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('disabled=""');
  });

  it("rejects replacing the native tab trigger with an arbitrary slotted element", () => {
    const invalid = { value: "review", asChild: true } as unknown as TabsTriggerProps;
    expect(() =>
      renderToStaticMarkup(
        createElement(Tabs, { defaultValue: "review" }, createElement(TabsTrigger, invalid)),
      ),
    ).toThrow("TabsTrigger must render a native button.");
  });

  it("rejects overriding tablist ARIA role even for untyped callers", () => {
    const invalid = {
      "aria-label": "Study sections",
      role: "presentation",
    } as unknown as TabsListProps;
    expect(() =>
      renderToStaticMarkup(
        createElement(Tabs, { defaultValue: "review" }, createElement(TabsList, invalid)),
      ),
    ).toThrow("TabsList must render a native tablist.");
  });

  it("rejects hidden or aria-hidden overrides that could remove active tabs from accessibility", () => {
    for (const unsafe of [{ "aria-hidden": true }, { hidden: true }]) {
      const list = { "aria-label": "Study sections", ...unsafe } as unknown as TabsListProps;
      expect(() =>
        renderToStaticMarkup(
          createElement(Tabs, { defaultValue: "review" }, createElement(TabsList, list)),
        ),
      ).toThrow("TabsList must render a native tablist.");
      const trigger = { value: "review", ...unsafe } as unknown as TabsTriggerProps;
      expect(() =>
        renderToStaticMarkup(
          createElement(Tabs, { defaultValue: "review" }, createElement(TabsTrigger, trigger)),
        ),
      ).toThrow("TabsTrigger must render a native button.");
      const content = { value: "review", ...unsafe } as unknown as TabsContentProps;
      expect(() =>
        renderToStaticMarkup(
          createElement(Tabs, { defaultValue: "review" }, createElement(TabsContent, content)),
        ),
      ).toThrow("TabsContent must render a native tab panel.");
    }
  });

  it("rejects replacing the associated tab panel with a slotted element", () => {
    const invalid = { value: "review", asChild: true } as unknown as TabsContentProps;
    expect(() =>
      renderToStaticMarkup(
        createElement(Tabs, { defaultValue: "review" }, createElement(TabsContent, invalid)),
      ),
    ).toThrow("TabsContent must render a native tab panel.");
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlassCard } from "./glass-card";
import { GlassPanel } from "./glass-panel";
import { TintCard } from "./tint-card";

describe("M0-017 Slice A native, constrained glass surfaces", () => {
  it("maps four panel levels to the pre-existing CSS recipes and native attributes", () => {
    const recipes = {
      standard: "glass",
      raised: "glass-raised",
      floating: "glass-float",
      reading: "glass-reading",
    } as const;
    for (const [level, recipe] of Object.entries(recipes)) {
      const html = renderToStaticMarkup(
        createElement(
          GlassPanel,
          {
            level: level as keyof typeof recipes,
            id: "study-panel",
            className: "extra",
            "aria-labelledby": "heading",
          },
          createElement("h2", { id: "heading" }, "Study layout"),
        ),
      );
      expect(html).toContain("<section");
      expect(html).toContain('aria-labelledby="heading"');
      expect(html).toContain('id="study-panel"');
      expect(html).toContain(`class="${recipe} lyceum-glass-panel extra"`);
      expect(html).toContain("Study layout");
    }
  });

  it("keeps cards semantic and limits their levels to existing standard/raised variants", () => {
    const standard = renderToStaticMarkup(
      createElement(GlassCard, { id: "card", title: "ignored" }, "A"),
    );
    expect(standard).toContain("<article");
    expect(standard).toContain('class="glass lyceum-glass-card"');
    expect(standard).toContain("A");
    const raised = renderToStaticMarkup(
      createElement(
        GlassCard,
        { level: "raised", className: "custom", "aria-label": "Preview card" },
        "B",
      ),
    );
    expect(raised).toContain("glass-raised lyceum-glass-card custom");
    expect(raised).toContain('aria-label="Preview card"');
  });

  it("constrains category tint to the five allowed hues without an arbitrary inline-color API", () => {
    for (const hue of ["blue", "amber", "purple", "green", "red"] as const) {
      const html = renderToStaticMarkup(
        createElement(TintCard, { hue, "aria-label": `${hue} category` }, "Example"),
      );
      expect(html).toContain("<article");
      expect(html).toContain('class="glass-tint lyceum-tint-card"');
      expect(html).toContain(`data-hue="${hue}"`);
      expect(html).toContain(`aria-label="${hue} category"`);
      expect(html).not.toContain("style=");
    }
  });
});

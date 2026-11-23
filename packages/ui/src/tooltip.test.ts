import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Tooltip,
  TooltipContent,
  type TooltipContentProps,
  type TooltipProps,
  TooltipProvider,
  type TooltipProviderProps,
  TooltipTrigger,
} from "./tooltip";

describe("Tooltip semantic contract", () => {
  it("renders a native button trigger with its accessible name on the server", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(Tooltip, null, createElement(TooltipTrigger, null, "Review hint details")),
      ),
    );
    expect(markup).toContain("Review hint details");
    expect(markup).toContain("<button");
    expect(markup).toContain('type="button"');
  });

  it("uses a non-submitting native button even when nested inside a form", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "form",
        null,
        createElement(
          TooltipProvider,
          null,
          createElement(Tooltip, null, createElement(TooltipTrigger, null, "Help")),
        ),
      ),
    );
    expect(markup).toMatch(/<form><button[^>]*type="button"[^>]*>Help<\/button><\/form>/);
  });

  it("requires nonblank tooltip text even for untyped callers", () => {
    expect(() =>
      renderToStaticMarkup(
        createElement(
          TooltipProvider,
          null,
          createElement(Tooltip, null, createElement(TooltipContent, { text: " " })),
        ),
      ),
    ).toThrow("TooltipContent requires nonempty text.");
  });

  it("does not allow pointer hoverability to be disabled on root or provider", () => {
    const invalidRoot = { disableHoverableContent: true } as unknown as TooltipProps;
    expect(() => renderToStaticMarkup(createElement(Tooltip, invalidRoot))).toThrow(
      "Tooltip must remain hoverable for accessible pointer use.",
    );
    const invalidProvider = { disableHoverableContent: true } as unknown as TooltipProviderProps;
    expect(() => renderToStaticMarkup(createElement(TooltipProvider, invalidProvider))).toThrow(
      "Tooltip must remain hoverable for accessible pointer use.",
    );
  });

  it("rejects content accessibility overrides that hide or mislabel text", () => {
    for (const override of [
      { "aria-label": "Different description" },
      { role: "presentation" },
      { "aria-hidden": true },
      { onEscapeKeyDown: (event: Event) => event.preventDefault() },
      { asChild: true },
      { children: "Different content" },
    ]) {
      const invalid = { text: "Visible hint information", ...override } as TooltipContentProps;
      expect(() =>
        renderToStaticMarkup(
          createElement(
            TooltipProvider,
            null,
            createElement(Tooltip, null, createElement(TooltipContent, invalid)),
          ),
        ),
      ).toThrow("TooltipContent text and accessibility semantics cannot be overridden.");
    }
  });
});

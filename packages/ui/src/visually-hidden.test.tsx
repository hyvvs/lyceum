import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { VisuallyHidden, type VisuallyHiddenProps } from "./visually-hidden";

const render = (props: VisuallyHiddenProps) =>
  renderToStaticMarkup(createElement(VisuallyHidden, props));

describe("VisuallyHidden text-only accessibility contract", () => {
  it("SSR renders a native span with Radix screen-reader-only positioning and no ARIA exclusion", () => {
    const html = render({ children: "Read next hint", id: "hint-label" });
    expect(html).toMatch(/^<span\b/);
    expect(html).toContain('id="hint-label"');
    expect(html).toContain("Read next hint</span>");
    expect(html).toContain("position:absolute");
    expect(html).toContain("clip:rect(0, 0, 0, 0)");
    expect(html).not.toContain("aria-hidden");
    expect(html).not.toContain("display:none");
    expect(html).not.toContain("visibility:hidden");
    expect(html).not.toContain("tabindex");
  });

  it("accepts zero as meaningful content and preserves language and RTL direction", () => {
    expect(render({ children: 0 })).toContain(">0</span>");
    const html = render({ children: "التلميح التالي", id: "arabic-hint", lang: "ar", dir: "rtl" });
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("التلميح التالي");
    expect(render({ children: "Continue", dir: "auto" })).toContain('dir="auto"');
  });

  it("composes with an icon-only Lyceum Button without an extra focusable element", () => {
    const html = renderToStaticMarkup(
      createElement(
        Button,
        { variant: "secondary" },
        createElement("span", { "aria-hidden": true }, "?"),
        <VisuallyHidden>Show help</VisuallyHidden>,
      ),
    );
    expect(html).toContain("<button");
    expect(html).toContain("Show help</span>");
    expect(html).not.toContain('aria-label="');
    expect(html).not.toContain("tabindex");
  });

  it("rejects blank, invalid, nonfinite or interactive children at runtime", () => {
    for (const children of [
      "",
      " \n\t ",
      "\u200B\u200D\u2060",
      "\uFE0F",
      null,
      undefined,
      true,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      ["text"],
      createElement("button", { type: "button" }, "Oops"),
    ]) {
      expect(() => render({ children } as unknown as VisuallyHiddenProps)).toThrow(
        /VisuallyHidden requires nonblank text or a finite number/,
      );
    }
  });

  it("rejects all unapproved props, including focus, ARIA, style and asChild overrides", () => {
    const unsafe = [
      { asChild: true },
      { style: { display: "block" } },
      { className: "visible" },
      { tabIndex: 0 },
      { role: "button" },
      { "aria-hidden": true },
      { "aria-label": "override" },
      { hidden: true },
      { onClick: () => undefined },
      { dangerouslySetInnerHTML: { __html: "unsafe" } },
      { "data-testid": "override" },
    ];
    for (const prop of unsafe) {
      expect(() => render({ children: "Help", ...prop } as VisuallyHiddenProps)).toThrow(
        /VisuallyHidden supports only children, id, lang and dir/,
      );
    }
  });

  it("rejects invalid optional attributes even from untyped callers", () => {
    for (const props of [
      { id: "  " },
      { id: 7 },
      { lang: "  " },
      { lang: true },
      { dir: "sideways" },
      { dir: false },
    ]) {
      expect(() => render({ children: "Help", ...props } as VisuallyHiddenProps)).toThrow(
        /VisuallyHidden (id|lang|dir)/,
      );
    }
  });
});

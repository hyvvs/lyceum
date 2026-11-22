import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, type ButtonProps } from "./button";

const render = (props: Parameters<typeof Button>[0], text = "Continue") =>
  renderToStaticMarkup(createElement(Button, props, text));

describe("Button accessibility contract", () => {
  it("renders a semantic native button with a safe default type and name", () => {
    const html = render({});
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain("Continue");
  });

  it("preserves native submit and form attributes", () => {
    const html = render({ type: "submit", name: "intent", value: "save", variant: "secondary" });
    expect(html).toContain('type="submit"');
    expect(html).toContain('name="intent"');
    expect(html).toContain('value="save"');
    expect(html).toContain('data-variant="secondary"');
  });

  it("retains focusability but blocks activation while loading", () => {
    const html = render({ loading: true }, "Save answer");
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain(' disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Save answer");
    expect(html).toContain('aria-hidden="true"');
  });

  it("respects disabled and custom class names", () => {
    const html = render({ disabled: true, variant: "danger", className: "extra" });
    expect(html).toContain("disabled");
    expect(html).toContain("extra");
    expect(html).toContain('data-variant="danger"');
  });

  it("uses the Radix Slot for an accessible link without nesting a button", () => {
    const html = renderToStaticMarkup(
      createElement(
        Button,
        { asChild: true, variant: "ghost" },
        createElement("a", { href: "/practice" }, "Open practice"),
      ),
    );
    expect(html).toContain("<a");
    expect(html).toContain('href="/practice"');
    expect(html).toContain("Open practice");
    expect(html).not.toContain("<button");
  });

  it("rejects disabled and loading slotted links rather than leaving navigation unguarded", () => {
    for (const props of [{ disabled: true }, { loading: true }]) {
      expect(() =>
        renderToStaticMarkup(
          createElement(
            Button,
            { asChild: true, ...props } as unknown as ButtonProps,
            createElement("a", { href: "/practice" }, "Open practice"),
          ),
        ),
      ).toThrow(/asChild cannot be disabled or loading/);
    }
  });
});

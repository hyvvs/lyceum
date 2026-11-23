import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Select,
  SelectContent,
  type SelectContentProps,
  SelectItem,
  type SelectItemProps,
  SelectTrigger,
  type SelectTriggerProps,
  SelectValue,
} from "./select";

describe("Select native accessibility contract", () => {
  it("renders a native non-submit combobox even inside a form", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "form",
        null,
        createElement(
          Select,
          { defaultValue: "math" },
          createElement(
            SelectTrigger,
            { "aria-label": "Study topic" },
            createElement(SelectValue, { placeholder: "Choose a topic" }),
          ),
          createElement(
            SelectContent,
            null,
            createElement(SelectItem, { value: "math" }, "Mathematics"),
          ),
        ),
      ),
    );
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Study topic"');
    expect(markup).toContain('aria-expanded="false"');
    // ARIA combobox implies the listbox popup; Radix only sets aria-controls while open.
    expect(markup).toContain('aria-autocomplete="none"');
  });

  it("does not permit slotted triggers or overrides of native combobox semantics", () => {
    for (const override of [
      { asChild: true },
      { type: "submit" },
      { role: "link" },
      { "aria-hidden": true },
      { hidden: true },
      { "aria-expanded": true },
      { "aria-controls": "foreign" },
    ]) {
      const props = { "aria-label": "Study topic", ...override } as SelectTriggerProps;
      expect(() =>
        renderToStaticMarkup(createElement(Select, null, createElement(SelectTrigger, props))),
      ).toThrow("SelectTrigger must remain a native, visible combobox button.");
    }
  });

  it("rejects unsafe content overrides, including disabling Escape and focus return", () => {
    for (const override of [
      { asChild: true },
      { role: "dialog" },
      { "aria-hidden": true },
      { onEscapeKeyDown: (event: Event) => event.preventDefault() },
      { onCloseAutoFocus: (event: Event) => event.preventDefault() },
    ]) {
      const props = override as SelectContentProps;
      expect(() => renderToStaticMarkup(createElement(SelectContent, props))).toThrow(
        "SelectContent must preserve listbox, Escape and focus restoration.",
      );
    }
  });

  it("rejects empty option values and replacement of native options", () => {
    for (const props of [
      { value: "" },
      { value: "math", asChild: true },
      { value: "math", role: "menuitem" },
      { value: "math", "aria-hidden": true },
      { value: "math", hidden: true },
    ]) {
      const invalid = props as SelectItemProps;
      expect(() => renderToStaticMarkup(createElement(SelectItem, invalid, "Mathematics"))).toThrow(
        "SelectItem requires a nonempty value and native, visible option semantics.",
      );
    }
  });
});

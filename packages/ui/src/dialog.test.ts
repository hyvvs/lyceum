import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, type DialogContentProps, type DialogProps } from "./dialog";

describe("Dialog public modal contract", () => {
  it("rejects nonmodal misuse even when passed through untyped JavaScript", () => {
    const invalid = { modal: false } as unknown as DialogProps;
    expect(() => renderToStaticMarkup(createElement(Dialog, invalid))).toThrow(
      "Dialog always uses modal focus containment.",
    );
  });

  it("rejects slotted content because the wrapper needs multiple labeled children", () => {
    const invalid = {
      title: "Study preferences",
      description: "Choose presentation settings.",
      asChild: true,
    } as unknown as DialogContentProps;
    expect(() =>
      renderToStaticMarkup(createElement(Dialog, null, createElement(DialogContent, invalid))),
    ).toThrow("DialogContent cannot use asChild because it renders multiple labeled children.");
  });

  it("requires visible, nonblank accessible names and descriptions", () => {
    const invalid = { title: "  ", description: "Some context" };
    expect(() =>
      renderToStaticMarkup(createElement(Dialog, null, createElement(DialogContent, invalid))),
    ).toThrow("DialogContent requires a nonempty title and description.");
    const missingDescription = { title: "Study preferences", description: "" };
    expect(() =>
      renderToStaticMarkup(
        createElement(Dialog, null, createElement(DialogContent, missingDescription)),
      ),
    ).toThrow("DialogContent requires a nonempty title and description.");
  });
});

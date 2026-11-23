import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

function renderToast(props: React.ComponentProps<typeof Toast> = {}) {
  return renderToStaticMarkup(
    <ToastProvider label="Study notification">
      <Toast {...props}>
        <ToastTitle>Plan saved</ToastTitle>
        <ToastDescription>Available on Today.</ToastDescription>
        <ToastAction altText="Find the plan on Today">View plan</ToastAction>
        <ToastClose aria-label="Dismiss notification">Close</ToastClose>
      </Toast>
      <ToastViewport label="Study notifications ({hotkey})" />
    </ToastProvider>,
  );
}

describe("accessible Toast wrapper contract", () => {
  it("renders all approved primitives safely on the server", () => {
    expect(renderToast()).toContain("Study notifications (F8)");
  });

  it("rejects empty provider and viewport labels", () => {
    expect(() =>
      renderToStaticMarkup(
        <ToastProvider label=" ">
          <ToastViewport label="Notifications ({hotkey})" />
        </ToastProvider>,
      ),
    ).toThrow(/label/);
    expect(() =>
      renderToStaticMarkup(
        <ToastProvider label="Notice">
          <ToastViewport label=" " />
        </ToastProvider>,
      ),
    ).toThrow(/label/);
  });

  it("rejects invalid durations and conflicting persistence settings", () => {
    expect(() => renderToast({ durationMs: -10 })).toThrow(/durationMs/);
    expect(() => renderToast({ durationMs: Number.NaN })).toThrow(/durationMs/);
    expect(() => renderToast({ persistent: true, durationMs: 3000 })).toThrow(/persistent/);
  });

  it("rejects caller attempts to override Radix live priority and structural semantics", () => {
    expect(() => renderToast({ type: "foreground" } as React.ComponentProps<typeof Toast>)).toThrow(
      /type/,
    );
    expect(() => renderToast({ role: "alert" } as React.ComponentProps<typeof Toast>)).toThrow(
      /role/,
    );
    for (const invalid of [
      { asChild: true },
      { hidden: true },
      { tabIndex: -1 },
      { onEscapeKeyDown: () => {} },
      { onKeyDown: () => {} },
    ]) {
      expect(() => renderToast(invalid as React.ComponentProps<typeof Toast>)).toThrow(/semantics/);
    }
    for (const invalid of [{ asChild: true }, { hidden: true }, { tabIndex: -1 }, { hotkey: [] }]) {
      expect(() =>
        renderToStaticMarkup(
          <ToastProvider label="Notice">
            <ToastViewport
              {...(invalid as React.ComponentProps<typeof ToastViewport>)}
              label="Notifications ({hotkey})"
            />
          </ToastProvider>,
        ),
      ).toThrow(/semantics/);
    }
  });

  it("requires readable text for optional actions and accessible dismissal", () => {
    expect(() =>
      renderToStaticMarkup(
        <ToastProvider label="Notice">
          <ToastAction altText=" ">Action</ToastAction>
          <ToastViewport label="Notifications ({hotkey})" />
        </ToastProvider>,
      ),
    ).toThrow(/altText/);
    expect(() =>
      renderToStaticMarkup(
        <ToastProvider label="Notice">
          <ToastClose aria-label=" ">Close</ToastClose>
          <ToastViewport label="Notifications ({hotkey})" />
        </ToastProvider>,
      ),
    ).toThrow(/aria-label/);
  });
});

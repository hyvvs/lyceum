import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { VisuallyHidden } from "./visually-hidden";

type DemoState = "ready" | "loading" | "error" | "empty" | "long" | "zero";

function VisuallyHiddenDemo({
  state = "ready",
  dir,
  lang,
  focus = false,
  disabled = false,
}: {
  state?: DemoState;
  dir?: "rtl" | "ltr";
  lang?: string;
  focus?: boolean;
  disabled?: boolean;
}) {
  const labels: Record<DemoState, string | number> = {
    ready: "Open hint details",
    loading: "Hint details are loading",
    error: "Hint details are unavailable",
    empty: "No hint details are available",
    long: "Open the detailed study hint explaining the next safe step to take in this learning session",
    zero: 0,
  };
  const label = dir === "rtl" ? "افتح تفاصيل التلميح" : labels[state];
  const spanRef = useRef<HTMLSpanElement>(null);
  const [refNode, setRefNode] = useState("pending");
  useEffect(() => {
    setRefNode(spanRef.current?.tagName ?? "missing");
  }, []);

  return (
    <div dir={dir}>
      <Button variant="secondary" aria-label="Reference help action" disabled={disabled}>
        <span aria-hidden="true">?</span>
      </Button>
      <Button
        variant="secondary"
        autoFocus={focus}
        disabled={disabled}
        loading={state === "loading"}
      >
        <span aria-hidden="true">?</span>
        <VisuallyHidden
          id="hint-action-label"
          {...(lang === undefined ? {} : { lang })}
          {...(dir === undefined ? {} : { dir })}
          ref={spanRef}
        >
          {label}
        </VisuallyHidden>
      </Button>
      {state !== "long" && (
        <output data-testid="hidden-ref-target">Hidden text ref points to: {refNode}</output>
      )}
    </div>
  );
}

const meta = {
  title: "Primitives/VisuallyHidden",
  component: VisuallyHiddenDemo,
  parameters: { a11y: { test: "error" } },
  tags: ["autodocs"],
} satisfies Meta<typeof VisuallyHiddenDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <VisuallyHiddenDemo /> };
export const Hover: Story = { render: () => <VisuallyHiddenDemo /> };
export const Focus: Story = { render: () => <VisuallyHiddenDemo focus /> };
export const Disabled: Story = { render: () => <VisuallyHiddenDemo disabled /> };
export const Loading: Story = { render: () => <VisuallyHiddenDemo state="loading" /> };
export const ErrorAction: Story = { render: () => <VisuallyHiddenDemo state="error" /> };
export const Empty: Story = { render: () => <VisuallyHiddenDemo state="empty" /> };
export const LongText: Story = { render: () => <VisuallyHiddenDemo state="long" /> };
export const NumericZero: Story = { render: () => <VisuallyHiddenDemo state="zero" /> };
export const RTL: Story = { render: () => <VisuallyHiddenDemo dir="rtl" lang="ar" /> };
export const DoubleText: Story = {
  globals: { textScale: "200%" },
  render: () => <VisuallyHiddenDemo state="long" />,
};
export const Light: Story = {
  globals: { theme: "light" },
  render: () => <VisuallyHiddenDemo />,
};
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
  render: () => <VisuallyHiddenDemo />,
};
export const Opaque: Story = {
  globals: { transparency: "off" },
  render: () => <VisuallyHiddenDemo />,
};
export const ReducedMotion: Story = {
  globals: { motion: "reduced" },
  render: () => <VisuallyHiddenDemo />,
};

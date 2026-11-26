import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RoundIconButton } from "./round-icon-button";

const icon = <span aria-hidden="true">✉</span>;
const meta = {
  title: "Primitives/RoundIconButton",
  component: RoundIconButton,
  tags: ["autodocs"],
  args: { "aria-label": "Open messages", icon },
  parameters: { stageSurface: "flat", a11y: { test: "error" } },
} satisfies Meta<typeof RoundIconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Badge: Story = {
  args: { badge: { text: "3", label: "3 unread messages" } },
};
export const StatusDot: Story = {
  args: { badge: { label: "New messages available" } },
};
export const Pressed: Story = { args: { "aria-pressed": true } };
export const Hover: Story = {};
export const Focus: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const ErrorAction: Story = {
  args: { "aria-label": "Retry the failed operation", icon: <span aria-hidden="true">↻</span> },
};
export const Empty: Story = {
  args: { "aria-label": "No new messages", icon: <span aria-hidden="true">✉</span> },
};
export const LongText: Story = {
  args: { "aria-label": "Open the list of recently received study notification messages" },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <RoundIconButton {...args} />
    </div>
  ),
};
export const DarkFull: Story = { globals: { theme: "dark", transparency: "full" } };
export const Light: Story = { globals: { theme: "light" } };
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
};
export const DoubleText: Story = { globals: { textScale: "200%" } };
export const ReducedTransparency: Story = { globals: { transparency: "reduced" } };
export const Opaque: Story = { globals: { transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" } };

function ActionDemo() {
  const [count, setCount] = useState(0);
  return (
    <div className="storybook-stack">
      <RoundIconButton
        aria-label="Open messages"
        icon={icon}
        onClick={() => setCount((n) => n + 1)}
      />
      <output>Activations: {count}</output>
    </div>
  );
}
function BusyDemo() {
  const [count, setCount] = useState(0);
  return (
    <div className="storybook-stack">
      <RoundIconButton
        aria-label="Open messages"
        icon={icon}
        loading
        onClick={() => setCount((n) => n + 1)}
      />
      <output>Activations: {count}</output>
    </div>
  );
}
export const Interactive: Story = { render: () => <ActionDemo /> };
export const LoadingInteractive: Story = { render: () => <BusyDemo /> };

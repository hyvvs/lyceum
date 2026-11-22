import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, type ButtonProps } from "./button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Continue learning" },
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Hover: Story = {
  parameters: { docs: { description: { story: "Hover to preview the raised state." } } },
};
export const Focus: Story = { args: { autoFocus: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true, children: "Save answer" } };
export const ErrorAction: Story = { args: { variant: "danger", children: "Try again" } };
export const Empty: Story = {
  args: {
    children: <span aria-hidden="true">•••</span>,
    "aria-label": "More options",
    variant: "ghost",
  },
};
export const LongText: Story = {
  args: { children: "Continue to a very long practice assignment with explanations and feedback" },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <Button {...args} />
    </div>
  ),
};
export const Light: Story = { globals: { theme: "light" } };
export const LightSecondary: Story = {
  globals: { theme: "light" },
  args: { variant: "secondary" },
};
export const LightGhost: Story = { globals: { theme: "light" }, args: { variant: "ghost" } };
export const Dark: Story = { globals: { theme: "dark" } };
export const HighContrast: Story = { globals: { contrast: "high", transparency: "off" } };
export const DoubleText: Story = { globals: { textScale: "200%" } };
export const ReducedTransparency: Story = { globals: { transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" }, args: { loading: true } };
export const AsChildLink: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Styles a semantic link. Disabled or loading states are only available on native buttons.",
      },
    },
  },
  render: () => (
    <div className="storybook-stack">
      <Button asChild variant="ghost">
        <a href="#practice">Open practice</a>
      </Button>
      <section id="practice" aria-label="Practice destination">
        Practice destination
      </section>
    </div>
  ),
};

function SlottedDemo() {
  const [child, setChild] = useState(0);
  const [parent, setParent] = useState(0);
  return (
    <div className="storybook-stack">
      <Button asChild variant="ghost" onClick={() => setParent((count) => count + 1)}>
        <button type="button" onClick={() => setChild((count) => count + 1)}>
          Open practice action
        </button>
      </Button>
      <output>
        Child: {child}, Parent: {parent}
      </output>
    </div>
  );
}

export const AsChildInteractive: Story = { render: () => <SlottedDemo /> };

function InteractiveDemo(props: ButtonProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="storybook-stack">
      <Button {...props} onClick={() => setCount((value) => value + 1)} />
      <output>Activations: {count}</output>
    </div>
  );
}

export const Interactive: Story = {
  render: (args) => <InteractiveDemo {...args} />,
};

export const LoadingInteractive: Story = {
  args: { loading: true, children: "Save answer" },
  render: (args) => <InteractiveDemo {...args} />,
};

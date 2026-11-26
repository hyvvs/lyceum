import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { type SegmentOption, SegmentedControl } from "./segmented-control";

const options: readonly SegmentOption[] = [
  { value: "brief", label: "Brief" },
  { value: "standard", label: "Standard" },
  { value: "extended", label: "Extended" },
];
const meta = {
  title: "Primitives/SegmentedControl",
  component: SegmentedControl,
  tags: ["autodocs"],
  args: {
    groupLabel: "Sample session length",
    name: "sample-length",
    value: "standard",
    options,
    onValueChange: () => {},
  },
  parameters: { stageSurface: "flat", a11y: { test: "error" } },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

function ChoiceDemo({
  options: choices = options,
  disabled = false,
  dir,
}: {
  options?: readonly SegmentOption[];
  disabled?: boolean;
  dir?: "ltr" | "rtl";
}) {
  const [value, setValue] = useState(choices[0]?.value ?? "");
  return (
    <div className="storybook-stack">
      <SegmentedControl
        groupLabel="Sample session length"
        name="sample-length"
        value={value}
        options={choices}
        onValueChange={setValue}
        disabled={disabled}
        {...(dir ? { dir } : {})}
      />
      <output>Selected: {value || "None"}</output>
    </div>
  );
}
export const Default: Story = { render: () => <ChoiceDemo /> };
export const Hover: Story = { render: () => <ChoiceDemo /> };
export const Focus: Story = { render: () => <ChoiceDemo /> };
export const Selected: Story = { render: () => <ChoiceDemo /> };
export const Disabled: Story = {
  render: () => <ChoiceDemo disabled />,
};
export const DisabledOption: Story = {
  render: () => (
    <ChoiceDemo
      options={[
        { value: "brief", label: "Brief" },
        { value: "standard", label: "Standard" },
        { value: "extended", label: "Extended", disabled: true },
      ]}
    />
  ),
};
export const Empty: Story = {
  args: { value: "", options: [] },
};
export const LongText: Story = {
  render: () => (
    <ChoiceDemo
      options={[
        { value: "brief", label: "A short focused session of practice and retrieval" },
        {
          value: "standard",
          label: "A medium-length session including additional questions and feedback",
        },
        { value: "extended", label: "An extended session with extra review opportunities" },
      ]}
    />
  ),
};
export const ErrorState: Story = {
  render: () => (
    <div className="storybook-stack">
      <ChoiceDemo />
      <p role="alert">Sample choice was not saved.</p>
    </div>
  ),
};
export const RTL: Story = { render: () => <ChoiceDemo dir="rtl" /> };
export const Light: Story = { globals: { theme: "light" }, render: () => <ChoiceDemo /> };
export const DarkFull: Story = {
  globals: { theme: "dark", transparency: "full" },
  render: () => <ChoiceDemo />,
};
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
  render: () => <ChoiceDemo />,
};
export const DoubleText: Story = { globals: { textScale: "200%" }, render: () => <ChoiceDemo /> };
export const ReducedTransparency: Story = {
  globals: { transparency: "reduced" },
  render: () => <ChoiceDemo />,
};
export const Opaque: Story = { globals: { transparency: "off" }, render: () => <ChoiceDemo /> };
export const ReducedMotion: Story = { globals: { motion: "off" }, render: () => <ChoiceDemo /> };
export const Interactive: Story = { render: () => <ChoiceDemo /> };

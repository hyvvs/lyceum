import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ListRow, type ListRowProps } from "./list-row";

function Demo(args: ListRowProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="storybook-stack">
      <ListRow {...args} onActivate={() => setCount((n) => n + 1)} />
      <output>Opened {count} times</output>
    </div>
  );
}
const meta = {
  title: "Primitives/ListRow",
  component: ListRow,
  tags: ["autodocs"],
  args: { title: "Review integration rules", detail: "09:00", mode: "review" },
  parameters: { a11y: { test: "error" } },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof ListRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const ErrorState: Story = { args: { title: "Review unavailable", detail: "Try again" } };
export const Empty: Story = {
  args: { title: "No activity", detail: "Nothing scheduled" },
  render: (args) => <ListRow {...args} />,
};
export const LongText: Story = {
  args: {
    title:
      "Review a particularly long explanation of the relationship between concepts before tomorrow's practice session",
    detail: "A long additional description",
  },
};
export const Modes: Story = {
  render: () => (
    <div className="storybook-stack">
      {(["review", "learn", "practice", "repair"] as const).map((mode) => (
        <ListRow key={mode} mode={mode} title="Sample task" />
      ))}
    </div>
  ),
};
export const Hover: Story = {
  parameters: {
    docs: { description: { story: "Hover the control to preview its interactive state." } },
  },
};
export const Focus: Story = {
  parameters: {
    docs: { description: { story: "Tab to the action to inspect its focus indicator." } },
  },
};
export const RTL: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};
export const Dark: Story = { globals: { theme: "dark" } };
export const Light: Story = { globals: { theme: "light" } };
export const HighContrast: Story = { globals: { contrast: "high", transparency: "off" } };
export const DoubleText: Story = { globals: { textScale: "200%" } };
export const ReducedTransparency: Story = { globals: { transparency: "reduced" } };
export const Opaque: Story = { globals: { transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" } };

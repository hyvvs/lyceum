import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatCard } from "./stat-card";

const meta = {
  title: "Primitives/StatCard",
  component: StatCard,
  tags: ["autodocs"],
  args: { label: "Sample practice attempts", value: 12, icon: <span aria-hidden="true">∑</span> },
  parameters: {
    stageSurface: "flat",
    a11y: { test: "error" },
    docs: {
      description: { component: "Synthetic display-only measurements; no learner data or engine." },
    },
  },
} satisfies Meta<typeof StatCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDelta: Story = {
  args: {
    delta: { direction: "decrease", text: "2 fewer", context: "compared with prior period" },
  },
};
export const WithTrend: Story = {
  args: {
    trend: {
      samples: [3, 6, 6, 10, 12],
      description: "Sample practice count rose over five comparison points.",
    },
  },
};
export const Zero: Story = { args: { value: 0, icon: undefined } };
export const Negative: Story = {
  args: {
    value: -3,
    delta: { direction: "increase", text: "Up by one", context: "from a lower signed baseline" },
  },
};
export const NoData: Story = { args: { value: null, icon: undefined } };
export const Hover: Story = {};
export const ErrorState: Story = {
  args: { value: null, unavailableLabel: "Measurement unavailable after a failed refresh" },
};
export const LongText: Story = {
  args: { label: "A very long sample measurement that should wrap without horizontal overflow" },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <StatCard {...args} />
    </div>
  ),
};
export const Light: Story = { globals: { theme: "light" } };
export const DarkFull: Story = { globals: { theme: "dark", transparency: "full" } };
export const HighContrast: Story = { globals: { contrast: "high", transparency: "off" } };
export const DoubleText: Story = { globals: { textScale: "200%" } };
export const ReducedTransparency: Story = { globals: { transparency: "reduced" } };
export const Opaque: Story = { globals: { transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" } };

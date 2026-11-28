import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, Chip } from "./chip";

const meta = {
  title: "Primitives/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { children: "Review", tone: "neutral" },
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const ErrorState: Story = { args: { tone: "danger", children: "Unavailable" } };
export const Empty: Story = { args: { children: "Uncategorized" } };
export const Loading: Story = { args: { children: "Loading…" } };
export const Disabled: Story = { args: { children: "Unavailable", tone: "neutral" } };
export const LongText: Story = {
  args: { children: "A particularly long category label for a sample learning activity" },
};
export const Badges: Story = {
  render: () => (
    <div className="storybook-stack">
      <Badge tone="positive">Ready</Badge>
      <Badge tone="warning">Review due</Badge>
      <Badge tone="danger">Unavailable</Badge>
      <Badge>12</Badge>
    </div>
  ),
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

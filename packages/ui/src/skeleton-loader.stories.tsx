import type { Meta, StoryObj } from "@storybook/react-vite";
import { SkeletonLoader } from "./skeleton-loader";

const meta = {
  title: "Primitives/SkeletonLoader",
  component: SkeletonLoader,
  tags: ["autodocs"],
  args: { label: "Loading example plan" },
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof SkeletonLoader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Loading: Story = {};
export const Empty: Story = { args: { label: "Waiting for sample content", lines: [] } };
export const LongText: Story = {
  args: {
    label: "Loading a particularly long example learning plan with multiple sample activities",
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

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Popover } from "./popover";

const meta = {
  title: "Primitives/Popover",
  component: Popover,
  tags: ["autodocs"],
  args: {
    triggerLabel: "Open details",
    title: "Sample details",
    description: "Local demonstration only.",
    children: <p>Review information is available here.</p>,
  },
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const ErrorState: Story = {
  args: {
    defaultOpen: true,
    title: "Details unavailable",
    children: <p>Could not open sample details.</p>,
  },
};
export const Empty: Story = { args: { defaultOpen: true, children: <p>No details yet.</p> } };
export const LongText: Story = {
  args: {
    defaultOpen: true,
    title: "A longer title for a demonstration disclosure",
    children: (
      <p>
        Some detailed text that should wrap naturally inside the floating surface without
        overflowing.
      </p>
    ),
  },
};
export const Open: Story = { args: { defaultOpen: true } };
export const Focus: Story = { args: { defaultOpen: true } };
export const Hover: Story = {
  parameters: {
    docs: { description: { story: "Hover the control to preview its interactive state." } },
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

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  args: { label: "Learning goal", placeholder: "Enter a goal" },
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true, defaultValue: "Sample goal" } };
export const Loading: Story = { args: { loading: true, defaultValue: "Checking sample goal" } };
export const ErrorState: Story = { args: { error: "Enter a learning goal", required: true } };
export const Empty: Story = { args: { defaultValue: "" } };
export const LongText: Story = {
  args: {
    label: "Describe the concept you want to understand by the end of your next practice session",
    description: "Use your own words to explain your goal and include any constraints.",
    defaultValue: "A very long example learning goal",
  },
};
export const Focus: Story = { args: { autoFocus: true } };
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

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./avatar";

const meta = {
  title: "Primitives/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { name: "Alex Rivera", status: "online" },
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const ErrorState: Story = { args: { src: "data:image/png;base64,invalid" } };
export const Empty: Story = { args: { name: "Unknown learner", initials: "?" } };
export const Loading: Story = { args: { name: "Profile loading", initials: "…" } };
export const Disabled: Story = { args: { status: "offline" } };
export const LongText: Story = { args: { name: "Alexandra María Rivera Fernández de la Vega" } };
export const Busy: Story = { args: { status: "busy" } };

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

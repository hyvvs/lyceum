import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { EmptyStateCard, type EmptyStateCardProps } from "./empty-state-card";

function Demo(args: EmptyStateCardProps) {
  const [added, setAdded] = useState(false);
  return added ? (
    <EmptyStateCard title="Sample source added" description="This is a local demonstration." />
  ) : (
    <EmptyStateCard
      {...args}
      action={{ label: "Add sample source", onActivate: () => setAdded(true), ...args.action }}
    />
  );
}
const meta = {
  title: "Primitives/EmptyStateCard",
  component: EmptyStateCard,
  tags: ["autodocs"],
  args: { title: "No sources yet", description: "Add a source to begin building your library." },
  parameters: { a11y: { test: "error" } },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof EmptyStateCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = {
  args: { action: { label: "Add sample source", onActivate: () => {}, disabled: true } },
};
export const Loading: Story = {
  args: { action: { label: "Adding sample source", onActivate: () => {}, loading: true } },
};
export const ErrorState: Story = {
  args: { title: "Source unavailable", description: "The example source could not be opened." },
};
export const Empty: Story = { render: (args) => <EmptyStateCard {...args} /> };
export const LongText: Story = {
  args: {
    title: "No sources for this particularly long example learning goal",
    description: "Add a source when you are ready to begin preparing a detailed learning plan.",
  },
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

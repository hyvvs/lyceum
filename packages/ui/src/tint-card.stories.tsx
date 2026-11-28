import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { TintCard } from "./tint-card";

const content = (
  <>
    <h2>Sources</h2>
    <p>Visual-only topic tile; no imported learner materials.</p>
    <Button type="button" variant="secondary">
      Preview category
    </Button>
  </>
);
const meta = {
  title: "Primitives/TintCard",
  component: TintCard,
  tags: ["autodocs"],
  args: { hue: "blue", children: content, "aria-label": "Category tile preview" },
  parameters: { stageSurface: "flat", a11y: { test: "error" } },
} satisfies Meta<typeof TintCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Blue: Story = {};
export const Default: Story = {};
export const Amber: Story = { args: { hue: "amber" } };
export const Purple: Story = { args: { hue: "purple" } };
export const Green: Story = { args: { hue: "green" } };
export const Red: Story = { args: { hue: "red" } };
export const Hover: Story = {
  parameters: {
    docs: {
      description: {
        story: "Tint is category meaning only; the container has no independent pointer behavior.",
      },
    },
  },
};
export const Focus: Story = {
  args: {
    children: (
      <>
        <h2>Category keyboard</h2>
        <Button type="button" variant="secondary" autoFocus>
          Focused tile action
        </Button>
      </>
    ),
  },
};
export const Disabled: Story = {
  args: {
    children: (
      <>
        <h2>Unavailable category</h2>
        <Button type="button" disabled>
          Not yet available
        </Button>
      </>
    ),
  },
};
export const Loading: Story = {
  args: {
    "aria-busy": true,
    children: (
      <>
        <h2>Loading sample</h2>
        <output>Waiting for preview…</output>
      </>
    ),
  },
};
export const ErrorState: Story = {
  args: {
    children: (
      <>
        <h2>Unavailable sample</h2>
        <p role="alert">The example failed to load.</p>
      </>
    ),
  },
};
export const Empty: Story = {
  args: {
    children: (
      <>
        <h2>No items yet</h2>
        <p>Categories are visual-only in this Storybook preview.</p>
      </>
    ),
  },
};
export const LongText: Story = {
  args: {
    children: (
      <>
        <h2>A long descriptive title for a hypothetical category</h2>
        <p>
          Long words, translations and larger font settings must wrap without obscuring the category
          or action.
        </p>
      </>
    ),
  },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <TintCard {...args} />
    </div>
  ),
};
export const Light: Story = {
  globals: { theme: "light", transparency: "full", backdrop: "atmospheric" },
};
export const DarkFull: Story = {
  globals: { theme: "dark", transparency: "full", backdrop: "atmospheric" },
};
export const HighContrast: Story = {
  globals: { theme: "light", contrast: "high", transparency: "off" },
};
export const DoubleText: Story = { globals: { textScale: "200%" } };
export const ReducedTransparency: Story = { globals: { transparency: "reduced" } };
export const Opaque: Story = { globals: { transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" } };

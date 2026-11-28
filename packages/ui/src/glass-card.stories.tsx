import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { GlassCard } from "./glass-card";

const content = (
  <>
    <h2>Unconfigured library</h2>
    <p>No personal resources have been imported.</p>
    <Button type="button" variant="secondary">
      View sample options
    </Button>
  </>
);
const meta = {
  title: "Primitives/GlassCard",
  component: GlassCard,
  tags: ["autodocs"],
  args: { children: content, "aria-label": "Library card preview" },
  parameters: { stageSurface: "flat", a11y: { test: "error" } },
} satisfies Meta<typeof GlassCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Raised: Story = { args: { level: "raised" } };
export const Hover: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "This noninteractive card has no container hover behavior; child controls own interaction.",
      },
    },
  },
};
export const Focus: Story = {
  args: {
    children: (
      <>
        <h2>Keyboard card</h2>
        <Button type="button" variant="secondary" autoFocus>
          Focused action
        </Button>
      </>
    ),
  },
};
export const Disabled: Story = {
  args: {
    children: (
      <>
        <h2>Unavailable option</h2>
        <Button type="button" disabled>
          Not ready
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
        <h2>Checking availability</h2>
        <output>Loading layout sample…</output>
      </>
    ),
  },
};
export const ErrorState: Story = {
  args: {
    children: (
      <>
        <h2>Sample unavailable</h2>
        <p role="alert">Preview could not be displayed.</p>
      </>
    ),
  },
};
export const Empty: Story = {
  args: {
    children: (
      <>
        <h2>No saved cards</h2>
        <p>Content appears when it exists on the device.</p>
      </>
    ),
  },
};
export const LongText: Story = {
  args: {
    children: (
      <>
        <h2>Accessible cards wrap long headings and explanations</h2>
        <p>
          Both the title and the body remain visible without being truncated at large text sizes and
          narrow layouts.
        </p>
      </>
    ),
  },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <GlassCard {...args} />
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

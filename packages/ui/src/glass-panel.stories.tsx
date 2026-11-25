import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { GlassPanel } from "./glass-panel";

const content = (
  <>
    <h2>Reading workspace</h2>
    <p>Keep explanations calm and legible on a near-opaque study surface.</p>
    <Button type="button" variant="secondary">
      Open layout options
    </Button>
  </>
);
const meta = {
  title: "Primitives/GlassPanel",
  component: GlassPanel,
  tags: ["autodocs"],
  args: { children: content, "aria-label": "Study surface preview" },
  parameters: { stageSurface: "flat", a11y: { test: "error" } },
} satisfies Meta<typeof GlassPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Raised: Story = { args: { level: "raised" } };
export const Floating: Story = { args: { level: "floating" } };
export const Reading: Story = { args: { level: "reading" } };
export const Hover: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The passive glass surface is intentionally inert on hover; child controls own hover feedback.",
      },
    },
  },
};
export const Focus: Story = {
  args: {
    children: (
      <>
        <h2>Keyboard focus</h2>
        <Button type="button" variant="secondary">
          Focused control
        </Button>
      </>
    ),
  },
};
export const Disabled: Story = {
  args: {
    children: (
      <>
        <h2>Disabled action</h2>
        <Button type="button" disabled>
          Not available
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
        <h2>Preparing a reading surface</h2>
        <output>Preparing preview…</output>
      </>
    ),
  },
};
export const ErrorState: Story = {
  args: {
    children: (
      <>
        <h2>Unable to load</h2>
        <p role="alert">The sample could not load.</p>
      </>
    ),
  },
};
export const Empty: Story = {
  args: {
    children: (
      <>
        <h2>Nothing saved yet</h2>
        <p>Configure your first learning goal when the feature is ready.</p>
      </>
    ),
  },
};
export const LongText: Story = {
  args: {
    children: (
      <>
        <h2>Long reading surface</h2>
        <p>
          Text must remain readable when the learner chooses a very large font, a narrow viewport,
          or an unfamiliar language. Explain the same point clearly without truncating important
          information.
        </p>
      </>
    ),
  },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <GlassPanel {...args} />
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

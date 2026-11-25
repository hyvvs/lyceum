import type { Meta, StoryObj } from "@storybook/react-vite";
import { PillNav } from "./pill-nav";

const links = (
  <>
    <a href="#today" aria-current="page">
      <span aria-hidden="true">⌂</span> Today
    </a>
    <a href="#settings">
      <span aria-hidden="true">⚙</span> Settings
    </a>
  </>
);
const meta = {
  title: "Primitives/PillNav",
  component: PillNav,
  args: { "aria-label": "Study navigation", children: links },
  tags: ["autodocs"],
  parameters: { stageSurface: "flat", a11y: { test: "error" } },
} satisfies Meta<typeof PillNav>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Hover: Story = {};
export const Focus: Story = {
  render: (args) => (
    <PillNav
      {...args}
      ref={(node) => {
        if (node) node.dataset.refProof = "attached";
      }}
    />
  ),
};
export const Empty: Story = { args: { children: null } };
export const Single: Story = {
  args: {
    children: (
      <a href="#today" aria-current="page">
        Today
      </a>
    ),
  },
};
export const Multiple: Story = {};
export const LongText: Story = {
  args: {
    children: (
      <>
        <a href="#today" aria-current="page">
          Review the materials available on this device today
        </a>
        <a href="#settings">Adjust language and transparency preferences</a>
      </>
    ),
  },
};
export const Loading: Story = {
  args: { "aria-busy": true, children: <output>Preparing navigation</output> },
};
export const ErrorState: Story = {
  args: { children: <span role="alert">Navigation temporarily unavailable</span> },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <PillNav {...args} />
    </div>
  ),
};
export const Light: Story = { globals: { theme: "light", transparency: "full" } };
export const DarkFull: Story = { globals: { theme: "dark", transparency: "full" } };
export const HighContrast: Story = {
  globals: { theme: "light", contrast: "high", transparency: "off" },
};
export const DoubleText: Story = { globals: { textScale: "200%" } };
export const ReducedTransparency: Story = { globals: { transparency: "reduced" } };
export const Opaque: Story = { globals: { transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" } };

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dock } from "./dock";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { VisuallyHidden } from "./visually-hidden";

function DockDemo({
  orientation = "vertical",
  single = false,
  empty = false,
  long = false,
}: {
  orientation?: "horizontal" | "vertical";
  single?: boolean;
  empty?: boolean;
  long?: boolean;
}) {
  return (
    <TooltipProvider>
      <Dock
        aria-label="Quick navigation"
        orientation={orientation}
        ref={(node) => {
          if (node) node.dataset.refProof = "attached";
        }}
      >
        {!empty &&
          (single ? ["Today"] : ["Today", "Settings"]).map((label, index) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <a
                  href={index === 0 ? "#today" : "#settings"}
                  aria-label={
                    long
                      ? `${label}: long descriptive destination label for this study workspace`
                      : label
                  }
                  aria-current={index === 0 ? "page" : undefined}
                >
                  <span aria-hidden="true">{index === 0 ? "⌂" : "⚙"}</span>
                  <VisuallyHidden>{label}</VisuallyHidden>
                </a>
              </TooltipTrigger>
              <TooltipContent text={label} />
            </Tooltip>
          ))}
      </Dock>
    </TooltipProvider>
  );
}

const meta = {
  title: "Primitives/Dock",
  component: DockDemo,
  tags: ["autodocs"],
  parameters: { stageSurface: "flat", a11y: { test: "error" } },
} satisfies Meta<typeof DockDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Hover: Story = {};
export const Focus: Story = {};
export const Horizontal: Story = { args: { orientation: "horizontal" } };
export const Vertical: Story = { args: { orientation: "vertical" } };
export const Empty: Story = { args: { empty: true } };
export const Single: Story = { args: { single: true } };
export const Multiple: Story = {};
export const LongText: Story = { args: { long: true } };
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <DockDemo {...args} />
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

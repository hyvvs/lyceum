import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

type StoryState = "standard" | "loading" | "error" | "empty" | "long" | "icon";

function TooltipDemo({
  state = "standard",
  disabled = false,
  dir,
  focusTrigger = false,
}: {
  state?: StoryState;
  disabled?: boolean;
  dir?: "rtl";
  focusTrigger?: boolean;
}) {
  const descriptions: Record<StoryState, string> = {
    standard: "Hints explain the next useful step.",
    loading: "Checking hint availability.",
    error: "Hint details are temporarily unavailable.",
    empty: "No additional hint information is available.",
    long: "Hints show one small step at a time. Read the question again, locate the important quantities, and decide which relationship is useful before calculating.",
    icon: "Hints explain the next useful step.",
  };
  const text = dir === "rtl" ? "توضح التلميحات الخطوة المفيدة التالية." : descriptions[state];
  return (
    <div dir={dir}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              autoFocus={focusTrigger}
              aria-label={state === "icon" ? "Hint information" : undefined}
              disabled={disabled}
              loading={state === "loading"}
              variant="secondary"
            >
              {state === "icon" ? "?" : "Review hint details"}
            </Button>
          </TooltipTrigger>
          <TooltipContent dir={dir} text={text} />
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

const meta = {
  title: "Primitives/Tooltip",
  component: TooltipDemo,
  parameters: { a11y: { test: "error" } },
  tags: ["autodocs"],
} satisfies Meta<typeof TooltipDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <TooltipDemo /> };
export const Hover: Story = { render: () => <TooltipDemo /> };
export const Focus: Story = { render: () => <TooltipDemo focusTrigger /> };
export const Disabled: Story = { render: () => <TooltipDemo disabled /> };
export const Loading: Story = { render: () => <TooltipDemo state="loading" /> };
export const ErrorAction: Story = { render: () => <TooltipDemo state="error" /> };
export const Empty: Story = { render: () => <TooltipDemo state="empty" /> };
export const LongText: Story = { render: () => <TooltipDemo state="long" /> };
export const IconOnly: Story = { render: () => <TooltipDemo state="icon" /> };
export const RTL: Story = { render: () => <TooltipDemo dir="rtl" /> };
export const Light: Story = { globals: { theme: "light" }, render: () => <TooltipDemo /> };
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
  render: () => <TooltipDemo />,
};
export const DoubleText: Story = {
  globals: { textScale: "200%" },
  render: () => <TooltipDemo />,
};
export const ReducedMotion: Story = {
  globals: { motion: "reduced" },
  render: () => <TooltipDemo />,
};
export const OffMotion: Story = {
  globals: { motion: "off" },
  render: () => <TooltipDemo />,
};
export const FullMotion: Story = {
  globals: { motion: "full" },
  render: () => <TooltipDemo />,
};
export const ReducedTransparency: Story = {
  globals: { transparency: "off" },
  render: () => <TooltipDemo />,
};

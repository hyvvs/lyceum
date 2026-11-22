import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";

const meta = {
  title: "Primitives/Dialog",
  component: DialogDemo,
  parameters: { a11y: { test: "error" } },
  tags: ["autodocs"],
} satisfies Meta<typeof DialogDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

type ContentState = "standard" | "long" | "empty" | "error" | "loading";

function DialogDemo({
  content = "standard",
  dir,
  disabled = false,
  focusTrigger = false,
}: {
  content?: ContentState;
  dir?: "rtl";
  disabled?: boolean;
  focusTrigger?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button autoFocus={focusTrigger} disabled={disabled}>
          Open study preferences
        </Button>
      </DialogTrigger>
      <DialogContent
        dir={dir}
        title="Study preferences"
        description="Choose how Lyceum presents practice sessions."
      >
        {content === "long" && (
          <p>
            You can adjust the reading experience to keep your attention on the next learning step.
            Changes apply to future practice sessions and can be revised later. The dialog remains
            scrollable when content is long or text is enlarged.
          </p>
        )}
        {content === "empty" && <p>No preferences have been saved yet.</p>}
        {content === "error" && <p role="alert">Preferences could not be saved. Try again.</p>}
        {content === "loading" ? (
          <Button loading>Saving preferences</Button>
        ) : (
          <Button variant="secondary">Review options</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const Default: Story = { render: () => <DialogDemo /> };
export const Hover: Story = {
  render: () => <DialogDemo />,
  parameters: { docs: { description: { story: "Hover over the trigger to preview its state." } } },
};
export const Focus: Story = { render: () => <DialogDemo focusTrigger /> };
export const Light: Story = { globals: { theme: "light" }, render: () => <DialogDemo /> };
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
  render: () => <DialogDemo />,
};
export const DoubleText: Story = {
  globals: { textScale: "200%" },
  render: () => <DialogDemo />,
};
export const ReducedMotion: Story = {
  globals: { motion: "off" },
  render: () => <DialogDemo />,
};
export const ReducedTransparency: Story = {
  globals: { transparency: "off" },
  render: () => <DialogDemo />,
};
export const LongContent: Story = { render: () => <DialogDemo content="long" /> };
export const Empty: Story = { render: () => <DialogDemo content="empty" /> };
export const ErrorAction: Story = { render: () => <DialogDemo content="error" /> };
export const Loading: Story = { render: () => <DialogDemo content="loading" /> };
export const RTL: Story = { render: () => <DialogDemo dir="rtl" /> };
export const Disabled: Story = { render: () => <DialogDemo disabled /> };

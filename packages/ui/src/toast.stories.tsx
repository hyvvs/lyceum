import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  type ToastKind,
  type ToastPriority,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

function ToastDemo({
  kind = "info",
  priority = "polite",
  persistent = true,
  durationMs,
  withAction = false,
  stacked = false,
  duplicate = false,
  long = false,
  dir,
}: {
  kind?: ToastKind;
  priority?: ToastPriority;
  persistent?: boolean;
  durationMs?: number;
  withAction?: boolean;
  stacked?: boolean;
  duplicate?: boolean;
  long?: boolean;
  dir?: "rtl";
}) {
  const [open, setOpen] = useState(true);
  const [alsoOpen, setAlsoOpen] = useState(true);
  const [thirdOpen, setThirdOpen] = useState(true);
  const [repeats, setRepeats] = useState(0);
  const [activity, setActivity] = useState("No action taken");
  const title =
    kind === "success"
      ? "Study plan saved"
      : kind === "warning"
        ? "Review scheduled"
        : kind === "error"
          ? "Connection interrupted"
          : kind === "loading"
            ? "Saving study settings"
            : "Study reminder";
  const description = long
    ? "Your updated mathematics practice plan covers algebraic reasoning, word problems, and checking each answer. All of these details remain readable when the viewport is very narrow and the text size is doubled."
    : kind === "error"
      ? "The local model did not respond. Your answers are saved; retry when ready."
      : "Your next practice session is ready on Today.";
  return (
    <ToastProvider label="Study notification">
      <div className="lyceum-toast-demo" dir={dir}>
        <Button
          variant="secondary"
          onClick={() => {
            if (duplicate && open) setRepeats((count) => count + 1);
            else setOpen(true);
          }}
        >
          {duplicate ? "Repeat notification" : "Show notification"}
        </Button>
        <output className="lyceum-toast-demo__activity">
          {duplicate ? `Repeated requests: ${repeats}` : activity}
        </output>
      </div>
      <Toast
        kind={kind}
        priority={priority}
        open={open}
        onOpenChange={setOpen}
        persistent={persistent}
        {...(durationMs === undefined ? {} : { durationMs })}
        dir={dir}
      >
        <ToastTitle>{title}</ToastTitle>
        <ToastDescription>{description}</ToastDescription>
        {withAction && (
          <ToastAction
            altText="Find the practice session on Today"
            onClick={() => setActivity("Review action chosen")}
          >
            View
          </ToastAction>
        )}
        <ToastClose aria-label="Dismiss notification">Dismiss</ToastClose>
      </Toast>
      {stacked && (
        <>
          <Toast kind="success" persistent open={alsoOpen} onOpenChange={setAlsoOpen}>
            <ToastTitle>Review completed</ToastTitle>
            <ToastDescription>One review recorded.</ToastDescription>
            <ToastClose aria-label="Dismiss review completed">Dismiss</ToastClose>
          </Toast>
          <Toast kind="warning" persistent open={thirdOpen} onOpenChange={setThirdOpen}>
            <ToastTitle>Reminder updated</ToastTitle>
            <ToastDescription>The next review is tomorrow.</ToastDescription>
            <ToastClose aria-label="Dismiss reminder updated">Dismiss</ToastClose>
          </Toast>
        </>
      )}
      <ToastViewport label="Study notifications ({hotkey})" dir={dir} />
    </ToastProvider>
  );
}

function DialogSelectToastDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [topic, setTopic] = useState("math");
  return (
    <ToastProvider label="Study notification">
      <div className="lyceum-toast-demo">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Open study settings</Button>
          </DialogTrigger>
          <DialogContent title="Study settings" description="Select your next study topic.">
            <label htmlFor="toast-dialog-topic">Study topic</label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger id="toast-dialog-topic">
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="math">Mathematics</SelectItem>
                <SelectItem value="physics">Physics</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setDialogOpen(false);
                setNoticeOpen(true);
              }}
            >
              Save study settings
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      <Toast kind="success" open={noticeOpen} onOpenChange={setNoticeOpen} persistent>
        <ToastTitle>Study settings saved</ToastTitle>
        <ToastDescription>
          Your next practice topic is {topic === "math" ? "Mathematics" : "Physics"}.
        </ToastDescription>
        <ToastClose aria-label="Dismiss notification">Dismiss</ToastClose>
      </Toast>
      <ToastViewport label="Study notifications ({hotkey})" />
    </ToastProvider>
  );
}

const meta = {
  title: "Primitives/Toast",
  component: ToastDemo,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" }, stageSurface: "flat" },
} satisfies Meta<typeof ToastDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <ToastDemo /> };
export const TimedDefault: Story = { render: () => <ToastDemo persistent={false} /> };
export const TimedShort: Story = {
  render: () => <ToastDemo persistent={false} durationMs={1800} />,
};
export const Foreground: Story = { render: () => <ToastDemo priority="assertive" /> };
export const Success: Story = { render: () => <ToastDemo kind="success" /> };
export const Warning: Story = { render: () => <ToastDemo kind="warning" /> };
export const ErrorAction: Story = { render: () => <ToastDemo kind="error" withAction /> };
export const Loading: Story = { render: () => <ToastDemo kind="loading" /> };
export const Action: Story = { render: () => <ToastDemo withAction /> };
export const Empty: Story = {
  render: () => (
    <ToastProvider label="Study notification">
      <p>No notifications. Continue practicing.</p>
      <ToastViewport label="Study notifications ({hotkey})" />
    </ToastProvider>
  ),
};
export const Stacked: Story = { render: () => <ToastDemo stacked /> };
export const Duplicate: Story = { render: () => <ToastDemo duplicate /> };
export const Persistent: Story = { render: () => <ToastDemo /> };
export const LongText: Story = { render: () => <ToastDemo long /> };
export const RTL: Story = { render: () => <ToastDemo dir="rtl" /> };
export const Light: Story = { globals: { theme: "light" }, render: () => <ToastDemo /> };
export const Dark: Story = { globals: { theme: "dark" }, render: () => <ToastDemo /> };
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
  render: () => <ToastDemo />,
};
export const FullTransparency: Story = {
  globals: { transparency: "full" },
  render: () => <ToastDemo />,
};
export const ReducedTransparency: Story = {
  globals: { transparency: "reduced" },
  render: () => <ToastDemo />,
};
export const Opaque: Story = { globals: { transparency: "off" }, render: () => <ToastDemo /> };
export const ReducedMotion: Story = {
  globals: { motion: "reduced" },
  render: () => <ToastDemo />,
};
export const OffMotion: Story = { globals: { motion: "off" }, render: () => <ToastDemo /> };
export const DoubleText: Story = {
  globals: { textScale: "200%" },
  render: () => <ToastDemo long />,
};
export const DialogSelectIntegration: Story = { render: () => <DialogSelectToastDemo /> };

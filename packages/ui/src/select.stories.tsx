import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

type ContentState = "standard" | "empty" | "loading" | "error";

function SelectDemo({
  content = "standard",
  disabled = false,
  disabledOption = false,
  controlled = false,
  focus = false,
  formSafe = false,
  longLabels = false,
  dir,
}: {
  content?: ContentState;
  disabled?: boolean;
  disabledOption?: boolean;
  controlled?: boolean;
  focus?: boolean;
  formSafe?: boolean;
  longLabels?: boolean;
  dir?: "rtl";
}) {
  const [selected, setSelected] = useState("math");
  const [submissions, setSubmissions] = useState(0);
  const hasOptions = content === "standard";
  const labels = longLabels
    ? {
        math: "Mathematics",
        physics: "Physics experiments and detailed problem-solving sessions",
        chemistry: "Chemistry problem sets with a long description for each topic",
        history: "History and interpretation of primary sources in extended study sessions",
      }
    : {
        math: "Mathematics",
        physics: "Physics",
        chemistry: "Chemistry",
        history: "History",
      };
  const selector = (
    <Select
      dir={dir}
      defaultValue={hasOptions && !controlled ? "math" : undefined}
      value={controlled ? selected : undefined}
      onValueChange={controlled ? setSelected : undefined}
      disabled={disabled}
    >
      <SelectTrigger id="study-topic-select" aria-label="Study topic" autoFocus={focus}>
        <SelectValue placeholder="Choose a study topic" />
      </SelectTrigger>
      <SelectContent>
        {hasOptions ? (
          <>
            <SelectItem value="math">{labels.math}</SelectItem>
            <SelectItem value="physics">{labels.physics}</SelectItem>
            <SelectItem value="chemistry" disabled={disabledOption}>
              {labels.chemistry}
            </SelectItem>
            <SelectItem value="history">{labels.history}</SelectItem>
          </>
        ) : (
          <SelectItem value="unavailable" disabled>
            {content === "empty" && "No topics available. Add a subject to begin."}
            {content === "loading" && "Loading topics. Keep this menu open to check again."}
            {content === "error" && "Topics could not load. Try again when your sources are ready."}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );

  return (
    <div className="lyceum-select-demo" dir={dir}>
      <label className="lyceum-select-demo__label" htmlFor="study-topic-select">
        Study topic
      </label>
      {formSafe ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmissions((value) => value + 1);
          }}
        >
          {selector}
          <output>Submissions: {submissions}</output>
        </form>
      ) : (
        selector
      )}
      {!hasOptions && (
        <p className="lyceum-select__message" role={content === "error" ? "alert" : "status"}>
          {content === "empty" && "No topics available. Add a subject to begin."}
          {content === "loading" && "Loading topics. Keep this menu open to check again."}
          {content === "error" && "Topics could not load. Try again when your sources are ready."}
        </p>
      )}
      {controlled && (
        <div className="lyceum-select-demo__control">
          <p>Selected: {selected}</p>
          <Button variant="secondary" onClick={() => setSelected("math")}>
            Reset to Mathematics
          </Button>
        </div>
      )}
    </div>
  );
}

function SelectWithinDialogDemo() {
  const [topic, setTopic] = useState("math");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open study settings</Button>
      </DialogTrigger>
      <DialogContent
        title="Study settings"
        description="Choose a topic for the next practice session."
      >
        <div className="lyceum-select-demo">
          <label className="lyceum-select-demo__label" htmlFor="dialog-topic-select">
            Study topic
          </label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger id="dialog-topic-select">
              <SelectValue placeholder="Choose a study topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="math">Mathematics</SelectItem>
              <SelectItem value="physics">Physics</SelectItem>
              <SelectItem value="chemistry">Chemistry</SelectItem>
              <SelectItem value="history">History</SelectItem>
            </SelectContent>
          </Select>
          <output>Selected topic: {topic}</output>
          <Button variant="secondary" onClick={() => setTopic("math")}>
            Reset study topic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const meta = {
  title: "Primitives/Select",
  component: SelectDemo,
  tags: ["autodocs"],
  // The popper uses its own glass layer in a body portal; this frame must never blur behind it.
  parameters: { a11y: { test: "error" }, stageSurface: "flat" },
} satisfies Meta<typeof SelectDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <SelectDemo /> };
export const Hover: Story = { render: () => <SelectDemo /> };
export const Focus: Story = { render: () => <SelectDemo focus /> };
export const Dark: Story = { globals: { theme: "dark" }, render: () => <SelectDemo /> };
export const Light: Story = { globals: { theme: "light" }, render: () => <SelectDemo /> };
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
  render: () => <SelectDemo />,
};
export const FullTransparency: Story = {
  globals: { transparency: "full" },
  render: () => <SelectDemo />,
};
export const ReducedTransparency: Story = {
  globals: { transparency: "reduced" },
  render: () => <SelectDemo />,
};
export const Opaque: Story = {
  globals: { transparency: "off" },
  render: () => <SelectDemo />,
};
export const ReducedMotion: Story = {
  globals: { motion: "reduced" },
  render: () => <SelectDemo />,
};
export const OffMotion: Story = {
  globals: { motion: "off" },
  render: () => <SelectDemo />,
};
export const Disabled: Story = { render: () => <SelectDemo disabled /> };
export const DisabledOption: Story = { render: () => <SelectDemo disabledOption /> };
export const Empty: Story = { render: () => <SelectDemo content="empty" /> };
export const Loading: Story = { render: () => <SelectDemo content="loading" /> };
export const ErrorAction: Story = { render: () => <SelectDemo content="error" /> };
export const RTL: Story = { render: () => <SelectDemo dir="rtl" /> };
export const Controlled: Story = { render: () => <SelectDemo controlled /> };
export const FormSafe: Story = { render: () => <SelectDemo formSafe /> };
export const LongLabels: Story = { render: () => <SelectDemo longLabels /> };
export const DoubleText: Story = {
  globals: { textScale: "200%" },
  render: () => <SelectDemo />,
};
export const LongDoubleText: Story = {
  globals: { textScale: "200%" },
  render: () => <SelectDemo longLabels />,
};
/** Exercises the real, independently portalled modal Dialog and Select layers together. */
export const DialogIntegration: Story = { render: () => <SelectWithinDialogDemo /> };

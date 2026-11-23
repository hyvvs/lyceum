import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "./button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

type ContentState = "standard" | "empty" | "loading" | "error";

function TabsDemo({
  content = "standard",
  dir,
  orientation = "horizontal",
  activationMode = "automatic",
  disabledPlan = false,
  focus = false,
  longLabels = false,
  controlled = false,
}: {
  content?: ContentState;
  dir?: "rtl";
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  disabledPlan?: boolean;
  focus?: boolean;
  longLabels?: boolean;
  controlled?: boolean;
}) {
  const [selected, setSelected] = useState("review");
  const labels = longLabels
    ? {
        review: "Review overdue learning cards",
        plan: "Plan upcoming practice sessions",
        progress: "Progress and mastery overview",
      }
    : { review: "Review", plan: "Plan", progress: "Progress" };

  return (
    <div dir={dir}>
      <Tabs
        defaultValue={controlled ? undefined : "review"}
        value={controlled ? selected : undefined}
        onValueChange={controlled ? setSelected : undefined}
        activationMode={activationMode}
        orientation={orientation}
        dir={dir}
      >
        <TabsList aria-label="Study sections">
          <TabsTrigger value="review" autoFocus={focus}>
            {labels.review}
          </TabsTrigger>
          <TabsTrigger value="plan" disabled={disabledPlan}>
            {labels.plan}
          </TabsTrigger>
          <TabsTrigger value="progress">{labels.progress}</TabsTrigger>
        </TabsList>
        <TabsContent value="review">
          <h3>Review</h3>
          {content === "empty" && <p>No cards are due. Your learning queue is clear.</p>}
          {content === "loading" && <output>Preparing your review cards…</output>}
          {content === "error" && (
            <p role="alert">Review cards could not load. Try reopening this section.</p>
          )}
          {content === "standard" && (
            <p>Review your due learning cards and strengthen concepts you are still practicing.</p>
          )}
        </TabsContent>
        <TabsContent value="plan">
          <h3>Plan</h3>
          <p>Plan upcoming study blocks, practice sessions and a calm revision routine.</p>
        </TabsContent>
        <TabsContent value="progress">
          <h3>Progress</h3>
          <p>Progress and mastery evidence stays visible as you move between study sections.</p>
        </TabsContent>
      </Tabs>
      {controlled && (
        <div className="storybook-stack">
          <p>Selected: {selected}</p>
          <Button variant="secondary" onClick={() => setSelected("review")}>
            Reset to Review
          </Button>
        </div>
      )}
    </div>
  );
}

const meta = {
  title: "Primitives/Tabs",
  component: TabsDemo,
  tags: ["autodocs"],
  // The list itself is blurred glass; never put it inside another blurred Storybook surface.
  parameters: { a11y: { test: "error" }, stageSurface: "flat" },
} satisfies Meta<typeof TabsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <TabsDemo /> };
export const Hover: Story = { render: () => <TabsDemo /> };
export const Focus: Story = { render: () => <TabsDemo focus /> };
export const Dark: Story = { globals: { theme: "dark" }, render: () => <TabsDemo /> };
export const Light: Story = { globals: { theme: "light" }, render: () => <TabsDemo /> };
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
  render: () => <TabsDemo />,
};
export const FullTransparency: Story = {
  globals: { transparency: "full" },
  render: () => <TabsDemo />,
};
export const ReducedTransparency: Story = {
  globals: { transparency: "reduced" },
  render: () => <TabsDemo />,
};
export const Opaque: Story = {
  globals: { transparency: "off" },
  render: () => <TabsDemo />,
};
export const ReducedMotion: Story = {
  globals: { motion: "reduced" },
  render: () => <TabsDemo />,
};
export const OffMotion: Story = {
  globals: { motion: "off" },
  render: () => <TabsDemo />,
};
export const Disabled: Story = { render: () => <TabsDemo disabledPlan /> };
export const Empty: Story = { render: () => <TabsDemo content="empty" /> };
export const Loading: Story = { render: () => <TabsDemo content="loading" /> };
export const ErrorAction: Story = { render: () => <TabsDemo content="error" /> };
export const RTL: Story = { render: () => <TabsDemo dir="rtl" /> };
export const Vertical: Story = { render: () => <TabsDemo orientation="vertical" /> };
export const Manual: Story = { render: () => <TabsDemo activationMode="manual" /> };
export const Controlled: Story = { render: () => <TabsDemo controlled /> };
export const LongLabels: Story = { render: () => <TabsDemo longLabels /> };
export const DoubleText: Story = {
  globals: { textScale: "200%" },
  render: () => <TabsDemo />,
};
export const LongDoubleText: Story = {
  globals: { textScale: "200%" },
  render: () => <TabsDemo longLabels />,
};

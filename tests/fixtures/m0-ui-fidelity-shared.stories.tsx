import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import {
  Avatar,
  Badge,
  BarChart,
  Button,
  ChatBubble,
  Chip,
  Dialog,
  DialogContent,
  DialogTrigger,
  Dock,
  EmptyStateCard,
  GlassCard,
  Input,
  ListRow,
  MasteryRing,
  PillNav,
  Popover,
  RoundIconButton,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SkeletonLoader,
  StatCard,
  TintCard,
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../packages/ui/src";
import "./m0-ui-fidelity-shared.css";

function Gallery({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="shared-gallery">
      <header className="shared-gallery__header glass">
        <div>
          <h1>{title}</h1>
          <p>Shared components · QA gallery</p>
        </div>
        <Badge>Demo data</Badge>
      </header>
      {children}
    </main>
  );
}

function OverviewGallery() {
  const [task, setTask] = useState("Review integration rules");
  const [period, setPeriod] = useState("week");
  const [started, setStarted] = useState(false);
  return (
    <Gallery title="Learning overview">
      <div className="shared-gallery__metrics">
        <StatCard
          label="Due reviews"
          value={12}
          icon="↻"
          trend={{
            samples: [4, 6, 5, 9, 12],
            description: "Sample reviews increased from 4 to 12",
          }}
        />
        <StatCard
          label="Overall mastery"
          value="62%"
          icon="◎"
          delta={{ direction: "increase", text: "4 points", context: "vs previous sample" }}
        />
        <StatCard label="Study streak" value="8 days" icon="◇" />
      </div>
      <div className="shared-gallery__split">
        <BarChart
          title="Mastery by topic"
          units="%"
          scaleMax={100}
          highlightedId="calculus"
          data={[
            { id: "algebra", label: "Algebra", value: 48 },
            { id: "geometry", label: "Geometry", value: 68 },
            { id: "functions", label: "Functions", value: 56 },
            { id: "calculus", label: "Calculus", value: 84 },
            { id: "proof", label: "Proof", value: 42 },
          ]}
        />
        <GlassCard className="shared-gallery__stack">
          <h2>Today's plan</h2>
          <SegmentedControl
            groupLabel="Plan period"
            name="gallery-period"
            value={period}
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
            onValueChange={(next) => {
              setPeriod(next);
              setTask(next === "week" ? "Review integration rules" : "Review the monthly plan");
              setStarted(false);
            }}
          />
          {(period === "week"
            ? ([
                ["Review integration rules", "review"],
                ["Practice substitution", "practice"],
                ["Repair sign errors", "repair"],
              ] as const)
            : ([
                ["Review the monthly plan", "review"],
                ["Learn a new concept", "learn"],
              ] as const)
          ).map(([title, mode]) => (
            <ListRow
              key={title}
              title={title}
              mode={mode}
              selected={task === title}
              onActivate={() => {
                setTask(title);
                setStarted(false);
              }}
            />
          ))}
          <Button onClick={() => setStarted(true)}>Start sample activity</Button>
          <output>{started ? `Started sample activity: ${task}` : `Selected: ${task}`}</output>
        </GlassCard>
      </div>
    </Gallery>
  );
}

function ControlsGallery() {
  const [goal, setGoal] = useState("");
  const [subject, setSubject] = useState("math");
  const [saved, setSaved] = useState(false);
  const [marked, setMarked] = useState(false);
  return (
    <Gallery title="Workspace controls">
      <div className="shared-gallery__navigation">
        <PillNav aria-label="Gallery sections">
          <a href="#gallery-form">Settings</a>
          <a href="#gallery-categories">Categories</a>
        </PillNav>
        <Dock orientation="horizontal" aria-label="Gallery shortcuts">
          <a href="#gallery-form" aria-label="Settings">
            <span>⚙</span>
          </a>
          <a href="#gallery-categories" aria-label="Categories">
            <span>◇</span>
          </a>
        </Dock>
      </div>
      <div className="shared-gallery__split">
        <GlassCard id="gallery-form" className="shared-gallery__stack">
          <h2>Learning preferences</h2>
          <form
            className="shared-gallery__stack"
            onSubmit={(event) => {
              event.preventDefault();
              setSaved(true);
            }}
          >
            <Input
              label="Learning goal"
              value={goal}
              onChange={(event) => {
                setGoal(event.target.value);
                setSaved(false);
              }}
              placeholder="What would you like to learn?"
              required
            />
            <label htmlFor="gallery-subject">Subject</label>
            <Select
              value={subject}
              onValueChange={(value) => {
                setSubject(value);
                setSaved(false);
              }}
            >
              <SelectTrigger id="gallery-subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="math">Mathematics</SelectItem>
                <SelectItem value="history">History</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Apply sample preferences</Button>
            <output>
              {saved
                ? "Sample preferences applied for this preview."
                : "Changes remain in this preview."}
            </output>
          </form>
          <Popover
            triggerLabel="About preferences"
            title="Preferences"
            description="This sample does not save data."
          >
            <p>Changes disappear when the gallery reloads.</p>
          </Popover>
        </GlassCard>
        <div id="gallery-categories" className="shared-gallery__stack">
          <TintCard hue="blue" className="shared-gallery__stack">
            <h2>Mathematics</h2>
            <div className="shared-gallery__inline">
              <Chip>Concepts</Chip>
              <Badge tone="warning">12 due</Badge>
            </div>
            <p>Sample topics and review activities.</p>
          </TintCard>
          <GlassCard className="shared-gallery__stack">
            <h2>Sample profile</h2>
            <div className="shared-gallery__inline">
              <Avatar name="Alex Rivera" status="online" />
              <span>Alex Rivera</span>
              <Badge tone="positive">Available</Badge>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <RoundIconButton
                    aria-label="Toggle sample bookmark"
                    aria-pressed={marked}
                    icon={marked ? "★" : "☆"}
                    onClick={() => setMarked((value) => !value)}
                  />
                </TooltipTrigger>
                <TooltipContent text="Toggle the local sample bookmark" />
              </Tooltip>
            </TooltipProvider>
            <output>{marked ? "Bookmarked" : "Not bookmarked"}</output>
          </GlassCard>
        </div>
      </div>
    </Gallery>
  );
}

function FeedbackGallery() {
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [notice, setNotice] = useState(false);
  return (
    <Gallery title="Study and feedback">
      <ToastProvider label="Sample notification">
        <div className="shared-gallery__feedback">
          <div className="shared-gallery__stack">
            <ChatBubble speaker="learner" speakerLabel="Sample learner">
              <p>How can I remember the main idea?</p>
            </ChatBubble>
            <ChatBubble speaker="tutor" speakerLabel="Sample tutor">
              <p>
                Try explaining it without looking at the original, then compare your explanation
                with the text.
              </p>
            </ChatBubble>
            <GlassCard className="shared-gallery__stack">
              <h2>Review status</h2>
              {loading ? (
                <SkeletonLoader label="Waiting for sample review" />
              ) : (
                <p>Sample review ready.</p>
              )}
              <Button variant="secondary" onClick={() => setLoading((value) => !value)}>
                {loading ? "Finish sample loading" : "Show loading state"}
              </Button>
            </GlassCard>
          </div>
          <div className="shared-gallery__stack">
            <MasteryRing
              label="Sample concept mastery"
              estimate={{ value: 0.62, lower: 0.54, upper: 0.7 }}
            />
            <EmptyStateCard
              title={added ? "Sample source added" : "No sources yet"}
              description={
                added
                  ? "The source exists only in this preview."
                  : "Add an example source to the preview."
              }
              action={{
                label: added ? "Remove sample source" : "Add sample source",
                onActivate: () => {
                  setAdded((existing) => !existing);
                  setNotice(!added);
                },
              }}
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">View sample details</Button>
              </DialogTrigger>
              <DialogContent title="Sample review" description="These are fictional study details.">
                <p>No real learner information is used here.</p>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Toast kind="success" persistent open={notice} onOpenChange={setNotice}>
          <ToastTitle>Sample source added</ToastTitle>
          <ToastDescription>Available in this preview only.</ToastDescription>
          <ToastClose aria-label="Dismiss sample notification">Dismiss</ToastClose>
        </Toast>
        <ToastViewport label="Sample notifications" />
      </ToastProvider>
    </Gallery>
  );
}

const meta = {
  title: "Visual Prototypes/M0 UI Fidelity Shared",
  parameters: { layout: "fullscreen", stageSurface: "fullbleed", a11y: { test: "error" } },
  globals: {
    theme: "dark",
    backdrop: "atmospheric",
    transparency: "full",
    contrast: "standard",
    motion: "full",
    textScale: "100%",
  },
  tags: ["!autodocs"],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = { render: () => <OverviewGallery /> };
export const Controls: Story = { render: () => <ControlsGallery /> };
export const Feedback: Story = { render: () => <FeedbackGallery /> };

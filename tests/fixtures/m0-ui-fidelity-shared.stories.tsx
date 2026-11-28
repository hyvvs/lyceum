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
  Icon,
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
    <main className="shared-gallery lyceum-luminous-stage">
      <header className="shared-gallery__header glass">
        <div>
          <h1>{title}</h1>
          <p>Learning workspace</p>
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
          icon={<Icon name="clock" />}
          trend={{
            samples: [4, 6, 5, 9, 12],
            description: "Reviews increased from 4 to 12",
          }}
        />
        <StatCard
          label="Overall mastery"
          value="62%"
          icon={<Icon name="spark" />}
          delta={{ direction: "increase", text: "4 points", context: "since last week" }}
        />
        <StatCard
          label="Study streak"
          value="8 days"
          icon={<Icon name="check" />}
          trend={{
            samples: [1, 2, 3, 4, 5, 6, 8],
            description: "Reviewed every day this week",
          }}
        />
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
          <Button onClick={() => setStarted(true)}>Confirm review</Button>
          <output>{started ? `Review selected: ${task}` : `Selected: ${task}`}</output>
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
            <Icon name="settings" />
          </a>
          <a href="#gallery-categories" aria-label="Categories">
            <Icon name="book" />
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
            <Button type="submit">Apply preferences</Button>
            <output>
              {saved ? "Preferences updated for this workspace." : "Changes have not been applied."}
            </output>
          </form>
          <Popover
            triggerLabel="About preferences"
            title="Preferences"
            description="Preferences are stored only until this page reloads."
          >
            <p>Changes disappear on reload.</p>
          </Popover>
        </GlassCard>
        <div id="gallery-categories" className="shared-gallery__stack">
          <TintCard hue="blue" className="shared-gallery__stack">
            <h2>Mathematics</h2>
            <div className="shared-gallery__inline">
              <Chip>Concepts</Chip>
              <Badge tone="warning">12 due</Badge>
            </div>
            <p>Chain rule, limits and integration.</p>
          </TintCard>
          <GlassCard className="shared-gallery__stack">
            <h2>Account</h2>
            <div className="shared-gallery__inline">
              <Avatar name="Alex Rivera" status="online" />
              <span>Alex Rivera</span>
              <Badge tone="positive">Available</Badge>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <RoundIconButton
                    aria-label="Toggle bookmark"
                    aria-pressed={marked}
                    icon={<Icon name="star" fill={marked ? "currentColor" : "none"} />}
                    onClick={() => setMarked((value) => !value)}
                  />
                </TooltipTrigger>
                <TooltipContent text="Toggle bookmark" />
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
      <ToastProvider label="Notifications">
        <div className="shared-gallery__feedback">
          <div className="shared-gallery__stack">
            <ChatBubble speaker="learner" speakerLabel="Alex">
              <p>How can I remember the main idea?</p>
            </ChatBubble>
            <ChatBubble speaker="tutor" speakerLabel="Lyceum">
              <p>
                Try explaining it without looking at the original, then compare your explanation
                with the text.
              </p>
            </ChatBubble>
            <GlassCard className="shared-gallery__stack">
              <h2>Review status</h2>
              {loading ? <SkeletonLoader label="Loading review" /> : <p>Review ready.</p>}
              <Button variant="secondary" onClick={() => setLoading((value) => !value)}>
                {loading ? "Finish loading" : "Reload review"}
              </Button>
            </GlassCard>
          </div>
          <div className="shared-gallery__stack">
            <MasteryRing label="Chain rule" estimate={{ value: 0.62, lower: 0.54, upper: 0.7 }} />
            <EmptyStateCard
              title={added ? "Chain rule notes added" : "No sources yet"}
              description={
                added
                  ? "Chain rule notes are ready to review."
                  : "Add chain rule notes to organize your materials."
              }
              action={{
                label: added ? "Remove notes" : "Add notes",
                onActivate: () => {
                  setAdded((existing) => !existing);
                  setNotice(!added);
                },
              }}
              accessoryAction={
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">Review details</Button>
                  </DialogTrigger>
                  <DialogContent
                    title="Review integration rules"
                    description="Key steps for today's practice."
                  >
                    <p>Recall the formula, then check each step against your notes.</p>
                  </DialogContent>
                </Dialog>
              }
            />
          </div>
        </div>
        <Toast kind="success" persistent open={notice} onOpenChange={setNotice}>
          <ToastTitle>Chain rule notes added</ToastTitle>
          <ToastDescription>Notes are ready to review.</ToastDescription>
          <ToastClose aria-label="Dismiss notification">Dismiss</ToastClose>
        </Toast>
        <ToastViewport label="Notifications" />
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

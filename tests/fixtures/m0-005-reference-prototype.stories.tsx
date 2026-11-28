import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "../../apps/web/src/icons";
import { GlassPanel, MorphingRail } from "../../packages/ui/src";
import "../../packages/ui/src/morphing-rail.css";
import { FidelityToday } from "./m0-005-fidelity-today";
import "./m0-005-reference-prototype.css";
import "./m0-005-fidelity-today.css";

type Scene = "today" | "sources" | "reading" | "setup";
type DataMode = "empty" | "synthetic";

interface PrototypeProps {
  initialScene?: Scene;
  initialMode?: DataMode;
  initiallyExpanded?: boolean;
}

const navigation: { id: Scene; label: string; icon: ReactNode }[] = [
  { id: "today", label: "Today", icon: <Icon name="home" /> },
  { id: "sources", label: "Sources", icon: <Icon name="book" /> },
  { id: "reading", label: "Reading", icon: <Icon name="spark" /> },
  { id: "setup", label: "Setup", icon: <Icon name="settings" /> },
];

const utilityActions = [
  { id: "about", label: "About this prototype", icon: <Icon name="spark" /> },
  { id: "reset", label: "Reset demonstration", icon: <Icon name="clock" /> },
];

/** These are invented design-study examples, never learner observations. */
const examplePlan = [
  {
    label: "Revisit an idea",
    headline: "Recall practice",
    description:
      "Try a short reading about recall, then describe its central thought without looking.",
    readingStep: 0,
  },
  {
    label: "Try a short exercise",
    headline: "Worked example",
    description:
      "Walk through an imaginary example and notice where your explanation feels uncertain.",
    readingStep: 1,
  },
  {
    label: "Note what changed",
    headline: "Reflection check",
    description:
      "Finish with a question you can come back to another day. No answers are recorded here.",
    readingStep: 2,
  },
] as const;

const readingPages = [
  {
    label: "The idea",
    title: "When an idea stays with you",
    paragraphs: [
      "Learning is often easier to recognize than to retrieve. Reading something twice can feel familiar, even when recalling it later is difficult.",
      "A useful check is to close the explanation and try to express its central idea in your own words. The attempt makes what is clear, and what still needs work, easier to see.",
    ],
  },
  {
    label: "An example",
    title: "Give the idea some distance",
    paragraphs: [
      "Imagine reading a short description of how a compass works. A few minutes later, describe its purpose without looking back, then compare your explanation with the original.",
      "Repeating this on another day provides more useful evidence than simply recognizing the same words. This is an illustrative reading exercise, not a claim of measured mastery.",
    ],
  },
  {
    label: "Reflect",
    title: "What would you try next?",
    paragraphs: [
      "Choose a small idea you want to remember. Write one question that would require recalling it, then decide when you could try answering that question again.",
      "A future tutoring session could adapt that practice using real learner evidence. This demonstration stores no answers or progress.",
    ],
  },
] as const;

export function ReferencePrototype({
  initialScene = "today",
  initialMode = "empty",
  initiallyExpanded = false,
}: PrototypeProps) {
  const [scene, setScene] = useState<Scene>(initialScene);
  const [mode, setMode] = useState<DataMode>(initialMode);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [readingStep, setReadingStep] = useState(0);
  const [showReflection, setShowReflection] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [topPanel, setTopPanel] = useState<"search" | "notifications" | "profile" | null>(null);
  const [dockTooltipDismissed, setDockTooltipDismissed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusNextScene = useRef(false);
  const focusPlanOnNavigate = useRef(false);
  const devPanelRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const devPanelWasOpen = useRef(false);
  const synthetic = mode === "synthetic";
  const currentPlan = examplePlan[selectedPlan] ?? examplePlan[0];
  const readingPage = readingPages[readingStep] ?? readingPages[0];
  const sceneLabel = navigation.find((item) => item.id === scene)?.label ?? "Today";

  function navigate(target: Scene) {
    if (target === scene) return;
    focusNextScene.current = true;
    setTopPanel(null);
    setScene(target);
  }

  function openExampleReading(step: number) {
    setReadingStep(step);
    setShowReflection(false);
    navigate("reading");
  }

  function reset() {
    setMode("empty");
    setExpanded(false);
    setSelectedPlan(0);
    setReadingStep(0);
    setShowReflection(false);
    setGoalDraft("");
    setDevPanelOpen(false);
    setTopPanel(null);
    navigate("today");
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (!devPanelOpen) {
          const active = document.activeElement;
          returnFocusRef.current =
            active instanceof HTMLElement && active !== document.body ? active : null;
        }
        setDevPanelOpen(!devPanelOpen);
      }
      if (event.key === "Escape") {
        setDevPanelOpen(false);
        setTopPanel(null);
        setDockTooltipDismissed(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [devPanelOpen]);

  useEffect(() => {
    if (devPanelOpen) {
      devPanelWasOpen.current = true;
      devPanelRef.current?.querySelector("button")?.focus();
    } else if (devPanelWasOpen.current) {
      devPanelWasOpen.current = false;
      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus();
      } else {
        document.querySelector<HTMLButtonElement>(".rp-header-round")?.focus();
      }
    }
  }, [devPanelOpen]);

  useEffect(() => {
    if (!focusNextScene.current) return;
    focusNextScene.current = false;
    if (scene === "today") document.getElementById("rp-main")?.focus();
    else if (headingRef.current?.textContent === sceneLabel) headingRef.current.focus();
  }, [scene, sceneLabel]);

  useEffect(() => {
    if (scene !== "today" || !focusPlanOnNavigate.current) return;
    focusPlanOnNavigate.current = false;
    const heading = document.getElementById("rp-today-plan-heading");
    heading?.scrollIntoView({ block: "center" });
    heading?.focus({ preventScroll: true });
  }, [scene]);

  return (
    <div className="reference-prototype" data-testid="reference-prototype" data-scene={scene}>
      <div className="rp-environment" aria-hidden="true" />
      <a href="#rp-main" className="rp-skip">
        Skip to prototype content
      </a>

      <div className="rp-frame">
        <header className="rp-header">
          <div className="rp-brand" aria-label="Lyceum">
            <span className="rp-brand-word">
              lyceum<span aria-hidden="true">.</span>
            </span>
            <span className="rp-brand-descriptor">Workspace</span>
          </div>

          <nav className="rp-top-navigation" aria-label="Main sections">
            <button
              type="button"
              aria-current={scene === "today" ? "page" : undefined}
              className={scene === "today" ? "is-active" : ""}
              onClick={() => navigate("today")}
            >
              <Icon name="home" /> Today
            </button>
            <button
              type="button"
              onClick={() => {
                if (!synthetic) {
                  navigate("setup");
                } else if (scene !== "today") {
                  focusPlanOnNavigate.current = true;
                  navigate("today");
                } else {
                  const heading = document.getElementById("rp-today-plan-heading");
                  heading?.scrollIntoView({ block: "center" });
                  heading?.focus({ preventScroll: true });
                }
              }}
            >
              <Icon name="clock" /> Plan
            </button>
            <button
              type="button"
              aria-current={scene === "reading" ? "page" : undefined}
              className={scene === "reading" ? "is-active" : ""}
              onClick={() => openExampleReading(0)}
            >
              <Icon name="spark" /> Practice
            </button>
            <button
              type="button"
              aria-current={scene === "sources" ? "page" : undefined}
              className={scene === "sources" ? "is-active" : ""}
              onClick={() => navigate("sources")}
            >
              <Icon name="book" /> Sources
            </button>
            <button
              type="button"
              aria-current={scene === "setup" ? "page" : undefined}
              className={scene === "setup" ? "is-active" : ""}
              onClick={() => navigate("setup")}
            >
              <Icon name="settings" /> Models
            </button>
          </nav>

          <div className="rp-header-actions">
            {synthetic && <span className="rp-demo-chip">Demo data</span>}
            <button
              type="button"
              className="rp-header-round"
              aria-label="Search workspace"
              aria-expanded={topPanel === "search"}
              onClick={() => setTopPanel((value) => (value === "search" ? null : "search"))}
            >
              <span aria-hidden="true">⌕</span>
            </button>
            <button
              type="button"
              className="rp-header-round"
              aria-label="Notifications"
              aria-expanded={topPanel === "notifications"}
              onClick={() =>
                setTopPanel((value) => (value === "notifications" ? null : "notifications"))
              }
            >
              <Icon name="clock" />
              <span className="rp-notification-dot" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="rp-header-round"
              aria-label="Settings"
              onClick={() => navigate("setup")}
            >
              <Icon name="settings" />
            </button>
            <button
              type="button"
              className="rp-header-round rp-profile"
              aria-label="Demo profile"
              aria-expanded={topPanel === "profile"}
              onClick={() => setTopPanel((value) => (value === "profile" ? null : "profile"))}
            >
              A<span className="rp-profile-dot" aria-hidden="true" />
            </button>
          </div>
        </header>

        {topPanel && (
          <section
            className="rp-top-popover"
            aria-label={
              topPanel === "search"
                ? "Workspace search"
                : topPanel === "notifications"
                  ? "Notifications"
                  : "Demo profile"
            }
          >
            {topPanel === "search" && (
              <>
                <strong>Quick navigation</strong>
                <button type="button" onClick={() => navigate("sources")}>
                  Open Sources
                </button>
                <button type="button" onClick={() => navigate("reading")}>
                  Open Reading
                </button>
              </>
            )}
            {topPanel === "notifications" && (
              <>
                <strong>Notifications</strong>
                <p>
                  {synthetic ? "Sample reminder: 12 reviews scheduled." : "No notifications yet."}
                </p>
              </>
            )}
            {topPanel === "profile" && (
              <>
                <strong>Demo profile</strong>
                <p>Example learner. No account or learning data is connected.</p>
              </>
            )}
          </section>
        )}

        {devPanelOpen && (
          <section className="rp-dev-panel" aria-label="Developer controls" ref={devPanelRef}>
            <h2>Developer controls</h2>
            <output className="rp-dev-fixture" aria-live="polite">
              {synthetic ? "SYNTHETIC FIXTURE · NO LEARNER DATA" : "EMPTY STATE · NO LEARNER DATA"}
            </output>
            <fieldset className="rp-data-switch">
              <legend className="rp-visually-hidden">Demonstration data</legend>
              <button
                type="button"
                aria-pressed={!synthetic}
                className={!synthetic ? "is-selected" : ""}
                onClick={() => setMode("empty")}
              >
                Empty
              </button>
              <button
                type="button"
                aria-pressed={synthetic}
                className={synthetic ? "is-selected" : ""}
                onClick={() => setMode("synthetic")}
              >
                Synthetic
              </button>
            </fieldset>
            <button type="button" className="rp-reset" aria-label="Reset prototype" onClick={reset}>
              <Icon name="clock" /> Reset
            </button>
            <button type="button" className="rp-reset" onClick={() => setDevPanelOpen(false)}>
              Close
            </button>
          </section>
        )}

        <div className={expanded ? "rp-layout is-rail-expanded" : "rp-layout"}>
          <aside
            className="rp-rail-zone"
            aria-label="Prototype scene selection"
            data-tooltip-dismissed={dockTooltipDismissed ? "true" : "false"}
            onPointerLeave={() => setDockTooltipDismissed(false)}
            onFocusCapture={() => setDockTooltipDismissed(false)}
          >
            <MorphingRail
              ariaLabel="Prototype scenes"
              className="rp-morphing-rail"
              items={navigation}
              activeId={scene}
              onActivate={(id) => {
                if (id === "today" || id === "sources" || id === "reading" || id === "setup") {
                  navigate(id);
                }
              }}
              expanded={expanded}
              onExpandedChange={setExpanded}
              utilities={utilityActions}
              onUtilityActivate={(id) => {
                if (id === "reset") reset();
                if (id === "about") navigate("setup");
              }}
            />
          </aside>

          <nav className="rp-mobile-navigation" aria-label="Compact prototype navigation">
            {navigation.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                className={scene === id ? "is-active" : ""}
                aria-label={label}
                aria-current={scene === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                <span aria-hidden="true">{icon}</span>
                <span className="rp-mobile-label" aria-hidden="true">
                  {label}
                </span>
              </button>
            ))}
          </nav>

          <main className="rp-main" id="rp-main" tabIndex={-1}>
            <div className="rp-heading">
              <div>
                <h1 tabIndex={-1} ref={headingRef}>
                  {sceneLabel}
                </h1>
                <p>
                  {scene === "today" && "Learning overview"}
                  {scene === "sources" && "Course materials and notes"}
                  {scene === "reading" && "Reading and reflection"}
                  {scene === "setup" && "Learning goals and model configuration"}
                </p>
              </div>
            </div>

            <div className="rp-scene" key={scene}>
              {scene === "today" && (
                <FidelityToday
                  synthetic={synthetic}
                  goalDraft={goalDraft}
                  onGoalChange={setGoalDraft}
                  onSetup={() => navigate("setup")}
                  onOpenReading={openExampleReading}
                />
              )}

              {scene === "sources" && (
                <GlassPanel className="rp-pane rp-sources" aria-labelledby="rp-library-heading">
                  <p className="rp-pane-kicker">Library</p>
                  <h2 id="rp-library-heading">
                    {synthetic ? "Sample source library" : "No sources yet"}
                  </h2>
                  <p className="rp-pane-copy">
                    {synthetic
                      ? "Explore how a few different kinds of material might be arranged. These are examples, not imported documents."
                      : "Your library is empty. Notes and course materials will be organized here when you add them."}
                  </p>
                  {synthetic ? (
                    <div className="rp-source-list" aria-label="Synthetic material examples">
                      {[
                        ["Field notes", "Ideas gathered while learning"],
                        ["Reading excerpts", "Passages worth returning to"],
                        ["Concept sketches", "Questions and connections"],
                      ].map(([label, detail]) => (
                        <button
                          key={label}
                          type="button"
                          className="rp-source-row"
                          onClick={() => openExampleReading(0)}
                        >
                          <span className="rp-source-glyph" aria-hidden="true">
                            <Icon name="book" />
                          </span>
                          <span className="rp-source-description">
                            <strong>{label}</strong>
                            <small>{detail}</small>
                          </span>
                          <Icon name="arrow" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rp-library-empty">
                      <span>No files or notes in this preview.</span>
                      <button
                        type="button"
                        className="rp-text-action"
                        onClick={() => setMode("synthetic")}
                      >
                        See a sample library <Icon name="arrow" />
                      </button>
                    </div>
                  )}
                </GlassPanel>
              )}

              {scene === "reading" && (
                <div className="rp-reading-layout">
                  <div className="rp-reading-aside">
                    <p>Contents</p>
                    <fieldset className="rp-reading-steps">
                      <legend className="rp-visually-hidden">Reading sections</legend>
                      {readingPages.map((page, index) => (
                        <button
                          key={page.label}
                          type="button"
                          aria-pressed={readingStep === index}
                          className={readingStep === index ? "is-active" : ""}
                          onClick={() => {
                            setReadingStep(index);
                            setShowReflection(false);
                          }}
                        >
                          {page.label}
                        </button>
                      ))}
                    </fieldset>
                    <p className="rp-reading-source">
                      General demonstration text. No uploaded source or model response.
                    </p>
                  </div>

                  <GlassPanel
                    level="reading"
                    className="rp-pane rp-reading-paper"
                    aria-labelledby="rp-reading-title"
                  >
                    <div className="rp-paper-top">
                      <span>Reading example</span>
                      <span>
                        {readingStep + 1} of {readingPages.length}
                      </span>
                    </div>
                    <div className="rp-paper-content" aria-live="polite" aria-atomic="true">
                      <h2 id="rp-reading-title">{readingPage.title}</h2>
                      {readingPage.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                    <div className="rp-reflection">
                      <button
                        type="button"
                        className="rp-reflection-toggle"
                        aria-expanded={showReflection}
                        aria-controls="rp-reflection-content"
                        onClick={() => setShowReflection((value) => !value)}
                      >
                        <span>Reflection prompt</span>
                        <Icon name="chevron" />
                      </button>
                      <p id="rp-reflection-content" hidden={!showReflection}>
                        Without looking back, how would you explain the main idea in one sentence?
                      </p>
                    </div>
                    <div className="rp-reading-controls">
                      <button
                        type="button"
                        className="rp-secondary-action"
                        disabled={readingStep === 0}
                        onClick={() => {
                          setReadingStep((step) => Math.max(0, step - 1));
                          setShowReflection(false);
                        }}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="rp-primary-action"
                        onClick={() => {
                          if (readingStep === readingPages.length - 1) navigate("today");
                          else setReadingStep((step) => step + 1);
                          setShowReflection(false);
                        }}
                      >
                        <span>
                          {readingStep === readingPages.length - 1 ? "Back to Today" : "Continue"}
                        </span>
                        <Icon name="arrow" />
                      </button>
                    </div>
                  </GlassPanel>
                </div>
              )}

              {scene === "setup" && (
                <GlassPanel className="rp-pane rp-setup" aria-labelledby="rp-setup-heading">
                  <p className="rp-pane-kicker">Getting started</p>
                  <h2 id="rp-setup-heading">Learning setup</h2>
                  <p className="rp-pane-copy">
                    In Lyceum, you choose a learning goal and connect a model you trust. This design
                    preview doesn't create accounts, connect providers or save learner information.
                  </p>
                  {goalDraft.trim() && (
                    <p className="rp-goal-summary">
                      Unsaved goal draft: <strong>{goalDraft.trim()}</strong>
                    </p>
                  )}
                  <div className="rp-setup-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("synthetic");
                        navigate("today");
                      }}
                    >
                      <span>
                        <strong>Explore an example</strong>
                        <small>See how a sample day might feel.</small>
                      </span>
                      <Icon name="arrow" />
                    </button>
                    <button type="button" onClick={() => navigate("sources")}>
                      <span>
                        <strong>Visit the library</strong>
                        <small>See the space prepared for your material.</small>
                      </span>
                      <Icon name="arrow" />
                    </button>
                    <button type="button" onClick={() => openExampleReading(0)}>
                      <span>
                        <strong>Open a reading</strong>
                        <small>Try a short, original text.</small>
                      </span>
                      <Icon name="arrow" />
                    </button>
                  </div>
                </GlassPanel>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: "Visual Prototypes/M0-005 Reference Workspace",
  component: ReferencePrototype,
  excludeStories: ["ReferencePrototype"],
  parameters: { stageSurface: "fullbleed", layout: "fullscreen", a11y: { test: "error" } },
  tags: ["!autodocs"],
  globals: {
    backdrop: "atmospheric",
    theme: "dark",
    transparency: "full",
    contrast: "standard",
    motion: "full",
    textScale: "100%",
  },
} satisfies Meta<typeof ReferencePrototype>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyToday: Story = { args: { initialScene: "today", initialMode: "empty" } };
export const SyntheticToday: Story = { args: { initialScene: "today", initialMode: "synthetic" } };
export const SyntheticSources: Story = {
  args: { initialScene: "sources", initialMode: "synthetic" },
};
export const ReadingSurface: Story = {
  args: { initialScene: "reading", initialMode: "synthetic" },
};
export const ExpandedRail: Story = { args: { initialScene: "today", initiallyExpanded: true } };
export const LightGlass: Story = { globals: { theme: "light" }, args: { initialScene: "today" } };
export const LightSolid: Story = {
  globals: { theme: "light", transparency: "off" },
  args: { initialScene: "today" },
};
export const SolidFallback: Story = {
  globals: { transparency: "off" },
  args: { initialScene: "today" },
};
export const HighContrast: Story = {
  globals: { contrast: "high", transparency: "off" },
  args: { initialScene: "reading", initialMode: "synthetic" },
};
export const ReducedMotion: Story = {
  globals: { motion: "reduced" },
  args: { initialScene: "today" },
};
export const MotionOff: Story = { globals: { motion: "off" }, args: { initialScene: "today" } };
export const RightToLeft: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
  args: { initiallyExpanded: true },
};
export const DoubleText: Story = {
  globals: { textScale: "200%", transparency: "off" },
  args: { initialScene: "reading", initialMode: "synthetic" },
};

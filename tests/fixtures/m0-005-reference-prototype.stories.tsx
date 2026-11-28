import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "../../apps/web/src/icons";
import { GlassPanel, MorphingRail } from "../../packages/ui/src";
import "../../packages/ui/src/morphing-rail.css";
import "./m0-005-reference-prototype.css";

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
    headline: "Return to an idea.",
    description:
      "Try a short reading about recall, then describe its central thought without looking.",
    readingStep: 0,
  },
  {
    label: "Try a short exercise",
    headline: "Learn by trying.",
    description:
      "Walk through an imaginary example and notice where your explanation feels uncertain.",
    readingStep: 1,
  },
  {
    label: "Note what changed",
    headline: "Make room to reflect.",
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

function SampleNotice({ synthetic }: { synthetic: boolean }) {
  return (
    <output className="rp-status" aria-live="polite">
      {synthetic ? "SYNTHETIC FIXTURE · NO LEARNER DATA" : "EMPTY STATE · NO LEARNER DATA"}
    </output>
  );
}

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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusNextScene = useRef(false);
  const synthetic = mode === "synthetic";
  const currentPlan = examplePlan[selectedPlan] ?? examplePlan[0];
  const readingPage = readingPages[readingStep] ?? readingPages[0];
  const sceneLabel = navigation.find((item) => item.id === scene)?.label ?? "Today";

  function navigate(target: Scene) {
    if (target === scene) return;
    focusNextScene.current = true;
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
    navigate("today");
  }

  useEffect(() => {
    if (!focusNextScene.current) return;
    focusNextScene.current = false;
    if (headingRef.current?.textContent === sceneLabel) headingRef.current.focus();
  }, [sceneLabel]);

  return (
    <div className="reference-prototype" data-testid="reference-prototype" data-scene={scene}>
      <div className="rp-environment" aria-hidden="true" />
      <a href="#rp-main" className="rp-skip">
        Skip to prototype content
      </a>

      <div className="rp-frame">
        <header className="rp-header">
          <div className="rp-brand" aria-label="Lyceum visual prototype">
            <span className="rp-brand-word">
              lyceum<span aria-hidden="true">.</span>
            </span>
            <span className="rp-brand-descriptor">Learning workspace</span>
          </div>

          <div className="rp-header-actions">
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
              <Icon name="clock" />
              <span>Reset</span>
            </button>
          </div>
        </header>

        <div className={expanded ? "rp-layout is-rail-expanded" : "rp-layout"}>
          <aside className="rp-rail-zone" aria-label="Prototype scene selection">
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
                  {scene === "today" && "Find your next step, without the noise."}
                  {scene === "sources" && "A place to return to what you have read."}
                  {scene === "reading" && "One thought at a time."}
                  {scene === "setup" && "A place to start."}
                </p>
              </div>
              <SampleNotice synthetic={synthetic} />
            </div>

            <div className="rp-scene" key={scene}>
              {scene === "today" && (
                <GlassPanel
                  className={synthetic ? "rp-pane rp-today rp-today--sample" : "rp-pane rp-today"}
                  aria-labelledby="rp-next-heading"
                >
                  <div className="rp-today-content">
                    <p className="rp-pane-kicker">
                      {synthetic ? "Your sample day" : "Your first step"}
                    </p>
                    <h2 id="rp-next-heading">
                      {synthetic ? currentPlan.headline : "What would you like to learn?"}
                    </h2>
                    <p className="rp-pane-copy">
                      {synthetic
                        ? currentPlan.description
                        : "Begin with a goal that matters to you. There are no sessions, materials or reviews here yet."}
                    </p>
                    <button
                      type="button"
                      className="rp-primary-action"
                      onClick={() => {
                        if (synthetic) openExampleReading(currentPlan.readingStep);
                        else navigate("setup");
                      }}
                    >
                      <span>{synthetic ? "Open sample reading" : "Explore setup"}</span>
                      <Icon name="arrow" />
                    </button>
                  </div>
                  {synthetic ? (
                    <fieldset className="rp-plan-list">
                      <legend>Example plan</legend>
                      {examplePlan.map(({ label }, index) => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={selectedPlan === index}
                          className={
                            selectedPlan === index ? "rp-plan-row is-selected" : "rp-plan-row"
                          }
                          onClick={() => setSelectedPlan(index)}
                        >
                          <span className="rp-plan-marker" aria-hidden="true" />
                          <span>{label}</span>
                        </button>
                      ))}
                      <p className="rp-plan-note">
                        Examples only. No learning progress is recorded.
                      </p>
                    </fieldset>
                  ) : (
                    <p className="rp-today-footnote">
                      Nothing is due. Your space stays quiet until you choose a goal.
                    </p>
                  )}
                </GlassPanel>
              )}

              {scene === "sources" && (
                <GlassPanel className="rp-pane rp-sources" aria-labelledby="rp-library-heading">
                  <p className="rp-pane-kicker">Library</p>
                  <h2 id="rp-library-heading">
                    {synthetic ? "A library, before it fills up." : "Make room for your sources."}
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
                      {showReflection && (
                        <p id="rp-reflection-content">
                          Without looking back, how would you explain the main idea in one sentence?
                        </p>
                      )}
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
                  <h2 id="rp-setup-heading">Start with a direction.</h2>
                  <p className="rp-pane-copy">
                    In Lyceum, you choose a learning goal and connect a model you trust. This design
                    preview doesn't create accounts, connect providers or save learner information.
                  </p>
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

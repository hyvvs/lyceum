import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  BarChart,
  ChatBubble,
  Dock,
  GlassCard,
  GlassPanel,
  MasteryRing,
  PillNav,
  RoundIconButton,
  SegmentedControl,
  StatCard,
  TintCard,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  VisuallyHidden,
} from "../../packages/ui/src";
import "./m0-017-b5-composition.css";

/** Storybook fixture ONLY. Every measurement is a synthetic, explicitly labeled sample. */
function CompleteComponentStudy() {
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [clicks, setClicks] = useState(0);
  const destinations = [
    { href: "#b5-intro", label: "Preview overview", icon: "⌂" },
    { href: "#b5-controls", label: "Preview controls", icon: "☷" },
    { href: "#b5-data", label: "Preview data", icon: "▥" },
    { href: "#b5-messages", label: "Preview messages", icon: "✦" },
  ] as const;
  return (
    <div className="b5-scene" data-testid="b5-composition">
      <div className="b5-scene__atmosphere" aria-hidden="true" />
      <TooltipProvider>
        <div className="b5-frame">
          <header className="b5-header">
            <a
              href="#b5-intro"
              className="b5-brand"
              aria-label="Lyceum component demonstration start"
            >
              <span className="b5-brand__mark" aria-hidden="true">
                ✦
              </span>
              lyceum<span className="b5-brand__dot">.</span>
            </a>
            <PillNav className="b5-pill" aria-label="Visual-only component sections">
              <a href="#b5-intro">Overview</a>
              <a href="#b5-controls">Controls</a>
              <a href="#b5-data">Data</a>
              <a href="#b5-messages">Reading</a>
            </PillNav>
            <RoundIconButton
              aria-label="Inspect example notices"
              icon={<span aria-hidden="true">✦</span>}
              badge={{ text: "2", label: "Two synthetic sample notices" }}
              onClick={() => setClicks((value) => value + 1)}
            />
          </header>

          <Dock className="b5-dock" orientation="vertical" aria-label="Visual-only component Dock">
            {destinations.map(({ href, icon, label }) => (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <a href={href}>
                    <span aria-hidden="true">{icon}</span>
                    <VisuallyHidden>{label}</VisuallyHidden>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right" text={label} />
              </Tooltip>
            ))}
          </Dock>

          <main className="b5-main" id="b5-intro">
            <div className="b5-intro">
              <div>
                <p className="b5-eyebrow">M0-017 · FULL COMPONENT LANGUAGE · VISUAL STUDY</p>
                <h1>Every detail belongs to the learning surface.</h1>
                <p>
                  Focused reading, meaningful controls, and measured depth — without inventing a
                  learner.
                </p>
              </div>
              <strong className="b5-disclaimer">Synthetic fixture · not a tutoring product</strong>
            </div>

            <section className="b5-hero-grid" aria-label="Existing glass foundation components">
              <GlassPanel level="reading" aria-labelledby="b5-hero-title" className="b5-hero">
                <p className="b5-eyebrow">01 · READING</p>
                <h2 id="b5-hero-title">A clear place for the essential idea.</h2>
                <p>
                  Long explanations belong on near-opaque glass. A measured atmosphere stays behind,
                  rather than competing with the content.
                </p>
                <a href="#b5-controls" className="b5-primary">
                  Explore the sample controls
                </a>
              </GlassPanel>
              <GlassCard
                level="raised"
                className="b5-foundation-card"
                aria-labelledby="b5-foundation-title"
              >
                <p className="b5-eyebrow">02 · SURFACE</p>
                <h2 id="b5-foundation-title">A distinct raised article.</h2>
                <p>
                  Hierarchy comes from type, rim lighting, spacing and elevation — not extra nested
                  blur.
                </p>
              </GlassCard>
              <TintCard hue="purple" className="b5-tint-card" aria-labelledby="b5-tint-title">
                <p className="b5-eyebrow">03 · HUE EXAMPLE</p>
                <h2 id="b5-tint-title">Illustrative category tint.</h2>
                <p>Not a real subject, learner category or imported source.</p>
              </TintCard>
            </section>

            <section
              className="b5-section b5-controls-section"
              id="b5-controls"
              aria-labelledby="b5-controls-heading"
            >
              <div className="b5-section-heading">
                <span className="b5-eyebrow">04 · NATIVE INTERACTION</span>
                <h2 id="b5-controls-heading">A little choice. Complete control.</h2>
                <p>
                  Radio input selection, a named icon action and the browser's own focus behavior.
                </p>
              </div>
              <div className="b5-controls-body">
                <SegmentedControl
                  groupLabel="Synthetic sample density"
                  name="sample-density"
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "comfortable", label: "Comfortable" },
                  ]}
                  value={density}
                  onValueChange={setDensity}
                />
                <output>
                  Selected demonstration: {density}. Example notice activations: {clicks}.
                </output>
              </div>
            </section>

            <section
              className="b5-section b5-data-section"
              id="b5-data"
              aria-labelledby="b5-data-heading"
            >
              <div className="b5-section-heading">
                <span className="b5-eyebrow">05 · EXPLICIT PRESENTATION</span>
                <h2 id="b5-data-heading">Values only when supplied.</h2>
                <p>
                  These are synthetic Storybook numbers, not actual progress, mastery or sessions.
                </p>
              </div>
              <div className="b5-data-grid">
                <StatCard
                  label="Sample observations"
                  value={12}
                  icon={<span aria-hidden="true">∑</span>}
                  delta={{
                    direction: "decrease",
                    text: "Two fewer",
                    context: "than sample baseline",
                  }}
                  trend={{
                    samples: [4, 8, 5, 12],
                    description: "Four illustrative observations vary over time.",
                  }}
                />
                <BarChart
                  title="Fictional weekly counts"
                  units="sample items"
                  scaleMax={10}
                  data={[
                    { id: "a", label: "Week A", value: 3 },
                    { id: "b", label: "Week B", value: 8 },
                    { id: "c", label: "Week C", value: 5 },
                  ]}
                  highlightedId="b"
                />
                <MasteryRing
                  label="Synthetic model probability"
                  estimate={{ value: 0.62, lower: 0.47, upper: 0.77 }}
                />
              </div>
            </section>

            <section
              className="b5-section b5-chat-section"
              id="b5-messages"
              aria-labelledby="b5-messages-heading"
            >
              <div className="b5-section-heading">
                <span className="b5-eyebrow">06 · READING-ORIENTED MESSAGES</span>
                <h2 id="b5-messages-heading">A conversation's visual vocabulary.</h2>
                <p>No tutor is connected. These words are manually written sample content.</p>
              </div>
              <div className="b5-chat-stack">
                <ChatBubble speaker="tutor" speakerLabel="Example study guide">
                  <p>
                    Begin with the known quantities. Explain each step on a calm reading surface,
                    then check the conclusion against the question.
                  </p>
                </ChatBubble>
                <ChatBubble speaker="learner" speakerLabel="Example learner">
                  <p>Could you show why the second step follows?</p>
                </ChatBubble>
              </div>
            </section>

            <footer className="b5-footer">
              <p>
                Visual-only M0-017 demonstration · original token-based temporary CSS atmosphere ·
                no copied V5 reference assets, data, provider, transcript, or learning engine.
              </p>
            </footer>
          </main>
        </div>
      </TooltipProvider>
    </div>
  );
}

const meta = {
  title: "Visual Compositions/M0-017 B5 Complete",
  component: CompleteComponentStudy,
  parameters: { stageSurface: "fullbleed", layout: "fullscreen", a11y: { test: "error" } },
  globals: {
    backdrop: "atmospheric",
    theme: "dark",
    transparency: "full",
    contrast: "standard",
    motion: "reduced",
    textScale: "100%",
  },
} satisfies Meta<typeof CompleteComponentStudy>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DarkFull: Story = {};
export const LightFull: Story = { globals: { theme: "light", transparency: "full" } };
export const ReducedTransparency: Story = { globals: { transparency: "reduced" } };
export const Opaque: Story = { globals: { transparency: "off" } };
export const HighContrast: Story = { globals: { contrast: "high", transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" } };
export const DoubleText: Story = { globals: { textScale: "200%" } };
export const RTL: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};

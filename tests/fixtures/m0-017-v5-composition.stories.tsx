import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { Icon } from "../../apps/web/src/icons";
import {
  Button,
  GlassCard,
  GlassPanel,
  TintCard,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../packages/ui/src";
import "./m0-017-v5-composition.css";

/** Entire composition is design-only. No production learner state is read or fabricated. */
function VisualComposition() {
  const [activeSection, setActiveSection] = useState("scene-overview");
  useEffect(() => {
    const syncLocation = () => setActiveSection(window.location.hash.slice(1) || "scene-overview");
    window.addEventListener("hashchange", syncLocation);
    syncLocation();
    return () => window.removeEventListener("hashchange", syncLocation);
  }, []);
  const dock = [
    { label: "Overview preview", href: "#scene-overview", icon: "home" },
    { label: "Library preview", href: "#scene-library", icon: "book" },
    { label: "Reading preview", href: "#scene-reading", icon: "spark" },
    { label: "Privacy preview", href: "#scene-privacy", icon: "shield" },
  ] as const;
  const categories = [
    { hue: "blue", icon: "book", label: "Sources", description: "A place for imported materials" },
    { hue: "amber", icon: "clock", label: "Practice", description: "Space for future exercises" },
    {
      hue: "purple",
      icon: "spark",
      label: "Concepts",
      description: "Topics will appear when known",
    },
    { hue: "green", icon: "check", label: "Review", description: "No review schedule exists yet" },
    { hue: "red", icon: "link", label: "Connections", description: "No models are connected" },
  ] as const;
  return (
    <div className="v5-scene" data-testid="v5-composition">
      <div className="v5-scene__horizon" aria-hidden="true" />
      <div className="v5-scene__structure" aria-hidden="true" />
      <div className="v5-scene__scrim" aria-hidden="true" />
      <TooltipProvider>
        <div className="v5-scene__frame">
          <header className="v5-header">
            <a className="v5-brand" href="#scene-overview" aria-label="Lyceum visual preview home">
              <span className="v5-brand__mark" aria-hidden="true">
                <Icon name="spark" />
              </span>
              <span>
                lyceum<span className="v5-brand__dot">.</span>
              </span>
            </a>
            <nav className="v5-topnav glass-float" aria-label="Visual-only primary navigation">
              <a
                className={
                  activeSection === "scene-overview"
                    ? "v5-topnav__link is-current"
                    : "v5-topnav__link"
                }
                href="#scene-overview"
                aria-current={activeSection === "scene-overview" ? "location" : undefined}
              >
                <Icon name="home" /> Overview
              </a>
              <a
                className={
                  activeSection === "scene-library"
                    ? "v5-topnav__link is-current"
                    : "v5-topnav__link"
                }
                href="#scene-library"
                aria-current={activeSection === "scene-library" ? "location" : undefined}
              >
                <Icon name="book" /> Library
              </a>
              <a
                className={
                  activeSection === "scene-reading"
                    ? "v5-topnav__link is-current"
                    : "v5-topnav__link"
                }
                href="#scene-reading"
                aria-current={activeSection === "scene-reading" ? "location" : undefined}
              >
                <Icon name="spark" /> Reading
              </a>
            </nav>
            <div className="v5-header__actions">
              <a
                className="v5-icon-circle glass-float"
                href="#scene-library"
                aria-label="Jump to sample categories"
              >
                <Icon name="book" />
              </a>
              <a
                className="v5-icon-circle glass-float"
                href="#scene-privacy"
                aria-label="Jump to privacy explanation"
              >
                <Icon name="shield" />
              </a>
            </div>
          </header>

          <nav className="v5-dock glass-float" aria-label="Visual-only dock">
            {dock.map(({ label, href, icon }) => (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <a
                    className={
                      activeSection === href.slice(1) ? "v5-dock__item is-current" : "v5-dock__item"
                    }
                    href={href}
                    aria-label={label}
                    aria-current={activeSection === href.slice(1) ? "location" : undefined}
                  >
                    <Icon name={icon} />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right" text={label} />
              </Tooltip>
            ))}
          </nav>

          <main className="v5-main" id="scene-overview">
            <div className="v5-intro">
              <div>
                <p className="v5-kicker">
                  <span className="v5-kicker__line" /> LYCEUM · DESIGN PREVIEW
                </p>
                <h1>Your space for deeper learning.</h1>
                <p>A visual direction for a private, thoughtful study workspace.</p>
              </div>
              <span className="v5-status">Visual-only sample · no learner data</span>
            </div>

            <section className="v5-overview" aria-label="Illustrative overview surfaces">
              <GlassCard className="v5-small-card v5-small-card--one">
                <span className="v5-small-card__symbol" aria-hidden="true">
                  <Icon name="spark" />
                </span>
                <span className="v5-label">START HERE</span>
                <h2>Your first goal</h2>
                <p>Not configured</p>
              </GlassCard>
              <GlassCard className="v5-small-card v5-small-card--two" level="raised">
                <span className="v5-small-card__symbol" aria-hidden="true">
                  <Icon name="book" />
                </span>
                <span className="v5-label">YOUR MATERIALS</span>
                <h2>Sources</h2>
                <p>Nothing imported</p>
              </GlassCard>
              <GlassCard className="v5-small-card v5-small-card--three">
                <span className="v5-small-card__symbol" aria-hidden="true">
                  <Icon name="clock" />
                </span>
                <span className="v5-label">STUDY HISTORY</span>
                <h2>Sessions</h2>
                <p>No sessions yet</p>
              </GlassCard>
              <GlassCard className="v5-small-card v5-small-card--four" level="raised">
                <span className="v5-small-card__symbol" aria-hidden="true">
                  <Icon name="shield" />
                </span>
                <span className="v5-label">YOUR CONTROL</span>
                <h2>Device-first</h2>
                <p>Local by default</p>
              </GlassCard>
            </section>

            <div className="v5-main-grid">
              <GlassPanel
                className="v5-feature"
                level="raised"
                aria-labelledby="scene-feature-heading"
              >
                <div className="v5-section-heading">
                  <div>
                    <p className="v5-label">A QUIETER WAY TO LEARN</p>
                    <h2 id="scene-feature-heading">A clear beginning.</h2>
                  </div>
                  <span className="v5-section-heading__tag">Layout study · static</span>
                </div>
                <div className="v5-feature__body">
                  <div>
                    <p>
                      Build a goal, bring your own materials, and choose how you want to study.
                      There is no invented progress here.
                    </p>
                    <Button asChild>
                      <a href="#scene-library">
                        Explore the visual library <Icon name="arrow" />
                      </a>
                    </Button>
                  </div>
                  <div className="v5-feature__motif" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </GlassPanel>
              <GlassPanel
                className="v5-reading"
                level="reading"
                id="scene-reading"
                aria-labelledby="scene-reading-heading"
              >
                <p className="v5-label">READING SURFACE · NEAR OPAQUE</p>
                <h2 id="scene-reading-heading">Space to focus.</h2>
                <p>
                  Long explanations and mathematical work belong on a calm, readable surface—not
                  directly over scenery.
                </p>
                <div className="v5-reading__rule" />
                <p className="v5-reading__note">
                  This is a layout demonstration, not an active lesson or tutoring session.
                </p>
              </GlassPanel>
            </div>

            <section
              className="v5-library"
              id="scene-library"
              aria-labelledby="scene-library-heading"
            >
              <div className="v5-library__heading">
                <div>
                  <p className="v5-label">SUBJECT PALETTE</p>
                  <h2 id="scene-library-heading">A world of possibilities.</h2>
                </div>
                <span>Illustrative color treatments · not saved categories</span>
              </div>
              <div className="v5-topic-grid">
                {categories.map(({ hue, icon, label, description }) => (
                  <TintCard
                    key={hue}
                    hue={hue}
                    className="v5-topic"
                    aria-label={`${label} example category`}
                  >
                    <span className="v5-topic__symbol" aria-hidden="true">
                      <Icon name={icon} />
                    </span>
                    <span className="v5-topic__kind">CATEGORY PREVIEW</span>
                    <h3>{label}</h3>
                    <p>{description}</p>
                    <span className="v5-topic__foot">
                      Design sample <Icon name="arrow" />
                    </span>
                  </TintCard>
                ))}
              </div>
            </section>

            <footer className="v5-disclaimer" id="scene-privacy">
              <Icon name="shield" />
              <p>
                Original CSS-only atmosphere. Temporary visual study pending M0-019; no
                reference-video assets, learner data, sessions or model connections.
              </p>
            </footer>
          </main>
        </div>
      </TooltipProvider>
    </div>
  );
}

const meta = {
  title: "Visual Compositions/M0-017 V5 Slice A",
  component: VisualComposition,
  parameters: { stageSurface: "fullbleed", layout: "fullscreen", a11y: { test: "error" } },
  globals: {
    backdrop: "atmospheric",
    theme: "dark",
    transparency: "full",
    contrast: "standard",
    motion: "reduced",
    textScale: "100%",
  },
} satisfies Meta<typeof VisualComposition>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DarkFull: Story = {};
export const LightFull: Story = { globals: { theme: "light", transparency: "full" } };
export const ReducedTransparency: Story = { globals: { transparency: "reduced" } };
export const Opaque: Story = { globals: { transparency: "off" } };
export const HighContrast: Story = { globals: { contrast: "high", transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" } };
export const RTL: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};
export const DoubleText: Story = { globals: { textScale: "200%" } };

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../packages/ui/src/index";
import "./runtime-preferences.css";

type Theme = "dark" | "light";
type Contrast = "standard" | "high";
type Transparency = "full" | "reduced" | "off";
type Motion = "full" | "reduced" | "off";
type TextScale = "100%" | "200%";

interface Preferences {
  theme: Theme;
  contrast: Contrast;
  transparency: Transparency;
  motion: Motion;
  textScale: TextScale;
}

const defaults: Preferences = {
  theme: "dark",
  contrast: "standard",
  transparency: "full",
  motion: "full",
  textScale: "100%",
};

const longDescription =
  "Before choosing a topic, review the study plan, available materials, upcoming checkpoints, " +
  "the notes from the last session, and the detailed guidance for selecting a subject. " +
  "The description is deliberately long so its real 200% text layout must coexist with an " +
  "already-open, separately portalled topic selector inside a scrollable modal Dialog.";

const extraTopics = [
  ["geography", "Geography"],
  ["biology", "Biology"],
  ["art", "Art"],
  ["music", "Music"],
  ["astronomy", "Astronomy"],
  ["literature", "Literature"],
] as const;

// Real reading content within DialogContent's children (not its description).
// It intentionally comes before the first Select in the native scroll flow.
const studyPreparationNotes = [
  "Review the study goals and mark concepts that still need practice.",
  "Check the next checkpoint and which materials remain available offline.",
  "Read earlier feedback and identify the weakest topic for this session.",
  "Keep the plan editable when new results reveal a learning gap.",
] as const;

const accepted: { [K in keyof Preferences]: readonly Preferences[K][] } = {
  theme: ["dark", "light"],
  contrast: ["standard", "high"],
  transparency: ["full", "reduced", "off"],
  motion: ["full", "reduced", "off"],
  textScale: ["100%", "200%"],
};

let nextMountId = 0;

/** QA-only event drives real React preference updates, never Storybook remount/navigation. */
function RuntimePreferencesFixture() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [topic, setTopic] = useState("math");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copyMode, setCopyMode] = useState<"short" | "long">("short");
  const [optionMode, setOptionMode] = useState<"short" | "long">("short");
  const [compositionMode, setCompositionMode] = useState<"compact" | "tall" | "tall-unbounded">(
    "compact",
  );
  const [directionMode, setDirectionMode] = useState<"ltr" | "rtl">("ltr");
  const [reviewedNotes, setReviewedNotes] = useState(false);
  const [studyPace, setStudyPace] = useState("steady");
  const [saved, setSaved] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const readingStartRef = useRef<HTMLHeadingElement>(null);
  const isBounded = compositionMode === "tall";
  const isTall = compositionMode !== "compact";
  const mountId = useRef(0);
  if (mountId.current === 0) mountId.current = ++nextMountId;

  useEffect(() => {
    const changePreferences = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail || typeof event.detail !== "object") {
        return;
      }
      const details = event.detail as Record<string, unknown>;
      const patch: Partial<Preferences> = {};
      for (const [key, value] of Object.entries(details)) {
        if (Object.hasOwn(accepted, key) && typeof value === "string") {
          const name = key as keyof Preferences;
          if ((accepted[name] as readonly string[]).includes(value)) {
            Object.assign(patch, { [name]: value });
          }
        }
      }
      if (Object.keys(patch).length) setPreferences((previous) => ({ ...previous, ...patch }));
    };
    window.addEventListener("lyceum:qa-preference-change", changePreferences);
    return () => window.removeEventListener("lyceum:qa-preference-change", changePreferences);
  }, []);

  useEffect(() => {
    const changeVariant = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail || typeof event.detail !== "object") {
        return;
      }
      const detail = event.detail as Record<string, unknown>;
      if (detail.copy === "short" || detail.copy === "long") setCopyMode(detail.copy);
      if (detail.options === "short" || detail.options === "long") setOptionMode(detail.options);
      if (
        detail.composition === "compact" ||
        detail.composition === "tall" ||
        detail.composition === "tall-unbounded"
      ) {
        setCompositionMode(detail.composition);
      }
      if (detail.direction === "ltr" || detail.direction === "rtl") {
        setDirectionMode(detail.direction);
      }
    };
    window.addEventListener("lyceum:qa-variant-change", changeVariant);
    return () => window.removeEventListener("lyceum:qa-variant-change", changeVariant);
  }, []);

  useEffect(() => {
    // The parent StoryFrame may apply its own globals AFTER this child effect.
    // Never snapshot its root attrs at child-mount time: those may be stale.
    // Instead restore the QA story's explicit globals on fixture unmount.
    return () => {
      const root = document.documentElement;
      root.dataset.theme = defaults.theme;
      root.dataset.contrast = defaults.contrast;
      root.dataset.transparency = defaults.transparency;
      root.dataset.motion = defaults.motion;
      root.style.fontSize = defaults.textScale;
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.theme;
    root.dataset.contrast = preferences.contrast;
    root.dataset.transparency = preferences.transparency;
    root.dataset.motion = preferences.motion;
    root.style.fontSize = preferences.textScale;
    // When preferences reflow a separately portalled Select, the focused option
    // is outside Dialog's DOM and cannot trigger the Dialog's normal Tab scroll.
    // Re-expose only this consumer's real Popper anchor; Radix still positions
    // the portal, owns its active option and restores focus on dismissal.
    if (dialogOpen && isBounded) {
      const activeAnchor = dialogRef.current?.querySelector<HTMLElement>(
        ".lyceum-select__trigger[data-state='open']",
      );
      // Center the trigger within the existing Dialog scrollport so its
      // *external focus outline* remains visible when Radix restores focus,
      // even after an open popup has already finished its collision pass.
      activeAnchor?.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    }
  }, [preferences, dialogOpen, isBounded]);

  return (
    <div className="lyceum-select-demo">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>Open runtime study settings</Button>
        </DialogTrigger>
        <DialogContent
          ref={dialogRef}
          title="Settings"
          description={copyMode === "long" ? longDescription : "Choose a topic."}
          dir={directionMode}
          className={isBounded ? "qa-bounded-dialog" : undefined}
          onOpenAutoFocus={(event) => {
            if (isBounded && readingStartRef.current) {
              event.preventDefault();
              readingStartRef.current.focus();
            }
          }}
        >
          <div className={isBounded ? "qa-bounded-composition" : "lyceum-select-demo"}>
            {isTall && (
              <>
                {isBounded && (
                  <h3
                    id="qa-tall-reading-start"
                    className="qa-bounded-reading__start"
                    tabIndex={-1}
                    ref={readingStartRef}
                  >
                    Study notes
                  </h3>
                )}
                <section
                  data-qa-tall-reading
                  className={isBounded ? "qa-bounded-reading glass-reading" : undefined}
                  role={isBounded ? "region" : undefined}
                  aria-label="Study preparation notes"
                  tabIndex={isBounded ? 0 : undefined}
                >
                  {studyPreparationNotes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </section>
              </>
            )}
            <div
              className={isBounded ? "qa-bounded-controls" : "qa-unbounded-controls"}
              role={isBounded ? "group" : undefined}
              aria-label={isBounded ? "Study controls" : undefined}
            >
              {isTall && (
                <Button variant="secondary" onClick={() => setReviewedNotes((value) => !value)}>
                  {reviewedNotes ? "Notes acknowledged" : "Acknowledge study notes"}
                </Button>
              )}
              <label className="lyceum-select-demo__label" htmlFor="qa-runtime-topic">
                Study topic
              </label>
              <Select dir={directionMode} value={topic} onValueChange={setTopic}>
                <SelectTrigger id="qa-runtime-topic">
                  <SelectValue placeholder="Choose a study topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="math">Mathematics</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                  {optionMode === "long" &&
                    extraTopics.map(([value, name]) => (
                      <SelectItem key={value} value={value}>
                        {name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p>Selected topic: {topic}</p>
              {isTall && (
                <>
                  <Button variant="secondary" onClick={() => setSaved((value) => !value)}>
                    {saved ? "Study settings saved" : "Save study settings"}
                  </Button>
                  <label className="lyceum-select-demo__label" htmlFor="qa-runtime-pace">
                    Study pace
                  </label>
                  <Select dir={directionMode} value={studyPace} onValueChange={setStudyPace}>
                    <SelectTrigger id="qa-runtime-pace">
                      <SelectValue placeholder="Choose a study pace" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="steady">Steady</SelectItem>
                      <SelectItem value="focused">Focused</SelectItem>
                      <SelectItem value="intensive">Intensive</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <p id="qa-runtime-identity" data-qa-instance={mountId.current}>
        Test-only live preferences: {preferences.theme}, {preferences.contrast},
        {preferences.transparency}, {preferences.motion}, {preferences.textScale}
      </p>
    </div>
  );
}

/** Allows the browser to prove cleanup without a page reload or fake remount. */
function RuntimePreferencesTestHarness() {
  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    const unmount = () => setMounted(false);
    window.addEventListener("lyceum:qa-unmount-fixture", unmount);
    return () => window.removeEventListener("lyceum:qa-unmount-fixture", unmount);
  }, []);
  return mounted ? <RuntimePreferencesFixture /> : <p>QA fixture unmounted</p>;
}

const meta = {
  title: "QA/RuntimePreferences",
  component: RuntimePreferencesFixture,
  parameters: { a11y: { test: "error" }, stageSurface: "flat" },
  // This QA-only fixture is not another public Primitives/* component or documentation page.
  tags: ["!autodocs"],
} satisfies Meta<typeof RuntimePreferencesFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MountedDialogSelect: Story = {
  globals: { theme: "dark", contrast: "standard", transparency: "full", motion: "full" },
  render: () => <RuntimePreferencesTestHarness />,
};

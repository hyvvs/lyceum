import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.theme;
    root.dataset.contrast = preferences.contrast;
    root.dataset.transparency = preferences.transparency;
    root.dataset.motion = preferences.motion;
    root.style.fontSize = preferences.textScale;
  }, [preferences]);

  return (
    <div className="lyceum-select-demo">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>Open runtime study settings</Button>
        </DialogTrigger>
        <DialogContent title="Settings" description="Choose a topic.">
          <div className="lyceum-select-demo">
            <label className="lyceum-select-demo__label" htmlFor="qa-runtime-topic">
              Study topic
            </label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger id="qa-runtime-topic">
                <SelectValue placeholder="Choose a study topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="math">Mathematics</SelectItem>
                <SelectItem value="physics">Physics</SelectItem>
                <SelectItem value="chemistry">Chemistry</SelectItem>
                <SelectItem value="history">History</SelectItem>
              </SelectContent>
            </Select>
            <p>Selected topic: {topic}</p>
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

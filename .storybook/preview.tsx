import type { Preview } from "@storybook/react-vite";
import { type ReactNode, useEffect } from "react";
import "../packages/ui/src/glass.css";
import "./preview.css";

interface FrameProps {
  children: ReactNode;
  theme: string;
  transparency: string;
  contrast: string;
  motion: string;
  textScale: string;
  /** A flat frame is required when the story renders its own glass layer. */
  stageSurface: "reading" | "flat";
}

function StoryFrame({
  children,
  theme,
  transparency,
  contrast,
  motion,
  textScale,
  stageSurface,
}: FrameProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.transparency = transparency;
    root.dataset.contrast = contrast;
    root.dataset.motion = motion;
    root.style.fontSize = textScale;
    return () => {
      for (const name of ["theme", "transparency", "contrast", "motion"]) {
        root.removeAttribute(`data-${name}`);
      }
      root.style.removeProperty("font-size");
    };
  }, [theme, transparency, contrast, motion, textScale]);

  return (
    <main className="storybook-stage">
      <div
        className={
          stageSurface === "flat" ? "storybook-surface" : "glass-reading storybook-surface"
        }
      >
        {children}
      </div>
    </main>
  );
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: { icon: "circlehollow", items: ["auto", "dark", "light"] },
    },
    transparency: {
      description: "Glass transparency",
      toolbar: { icon: "contrast", items: ["full", "reduced", "off"] },
    },
    contrast: {
      description: "Contrast",
      toolbar: { icon: "contrast", items: ["standard", "high"] },
    },
    motion: {
      description: "Motion",
      toolbar: { icon: "lightning", items: ["full", "reduced", "off"] },
    },
    textScale: { description: "Text size", toolbar: { icon: "text", items: ["100%", "200%"] } },
  },
  initialGlobals: {
    theme: "dark",
    transparency: "off",
    contrast: "standard",
    motion: "reduced",
    textScale: "100%",
  },
  decorators: [
    (Story, context) => (
      <StoryFrame
        theme={String(context.globals.theme)}
        transparency={String(context.globals.transparency)}
        contrast={String(context.globals.contrast)}
        motion={String(context.globals.motion)}
        textScale={String(context.globals.textScale)}
        stageSurface={context.parameters.stageSurface === "flat" ? "flat" : "reading"}
      >
        <Story />
      </StoryFrame>
    ),
  ],
};

export default preview;

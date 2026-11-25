import type { Preview } from "@storybook/react-vite";
import { type ReactNode, useEffect } from "react";
import "../packages/ui/src/glass.css";
import "./preview.css";

interface FrameProps {
  children: ReactNode;
  theme: string;
  backdrop: string;
  transparency: string;
  contrast: string;
  motion: string;
  textScale: string;
  /** A flat frame is required when the story renders its own glass layer. */
  stageSurface: "reading" | "flat" | "fullbleed";
}

function StoryFrame({
  children,
  theme,
  backdrop,
  transparency,
  contrast,
  motion,
  textScale,
  stageSurface,
}: FrameProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.backdrop = backdrop;
    root.dataset.transparency = transparency;
    root.dataset.contrast = contrast;
    root.dataset.motion = motion;
    root.dataset.textScale = textScale;
    root.style.fontSize = textScale;
    return () => {
      for (const name of ["theme", "backdrop", "transparency", "contrast", "motion", "textScale"]) {
        root.removeAttribute(`data-${name}`);
      }
      root.style.removeProperty("font-size");
    };
  }, [theme, backdrop, transparency, contrast, motion, textScale]);

  const Stage = stageSurface === "fullbleed" ? "div" : "main";
  return (
    <Stage
      className={
        stageSurface === "fullbleed"
          ? "storybook-stage storybook-stage--fullbleed"
          : "storybook-stage"
      }
    >
      <div
        className={
          stageSurface === "reading" ? "glass-reading storybook-surface" : "storybook-surface"
        }
      >
        {children}
      </div>
    </Stage>
  );
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: { icon: "circlehollow", items: ["auto", "dark", "light"] },
    },
    backdrop: {
      description: "Backdrop (CSS demonstration only; no M0-019 assets)",
      toolbar: { icon: "photo", items: ["solid", "atmospheric"] },
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
    backdrop: "solid",
    transparency: "off",
    contrast: "standard",
    motion: "reduced",
    textScale: "100%",
  },
  decorators: [
    (Story, context) => (
      <StoryFrame
        theme={String(context.globals.theme)}
        backdrop={String(context.globals.backdrop)}
        transparency={String(context.globals.transparency)}
        contrast={String(context.globals.contrast)}
        motion={String(context.globals.motion)}
        textScale={String(context.globals.textScale)}
        stageSurface={
          context.parameters.stageSurface === "fullbleed"
            ? "fullbleed"
            : context.parameters.stageSurface === "flat"
              ? "flat"
              : "reading"
        }
      >
        <Story />
      </StoryFrame>
    ),
  ],
};

export default preview;

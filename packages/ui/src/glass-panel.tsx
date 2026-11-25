import { type ComponentPropsWithoutRef, forwardRef } from "react";

/** Existing surface recipes only; no new blur levels or focus behavior. */
export type GlassPanelLevel = "standard" | "raised" | "floating" | "reading";

export type GlassPanelProps = ComponentPropsWithoutRef<"section"> & {
  level?: GlassPanelLevel;
};

const surfaceClass: Record<GlassPanelLevel, string> = {
  standard: "glass",
  raised: "glass-raised",
  floating: "glass-float",
  reading: "glass-reading",
};

/** A semantic section; consumers provide a heading or aria-label where applicable. */
export const GlassPanel = forwardRef<HTMLElement, GlassPanelProps>(function GlassPanel(
  { level = "standard", className, children, ...attributes },
  ref,
) {
  return (
    <section
      {...attributes}
      ref={ref}
      className={[surfaceClass[level], "lyceum-glass-panel", className].filter(Boolean).join(" ")}
    >
      {children}
    </section>
  );
});

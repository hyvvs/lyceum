import { type ComponentPropsWithoutRef, forwardRef } from "react";

export type GlassCardLevel = "standard" | "raised";
export type GlassCardProps = ComponentPropsWithoutRef<"article"> & {
  level?: GlassCardLevel;
};

/** A semantic card; children own headings, actions and meaningful content. */
export const GlassCard = forwardRef<HTMLElement, GlassCardProps>(function GlassCard(
  { level = "standard", className, children, ...attributes },
  ref,
) {
  return (
    <article
      {...attributes}
      ref={ref}
      className={[level === "raised" ? "glass-raised" : "glass", "lyceum-glass-card", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </article>
  );
});

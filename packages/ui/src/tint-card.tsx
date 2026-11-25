import { type ComponentPropsWithoutRef, forwardRef } from "react";

/** Fixed category palette; color is never the sole meaning conveyed to the learner. */
export type TintHue = "blue" | "amber" | "purple" | "green" | "red";
export type TintCardProps = ComponentPropsWithoutRef<"article"> & {
  hue: TintHue;
};

/** Category article; consumer supplies an accessible name and non-color cue. */
export const TintCard = forwardRef<HTMLElement, TintCardProps>(function TintCard(
  { hue, className, children, ...attributes },
  ref,
) {
  return (
    <article
      {...attributes}
      ref={ref}
      data-hue={hue}
      className={["glass-tint", "lyceum-tint-card", className].filter(Boolean).join(" ")}
    >
      {children}
    </article>
  );
});

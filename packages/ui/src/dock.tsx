import { type ComponentPropsWithoutRef, forwardRef } from "react";

/** A native, named navigation landmark with consumer-owned destinations and current state. */
export type DockProps = ComponentPropsWithoutRef<"nav"> & {
  /** Optional orientation hint; omit when the consumer's responsive CSS controls layout. */
  orientation?: "horizontal" | "vertical";
};

/** Presentational glass Dock; Tooltip and semantic links are composed by the consumer. */
export const Dock = forwardRef<HTMLElement, DockProps>(function Dock(
  { orientation, className, children, ...attributes },
  ref,
) {
  return (
    <nav
      {...attributes}
      ref={ref}
      data-orientation={orientation}
      className={["glass-float", "glass-pill", "lyceum-dock", className].filter(Boolean).join(" ")}
    >
      {children}
    </nav>
  );
});

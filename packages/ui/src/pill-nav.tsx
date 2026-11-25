import { type ComponentPropsWithoutRef, forwardRef } from "react";

/** A native navigation landmark. Consumers provide an accessible name, links and route state. */
export type PillNavProps = ComponentPropsWithoutRef<"nav">;

/** Presentational floating glass navigation; never owns routing or focus. */
export const PillNav = forwardRef<HTMLElement, PillNavProps>(function PillNav(
  { className, children, ...attributes },
  ref,
) {
  return (
    <nav
      {...attributes}
      ref={ref}
      className={["glass-float", "glass-pill", "lyceum-pill-nav", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </nav>
  );
});

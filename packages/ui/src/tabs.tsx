import * as TabsPrimitive from "@radix-ui/react-tabs";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

/** Tab selection is managed by Radix (controlled or uncontrolled); automatic activation is default. */
export type TabsProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Root>;

export function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root
      {...props}
      className={["lyceum-tabs", className].filter(Boolean).join(" ")}
    />
  );
}

/** Use aria-label or aria-labelledby to name each tablist. */
export type TabsListProps = Omit<
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
  "asChild" | "role" | "aria-orientation" | "aria-hidden" | "hidden"
> & {
  asChild?: never;
  role?: never;
  "aria-orientation"?: never;
  "aria-hidden"?: never;
  hidden?: never;
};

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  {
    asChild,
    role,
    "aria-orientation": ariaOrientation,
    "aria-hidden": ariaHidden,
    hidden,
    className,
    ...props
  },
  ref,
) {
  if (
    asChild !== undefined ||
    role !== undefined ||
    ariaOrientation !== undefined ||
    ariaHidden !== undefined ||
    hidden !== undefined
  ) {
    throw new Error("TabsList must render a native tablist.");
  }
  return (
    <TabsPrimitive.List
      {...props}
      ref={ref}
      className={["glass-float", "lyceum-tabs__list", className].filter(Boolean).join(" ")}
    />
  );
});

/** Retain native button and Radix-owned tab state, ARIA IDs and roving focus. */
export type TabsTriggerProps = Omit<
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
  | "asChild"
  | "type"
  | "role"
  | "id"
  | "tabIndex"
  | "aria-selected"
  | "aria-controls"
  | "aria-hidden"
  | "hidden"
> & {
  asChild?: never;
  type?: never;
  role?: never;
  id?: never;
  tabIndex?: never;
  "aria-selected"?: never;
  "aria-controls"?: never;
  "aria-hidden"?: never;
  hidden?: never;
};

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(function TabsTrigger(
  {
    asChild,
    type,
    role,
    id,
    tabIndex,
    "aria-selected": ariaSelected,
    "aria-controls": ariaControls,
    "aria-hidden": ariaHidden,
    hidden,
    className,
    ...props
  },
  ref,
) {
  if (
    asChild !== undefined ||
    type !== undefined ||
    role !== undefined ||
    id !== undefined ||
    tabIndex !== undefined ||
    ariaSelected !== undefined ||
    ariaControls !== undefined ||
    ariaHidden !== undefined ||
    hidden !== undefined
  ) {
    throw new Error("TabsTrigger must render a native button.");
  }
  return (
    <TabsPrimitive.Trigger
      {...props}
      ref={ref}
      className={["lyceum-tabs__trigger", className].filter(Boolean).join(" ")}
    />
  );
});

/** A native tabpanel keeps its relationship to its tab, including at high zoom. */
export type TabsContentProps = Omit<
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>,
  "asChild" | "role" | "id" | "tabIndex" | "aria-labelledby" | "aria-hidden" | "hidden"
> & {
  asChild?: never;
  role?: never;
  id?: never;
  tabIndex?: never;
  "aria-labelledby"?: never;
  "aria-hidden"?: never;
  hidden?: never;
};

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(function TabsContent(
  {
    asChild,
    role,
    id,
    tabIndex,
    "aria-labelledby": labelledBy,
    "aria-hidden": ariaHidden,
    hidden,
    className,
    ...props
  },
  ref,
) {
  if (
    asChild !== undefined ||
    role !== undefined ||
    id !== undefined ||
    tabIndex !== undefined ||
    labelledBy !== undefined ||
    ariaHidden !== undefined ||
    hidden !== undefined
  ) {
    throw new Error("TabsContent must render a native tab panel.");
  }
  return (
    <TabsPrimitive.Content
      {...props}
      ref={ref}
      className={["glass-reading", "lyceum-tabs__content", className].filter(Boolean).join(" ")}
    />
  );
});

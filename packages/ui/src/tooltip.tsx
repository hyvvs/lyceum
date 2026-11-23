import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { tooltipInteraction } from "./motion";

/** Shared 300ms hover delay from the glass motion spec; override for explicit UX needs. */
export type TooltipProviderProps = Omit<
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>,
  "disableHoverableContent"
> & { disableHoverableContent?: never };

export function TooltipProvider({
  delayDuration = tooltipInteraction.hoverDelayMs,
  disableHoverableContent,
  ...props
}: TooltipProviderProps) {
  if (disableHoverableContent !== undefined) {
    throw new Error("Tooltip must remain hoverable for accessible pointer use.");
  }
  return (
    <TooltipPrimitive.Provider
      {...props}
      delayDuration={delayDuration}
      disableHoverableContent={false}
    />
  );
}

/** A dismissable, non-interactive hint. Do not put essential instructions only in tooltips. */
export type TooltipProps = Omit<
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>,
  "disableHoverableContent"
> & { disableHoverableContent?: never };

export function Tooltip({ disableHoverableContent, ...props }: TooltipProps) {
  if (disableHoverableContent !== undefined) {
    throw new Error("Tooltip must remain hoverable for accessible pointer use.");
  }
  return <TooltipPrimitive.Root {...props} disableHoverableContent={false} />;
}

/** Prefer `asChild` with a semantic Button; do not use disabled buttons as the only hint target. */
export type TooltipTriggerProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>;

/** Native tooltip triggers must never implicitly submit a surrounding form. */
export const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  function TooltipTrigger({ asChild, type, ...props }, ref) {
    return (
      <TooltipPrimitive.Trigger
        {...props}
        ref={ref}
        asChild={asChild}
        type={asChild ? type : (type ?? "button")}
      />
    );
  },
);

export type TooltipContentProps = Omit<
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
  "asChild" | "children" | "aria-label" | "aria-hidden" | "role" | "onEscapeKeyDown"
> & {
  /** Short, readable and accessible plain-text explanation. */
  text: string;
  asChild?: never;
  children?: never;
  "aria-label"?: never;
  "aria-hidden"?: never;
  role?: never;
  onEscapeKeyDown?: never;
};

/** Portal content uses an opaque surface to guarantee readable text in all themes. */
export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent(
    {
      text,
      asChild,
      children,
      "aria-label": ariaLabel,
      "aria-hidden": ariaHidden,
      role,
      onEscapeKeyDown,
      className,
      sideOffset = tooltipInteraction.sideOffsetPx,
      collisionPadding = tooltipInteraction.collisionPaddingPx,
      sticky = "always",
      ...props
    },
    ref,
  ) {
    if (
      asChild !== undefined ||
      children !== undefined ||
      ariaLabel !== undefined ||
      ariaHidden !== undefined ||
      role !== undefined ||
      onEscapeKeyDown !== undefined
    ) {
      throw new Error("TooltipContent text and accessibility semantics cannot be overridden.");
    }
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("TooltipContent requires nonempty text.");
    }
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          {...props}
          ref={ref}
          className={["lyceum-tooltip", className].filter(Boolean).join(" ")}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          sticky={sticky}
        >
          {text}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  },
);

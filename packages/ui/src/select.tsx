import * as SelectPrimitive from "@radix-ui/react-select";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { tooltipInteraction } from "./motion";
import { reconcileSelectBackgroundInert, releaseSelectBackgroundInert } from "./select-inert";

/** Controlled and uncontrolled single-choice selection are managed by Radix. */
export type SelectProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Root>;

export function Select(props: SelectProps) {
  return <SelectPrimitive.Root {...props} />;
}

/** A native button with combobox semantics; always name it for the selected field. */
export type SelectTriggerProps = Omit<
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
  | "asChild"
  | "type"
  | "role"
  | "tabIndex"
  | "aria-hidden"
  | "hidden"
  | "aria-expanded"
  | "aria-controls"
  | "aria-haspopup"
> & {
  asChild?: never;
  type?: never;
  role?: never;
  tabIndex?: never;
  "aria-hidden"?: never;
  hidden?: never;
  "aria-expanded"?: never;
  "aria-controls"?: never;
  "aria-haspopup"?: never;
};

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  function SelectTrigger(
    {
      asChild,
      type,
      role,
      tabIndex,
      "aria-hidden": ariaHidden,
      hidden,
      "aria-expanded": ariaExpanded,
      "aria-controls": ariaControls,
      "aria-haspopup": ariaHasPopup,
      className,
      children,
      ...props
    },
    ref,
  ) {
    if (
      asChild !== undefined ||
      type !== undefined ||
      role !== undefined ||
      tabIndex !== undefined ||
      ariaHidden !== undefined ||
      hidden !== undefined ||
      ariaExpanded !== undefined ||
      ariaControls !== undefined ||
      ariaHasPopup !== undefined
    ) {
      throw new Error("SelectTrigger must remain a native, visible combobox button.");
    }
    return (
      <SelectPrimitive.Trigger
        {...props}
        ref={ref}
        type="button"
        className={["lyceum-select__trigger", className].filter(Boolean).join(" ")}
      >
        {children}
        <SelectPrimitive.Icon className="lyceum-select__chevron" aria-hidden="true">
          ▾
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );
  },
);

/** Selected value/placeholder; use alongside a visibly labelled SelectTrigger. */
export type SelectValueProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Value>;
export const SelectValue = SelectPrimitive.Value;

/** Portalled listbox with Radix-managed Escape, collision detection and focus return. */
export type SelectContentProps = Omit<
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>,
  | "asChild"
  | "role"
  | "aria-hidden"
  | "hidden"
  | "id"
  | "tabIndex"
  | "onEscapeKeyDown"
  | "onCloseAutoFocus"
  | "position"
  | "sideOffset"
  | "collisionPadding"
  | "avoidCollisions"
> & {
  asChild?: never;
  role?: never;
  "aria-hidden"?: never;
  hidden?: never;
  id?: never;
  tabIndex?: never;
  onEscapeKeyDown?: never;
  onCloseAutoFocus?: never;
  position?: never;
  sideOffset?: never;
  collisionPadding?: never;
  avoidCollisions?: never;
};

export const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(function SelectContent(
  {
    asChild,
    role,
    "aria-hidden": ariaHidden,
    hidden,
    id,
    tabIndex,
    onEscapeKeyDown,
    onCloseAutoFocus,
    position,
    sideOffset,
    collisionPadding,
    avoidCollisions,
    className,
    children,
    ...props
  },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const markedRef = useRef(new Set<HTMLElement>());
  const releaseInert = useCallback(() => {
    releaseSelectBackgroundInert(markedRef.current);
  }, []);
  const contentRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
      setIsOpen(node !== null);
    },
    [ref],
  );
  // Radix aria-hides the background while its modal listbox is open. Inert those
  // same siblings so the hidden native trigger and other controls cannot be
  // keyboard-focusable until the listbox closes and focus is returned.
  useEffect(() => {
    if (!isOpen) return;
    const mark = () => {
      reconcileSelectBackgroundInert(
        document.querySelectorAll<HTMLElement>('[data-aria-hidden="true"]'),
        markedRef.current,
      );
    };
    mark();
    const observer = new MutationObserver(mark);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "data-aria-hidden"],
    });
    return () => {
      observer.disconnect();
      releaseInert();
    };
  }, [isOpen, releaseInert]);
  if (
    asChild !== undefined ||
    role !== undefined ||
    ariaHidden !== undefined ||
    hidden !== undefined ||
    id !== undefined ||
    tabIndex !== undefined ||
    onEscapeKeyDown !== undefined ||
    onCloseAutoFocus !== undefined ||
    position !== undefined ||
    sideOffset !== undefined ||
    collisionPadding !== undefined ||
    avoidCollisions !== undefined
  ) {
    throw new Error("SelectContent must preserve listbox, Escape and focus restoration.");
  }
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        {...props}
        ref={contentRef}
        className={["glass-float", "lyceum-select__content", className].filter(Boolean).join(" ")}
        position="popper"
        sideOffset={tooltipInteraction.sideOffsetPx}
        collisionPadding={tooltipInteraction.collisionPaddingPx}
        avoidCollisions
        onCloseAutoFocus={releaseInert}
      >
        <SelectPrimitive.Viewport className="lyceum-select__viewport">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

/** One native Radix option with its accessible text and selected indicator. */
export type SelectItemProps = Omit<
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>,
  | "asChild"
  | "role"
  | "aria-hidden"
  | "hidden"
  | "aria-selected"
  | "aria-disabled"
  | "aria-labelledby"
  | "tabIndex"
> & {
  asChild?: never;
  role?: never;
  "aria-hidden"?: never;
  hidden?: never;
  "aria-selected"?: never;
  "aria-disabled"?: never;
  "aria-labelledby"?: never;
  tabIndex?: never;
};

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(function SelectItem(
  {
    asChild,
    role,
    "aria-hidden": ariaHidden,
    hidden,
    "aria-selected": ariaSelected,
    "aria-disabled": ariaDisabled,
    "aria-labelledby": ariaLabelledBy,
    tabIndex,
    value,
    className,
    children,
    ...props
  },
  ref,
) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    asChild !== undefined ||
    role !== undefined ||
    ariaHidden !== undefined ||
    hidden !== undefined ||
    ariaSelected !== undefined ||
    ariaDisabled !== undefined ||
    ariaLabelledBy !== undefined ||
    tabIndex !== undefined
  ) {
    throw new Error("SelectItem requires a nonempty value and native, visible option semantics.");
  }
  return (
    <SelectPrimitive.Item
      {...props}
      value={value}
      ref={ref}
      className={["lyceum-select__item", className].filter(Boolean).join(" ")}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="lyceum-select__indicator" aria-hidden="true">
        ✓
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
});

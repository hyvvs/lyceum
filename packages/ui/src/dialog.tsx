import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { Button } from "./button";

/** Only modal dialogs are supported; Radix handles focus trapping and focus return. */
export type DialogProps = Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, "modal"> & {
  modal?: never;
};

/** Modal behavior cannot be disabled, including by untyped JavaScript callers. */
export function Dialog({ modal, ...props }: DialogProps) {
  if (modal !== undefined) throw new Error("Dialog always uses modal focus containment.");
  return <DialogPrimitive.Root {...props} modal />;
}

/** Semantic trigger; use `asChild` with Button to preserve Lyceum styling. */
export const DialogTrigger = DialogPrimitive.Trigger;

/** Optional custom close action within dialog content. */
export const DialogClose = DialogPrimitive.Close;

/** A modal always requires a visible title and description for assistive technology. */
export interface DialogContentProps
  extends Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "asChild"> {
  title: string;
  description: string;
  asChild?: never;
}

/** Portal-based, labeled modal with its own keyboard-operable close control. */
export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { title, description, children, className, asChild, ...props },
  ref,
) {
  if (asChild !== undefined) {
    throw new Error(
      "DialogContent cannot use asChild because it renders multiple labeled children.",
    );
  }
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim()
  ) {
    throw new Error("DialogContent requires a nonempty title and description.");
  }
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="lyceum-dialog__overlay" />
      <DialogPrimitive.Content
        {...props}
        ref={ref}
        className={["glass-float", "lyceum-dialog", className].filter(Boolean).join(" ")}
      >
        <DialogPrimitive.Title className="lyceum-dialog__title">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="lyceum-dialog__description">
          {description}
        </DialogPrimitive.Description>
        <div className="lyceum-dialog__body">{children}</div>
        <DialogPrimitive.Close asChild>
          <Button aria-label="Close dialog" variant="secondary">
            Close
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

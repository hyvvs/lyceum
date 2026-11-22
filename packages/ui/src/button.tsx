import { Slot, Slottable } from "@radix-ui/react-slot";
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  forwardRef,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonStyleProps {
  /** The focal action should be the only primary button in a view. */
  variant?: ButtonVariant;
}

/** Native button; `loading` keeps focus while suppressing activation. */
type NativeButtonProps = ButtonStyleProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Keeps focus and the accessible name while preventing activation. */
    loading?: boolean;
    asChild?: false;
  };

/** Use a semantic child such as an anchor; disabled/loading are deliberately unsupported. */
type SlottedButtonProps = ButtonStyleProps &
  Omit<HTMLAttributes<HTMLElement>, "children"> & {
    asChild: true;
    children?: ReactElement;
    disabled?: never;
    loading?: never;
    type?: never;
  };

export type ButtonProps = NativeButtonProps | SlottedButtonProps;

/** Ref points to the native button or the element supplied to `asChild`. */
export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    asChild = false,
    variant = "primary",
    loading = false,
    disabled = false,
    className,
    children,
    type = "button",
    onClick,
    onKeyDown,
    tabIndex,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : "button";
  const blocked = disabled || loading;
  if (asChild && blocked) {
    throw new Error("Button asChild cannot be disabled or loading; use a native button instead.");
  }

  return (
    <Component
      {...props}
      // The native element is a button; Slot accepts an HTMLElement ref.
      ref={ref as Ref<HTMLButtonElement>}
      type={asChild ? undefined : type}
      disabled={asChild ? undefined : disabled}
      data-variant={variant}
      data-loading={loading || undefined}
      className={["lyceum-button", className].filter(Boolean).join(" ")}
      aria-busy={loading || undefined}
      aria-disabled={loading || (asChild && disabled) || undefined}
      tabIndex={asChild && disabled ? -1 : tabIndex}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        if (asChild && blocked && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          return;
        }
        onKeyDown?.(event);
      }}
    >
      {loading && <span className="lyceum-button__spinner" aria-hidden="true" />}
      <Slottable>{children}</Slottable>
    </Component>
  );
});

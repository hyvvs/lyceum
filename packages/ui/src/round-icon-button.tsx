import { type ButtonHTMLAttributes, type ReactNode, forwardRef, useId } from "react";
import { VisuallyHidden } from "./visually-hidden";

export interface RoundIconBadge {
  /** Visible short label; omit for a status dot. Never inferred from a store. */
  text?: string;
  /** Describes the badge separately from the icon button's accessible name. */
  label: string;
}

/** Consumer-owned native icon action; icon is decorative and never a nested control. */
export type RoundIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  "aria-label": string;
  /** Trusted decorative icon content only; must not contain a nested interactive element. */
  icon: ReactNode;
  badge?: RoundIconBadge;
  /** Keeps keyboard focus but prevents activation while pending. */
  loading?: boolean;
};

export const RoundIconButton = forwardRef<HTMLButtonElement, RoundIconButtonProps>(
  function RoundIconButton(
    {
      icon,
      badge,
      loading = false,
      disabled = false,
      className,
      type = "button",
      onClick,
      "aria-label": accessibleName,
      "aria-describedby": description,
      ...attributes
    },
    ref,
  ) {
    if (!accessibleName?.trim()) {
      throw new Error("RoundIconButton needs a nonempty aria-label for the icon-only action.");
    }
    if (badge && !badge.label.trim()) {
      throw new Error("RoundIconButton badge needs meaningful accessible information.");
    }
    const badgeDescriptionId = useId();
    const describedBy = [description, badge ? badgeDescriptionId : undefined]
      .filter(Boolean)
      .join(" ");
    return (
      <span className="lyceum-round-icon-button__wrap">
        <button
          {...attributes}
          ref={ref}
          type={type}
          disabled={disabled}
          aria-label={accessibleName}
          aria-describedby={describedBy || undefined}
          aria-disabled={loading || undefined}
          aria-busy={loading || undefined}
          data-loading={loading || undefined}
          className={["lyceum-round-icon-button", className].filter(Boolean).join(" ")}
          onClick={(event) => {
            if (loading) {
              event.preventDefault();
              event.stopPropagation();
            } else {
              onClick?.(event);
            }
          }}
        >
          <span className="lyceum-round-icon-button__icon" aria-hidden="true">
            {icon}
          </span>
          {loading && <span className="lyceum-round-icon-button__spinner" aria-hidden="true" />}
        </button>
        {badge && (
          <>
            <span className="lyceum-round-icon-button__badge" aria-hidden="true">
              {badge.text || "•"}
            </span>
            <VisuallyHidden id={badgeDescriptionId}>{badge.label}</VisuallyHidden>
          </>
        )}
      </span>
    );
  },
);

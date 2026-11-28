import type { HTMLAttributes, ReactNode } from "react";

export type ChipTone = "neutral" | "positive" | "warning" | "danger" | "accent";
export interface ChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: ReactNode;
  tone?: ChipTone;
}

/** Noninteractive category label; use a Button for actions. */
export function Chip({ children, tone = "neutral", className, ...props }: ChipProps) {
  return (
    <span {...props} className={["ui-chip", className].filter(Boolean).join(" ")} data-tone={tone}>
      {children}
    </span>
  );
}

/** Noninteractive count or status label. Include text so tone is never the only cue. */
export function Badge({ children, tone = "neutral", className, ...props }: ChipProps) {
  return (
    <span {...props} className={["ui-badge", className].filter(Boolean).join(" ")} data-tone={tone}>
      {children}
    </span>
  );
}

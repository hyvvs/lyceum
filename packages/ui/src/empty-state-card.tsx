import { type ReactNode, useId } from "react";
import { Button } from "./button";

export interface EmptyStateCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: { label: string; onActivate: () => void; disabled?: boolean; loading?: boolean };
  className?: string;
}

/** A truthful empty or unavailable state with an optional real action. */
export function EmptyStateCard({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateCardProps) {
  const titleId = useId();
  return (
    <section
      className={["glass", "ui-empty-state", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <h2 className="ui-empty-state__title" id={titleId}>
        {title}
      </h2>
      <p className="ui-empty-state__description">{description}</p>
      {action && (
        <Button
          className="ui-empty-state__action"
          onClick={action.onActivate}
          disabled={action.disabled ?? false}
          loading={action.loading ?? false}
        >
          {action.label}
        </Button>
      )}
    </section>
  );
}

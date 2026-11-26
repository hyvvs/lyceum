import { useId } from "react";

/** Direct display of the learner model's pKnown and supplied uncertainty interval. */
export interface MasteryEstimate {
  value: number;
  lower: number;
  upper: number;
}
export interface MasteryRingProps {
  label: string;
  /** Null/absent is unassessed, not zero mastery. The consumer provides all interval values. */
  estimate?: MasteryEstimate | null;
  unassessedLabel?: string;
  className?: string;
}

const radius = 32;
const circumference = 2 * Math.PI * radius;
const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

export function MasteryRing({
  label,
  estimate,
  unassessedLabel = "Unassessed",
  className,
}: MasteryRingProps) {
  if (!label.trim() || !unassessedLabel.trim()) {
    throw new Error("MasteryRing needs meaningful label and unassessed wording.");
  }
  if (
    estimate &&
    (![estimate.value, estimate.lower, estimate.upper].every(Number.isFinite) ||
      estimate.lower < 0 ||
      estimate.upper > 1 ||
      estimate.lower > estimate.value ||
      estimate.value > estimate.upper)
  ) {
    throw new Error(
      "MasteryRing invalid probability or uncertainty interval; do not clamp estimates.",
    );
  }
  const labelId = useId();
  return (
    <figure
      className={["glass", "lyceum-mastery-ring", className].filter(Boolean).join(" ")}
      data-assessed={!!estimate}
    >
      <figcaption id={labelId}>{label}</figcaption>
      {estimate ? (
        <>
          <svg
            viewBox="0 0 100 100"
            className="lyceum-mastery-ring__visual"
            aria-hidden="true"
            focusable="false"
          >
            <circle className="lyceum-mastery-ring__track" cx="50" cy="50" r={radius} />
            <circle
              className="lyceum-mastery-ring__uncertainty"
              cx="50"
              cy="50"
              r={radius + 8}
              strokeDasharray={`${(estimate.upper - estimate.lower) * 2 * Math.PI * (radius + 8)} ${2 * Math.PI * (radius + 8)}`}
              strokeDashoffset={-estimate.lower * 2 * Math.PI * (radius + 8)}
            />
            <circle
              className="lyceum-mastery-ring__progress"
              cx="50"
              cy="50"
              r={radius}
              strokeDasharray={`${estimate.value * circumference} ${circumference}`}
            />
          </svg>
          <p className="lyceum-mastery-ring__value">{percent(estimate.value)}</p>
          <p className="lyceum-mastery-ring__interval">
            Uncertainty: {percent(estimate.lower)}–{percent(estimate.upper)}
          </p>
        </>
      ) : (
        <p className="lyceum-mastery-ring__unassessed">{unassessedLabel}</p>
      )}
    </figure>
  );
}

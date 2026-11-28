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
  /** Consumer-supplied wording for the visible lower/upper interval. */
  uncertaintyLabel?: string;
  /** BCP-47 locale for percentage and interval text; independent of probability geometry. */
  locale?: string;
  /** Explicit opt-in for the one chromatically highlighted datum in a view. */
  highlighted?: boolean;
  className?: string;
}

const radius = 32;
const circumference = 2 * Math.PI * radius;
export function MasteryRing({
  label,
  estimate,
  unassessedLabel = "Unassessed",
  uncertaintyLabel = "Uncertainty",
  locale,
  highlighted = false,
  className,
}: MasteryRingProps) {
  if (!label.trim() || !unassessedLabel.trim() || !uncertaintyLabel.trim()) {
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
  const percentage = new Intl.NumberFormat(locale ?? "en-US", {
    style: "percent",
    maximumSignificantDigits: 17,
  });
  return (
    <figure
      className={["glass", "lyceum-mastery-ring", className].filter(Boolean).join(" ")}
      lang={locale}
      data-assessed={!!estimate}
      data-highlighted={highlighted || undefined}
    >
      <figcaption className="lyceum-mastery-ring__readout" id={labelId}>
        <span>{label}</span>
        {estimate && (
          <p className="lyceum-mastery-ring__value">{percentage.format(estimate.value)}</p>
        )}
      </figcaption>
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
              r={radius + 11}
              strokeLinecap="round"
              strokeDasharray={`${(estimate.upper - estimate.lower) * 2 * Math.PI * (radius + 11)} ${2 * Math.PI * (radius + 11)}`}
              strokeDashoffset={-estimate.lower * 2 * Math.PI * (radius + 11)}
            />
            <circle
              className="lyceum-mastery-ring__progress"
              cx="50"
              cy="50"
              r={radius}
              strokeLinecap="round"
              strokeDasharray={`${estimate.value * circumference} ${circumference}`}
            />
          </svg>
          <p className="lyceum-mastery-ring__interval">
            {uncertaintyLabel}: {percentage.format(estimate.lower)}–
            {percentage.format(estimate.upper)}
          </p>
        </>
      ) : (
        <p className="lyceum-mastery-ring__unassessed">{unassessedLabel}</p>
      )}
    </figure>
  );
}

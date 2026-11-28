export interface SkeletonLoaderProps {
  label: string;
  lines?: readonly { id: string; width: "short" | "medium" | "full" }[];
  className?: string;
}

/** Announces a loading state once; decorative placeholder lines are hidden from AT. */
export function SkeletonLoader({
  label,
  lines = [
    { id: "first", width: "full" },
    { id: "second", width: "medium" },
    { id: "third", width: "short" },
  ],
  className,
}: SkeletonLoaderProps) {
  return (
    <output className={["ui-skeleton", className].filter(Boolean).join(" ")}>
      <span>{label}</span>
      {lines.map(({ id, width }) => (
        <span className="ui-skeleton__line" data-width={width} aria-hidden="true" key={id} />
      ))}
    </output>
  );
}

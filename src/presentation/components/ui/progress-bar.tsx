import { cn } from "./cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  /** Mostra "3/20" ao lado do rotulo. */
  showValue?: boolean;
  tone?: "brand" | "accent";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "brand",
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(safeMax, Math.max(0, value));
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {showValue ? (
          <span className="text-sm tabular-nums text-muted">
            {clamped}/{safeMax}
          </span>
        ) : null}
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            tone === "brand" ? "bg-brand" : "bg-accent",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

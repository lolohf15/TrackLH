import { cn } from "@/lib/utils";

const SIZES = {
  lg: "text-[38px] tracking-[-0.03em] leading-none",
  md: "text-[19px] tracking-[-0.02em]",
};

/**
 * Eyebrow, figure, and what the figure is doing. The figure is set in the UI
 * face rather than the mono one — heavy and tight is what makes a balance read
 * as the headline of its panel. Mono stays on the eyebrow above it.
 */
export function MetricTile({
  label,
  value,
  size = "md",
  trend = null,
  trendPolarity = "up-good",
  hint,
  className,
}: {
  label: string;
  /** Already formatted — the caller owns currency and any count-up tween. */
  value: string;
  size?: keyof typeof SIZES;
  /** Percent change against the previous period. Null hides the row. */
  trend?: number | null;
  /** Whether rising is the good direction. Income rises well; spending doesn't. */
  trendPolarity?: "up-good" | "down-good";
  /** A quiet line under the figure, for context the number can't carry. */
  hint?: string;
  className?: string;
}) {
  const rising = trend !== null && trend >= 0;
  const good = trendPolarity === "up-good" ? rising : !rising;

  return (
    <div className={className}>
      <div className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {label}
      </div>

      <div className={cn("font-semibold text-text tabular-nums mt-1.5", SIZES[size])}>
        {value}
      </div>

      {hint && <div className="text-xs text-text-dim mt-1.5">{hint}</div>}

      {trend !== null && (
        <div className={cn("font-mono text-[11px] mt-1", good ? "text-green-fg" : "text-red-fg")}>
          {rising ? "▲" : "▼"} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

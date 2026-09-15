import { cn } from "@/lib/utils";

/**
 * The percentage pill that rides beside a headline figure. A number this
 * small needs a ground of its own to read as a verdict rather than as part
 * of the figure next to it.
 */
export function TrendBadge({
  value,
  polarity = "up-good",
  className,
}: {
  /** Percent change. Sign is rendered; the caller passes it signed. */
  value: number;
  /** Whether rising is the good direction. Income rises well; spending doesn't. */
  polarity?: "up-good" | "down-good";
  className?: string;
}) {
  const rising = value >= 0;
  const good = polarity === "up-good" ? rising : !rising;
  // A rounded percentage that lands on zero still has a direction, and the
  // sign is the only thing left to say it with.
  const shown = Math.abs(value) < 10 ? Math.abs(value).toFixed(1) : String(Math.round(Math.abs(value)));

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-[3px] font-mono text-[10.5px] font-medium tabular-nums whitespace-nowrap",
        good ? "bg-green-bg text-green-fg" : "bg-red-bg text-red-fg",
        className
      )}
    >
      {rising ? "+" : "−"}
      {shown}%
    </span>
  );
}

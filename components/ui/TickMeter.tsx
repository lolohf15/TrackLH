import { cn } from "@/lib/utils";

/**
 * A proportion told in tally marks instead of one continuous bar: the ticks
 * that are spent stand lit, the rest stay dark. A bar says "about two
 * thirds"; this says it in units you can count, which is what a budget or a
 * credit line actually is.
 */
export function TickMeter({
  percent,
  color,
  ticks = 34,
  height = 26,
  className,
}: {
  /** 0–100. Past 100 every tick lights, which is the point being made. */
  percent: number;
  color: string;
  /** Marks across the whole width. Fewer reads coarser, which can be right. */
  ticks?: number;
  height?: number;
  className?: string;
}) {
  const lit = Math.round((Math.min(Math.max(percent, 0), 100) / 100) * ticks);

  return (
    <div
      className={cn("flex items-stretch gap-[2.5px] w-full", className)}
      style={{ height }}
      aria-hidden="true"
    >
      {Array.from({ length: ticks }, (_, i) => (
        <span
          key={i}
          className="flex-1 min-w-0 rounded-[1.5px] transition-colors duration-300 ease-out"
          style={{ background: i < lit ? color : "var(--color-surface-3)" }}
        />
      ))}
    </div>
  );
}

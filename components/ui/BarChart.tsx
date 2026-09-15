import { cn } from "@/lib/utils";

export interface ChartBar {
  /** Sits under the bar. Kept short — these are days or month abbreviations. */
  label: string;
  value: number;
  /** The one bar carrying color. Everything else gets texture instead. */
  highlight?: boolean;
}

/**
 * Vertical bars where exactly one carries the hue and the rest are hatched.
 * Texture rather than a second color keeps the highlighted bar the only thing
 * in the chart making a claim.
 */
export function BarChart({
  bars,
  color,
  height = 110,
  className,
}: {
  bars: ChartBar[];
  /** The highlighted bar's fill. */
  color: string;
  /** Of the bars themselves, in pixels — labels sit below this. */
  height?: number;
  className?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className={cn("flex items-end gap-2", className)}>
      {bars.map((bar, i) => (
        <div key={`${bar.label}-${i}`} className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <div className="w-full flex items-end" style={{ height }}>
            <div
              className={cn(
                "w-full rounded-t-sm transition-[height] duration-300 ease-out",
                !bar.highlight && "hatch"
              )}
              style={{
                // A floor of 2%, so an empty period still reads as a bar that
                // happens to be empty rather than as a missing one.
                height: `${Math.max(Math.round((bar.value / max) * 100), 2)}%`,
                background: bar.highlight ? color : undefined,
              }}
            />
          </div>
          <span className="font-mono text-[9.5px] text-text-faint uppercase truncate max-w-full">
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}

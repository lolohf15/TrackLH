import { cn } from "@/lib/utils";

export interface BarSegment {
  /** Share of the track, 0–100. Anything past the remaining room is clipped. */
  percent: number;
  /** A CSS color — usually a category's own color or a semantic token. */
  color: string;
}

/**
 * The horizontal proportion bar, written by hand in four places before this:
 * a budget row, the category ranking, a credit line, and the month's
 * income-versus-expense split. One or more segments over a track.
 */
export function ProgressBar({
  segments,
  height = 3,
  radius = "full",
  className,
}: {
  segments: BarSegment[];
  /** In pixels. The track and the fill share it. */
  height?: number;
  /** `sm` squares off the ends for bars thick enough to read as blocks. */
  radius?: "full" | "sm";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full overflow-hidden bg-surface-2",
        radius === "full" ? "rounded-full" : "rounded-sm",
        className
      )}
      style={{ height }}
    >
      {segments.map((segment, i) => (
        <div
          key={i}
          className="h-full transition-[width] duration-300 ease-out"
          style={{
            width: `${Math.max(0, Math.min(segment.percent, 100))}%`,
            background: segment.color,
          }}
        />
      ))}
    </div>
  );
}

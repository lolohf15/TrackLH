import { cn } from "@/lib/utils";

export interface RingSegment {
  value: number;
  color: string;
}

/**
 * A donut of proportions with room in the middle for the figure they add up
 * to. Drawn as one circle per segment with a dash pattern rather than as
 * arc paths: the maths is a running offset instead of trigonometry, and the
 * stroke keeps its width without any scaling to undo.
 */
export function Ring({
  segments,
  size = 108,
  thickness = 11,
  children,
  className,
}: {
  segments: RingSegment[];
  size?: number;
  thickness?: number;
  /** Sits in the hole — normally the total the segments make up. */
  children?: React.ReactNode;
  className?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // A hairline of ground between neighbours, so two categories of similar
  // color still read as two. Dropped when there's only one segment, which
  // would otherwise show a nick in an unbroken ring.
  const gap = segments.length > 1 ? Math.min(circumference * 0.012, 4) : 0;
  // One arc over a track is a progress ring and wants rounded ends; several
  // arcs are a division of a whole, and a round cap there would overlap the
  // neighbour it was just given a gap from.
  const cap = segments.length === 1 ? "round" : "butt";

  let offset = 0;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Rotated so the ring starts at twelve o'clock and runs clockwise. */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            segments.map((segment, i) => {
              const length = (segment.value / total) * circumference;
              const dash = Math.max(length - gap, 1);
              const circle = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={thickness}
                  strokeLinecap={cap}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  className="transition-[stroke-dasharray,stroke-dashoffset] duration-500 ease-out"
                />
              );
              offset += length;
              return circle;
            })}
        </g>
      </svg>

      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

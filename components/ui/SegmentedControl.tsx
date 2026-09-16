"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /**
   * What the pill fills with when this segment is the chosen one. Given, the
   * control stops being a neutral switch and starts teaching an association —
   * which is worth it only where the values already mean something in colour
   * everywhere else in the app.
   */
  tone?: string;
}

/**
 * A pill riding inside a track, the way iOS segments work. Written by hand in
 * three places before this — the movement type, the account type, and now the
 * theme — which is two too many for a control this opinionated.
 */
const SIZES = {
  /** Inside a form, where it sits among 48px fields and should match them. */
  md: "text-[11px] py-2.5 min-h-[40px]",
  /** Page chrome, where the control is navigation rather than an answer. */
  sm: "text-[10px] py-1.5 min-h-[30px]",
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, since the track itself says nothing. */
  label?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "grid gap-1 rounded-md bg-surface-2",
        size === "sm" ? "p-[3px]" : "p-1",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "press rounded-sm font-mono font-medium uppercase tracking-wide",
              "transition-colors duration-150 ease-out",
              SIZES[size],
              // Dark ink on the brass, not white: white on this gold sits at
              // about 2:1 and fails every contrast floor there is. The same
              // holds for every other filled tone, which is what tone-ink is.
              active && !option.tone && "bg-accent text-accent-ink shadow-panel",
              active && option.tone && "text-tone-ink shadow-panel",
              !active && "text-text-dim"
            )}
            style={active && option.tone ? { backgroundColor: option.tone } : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

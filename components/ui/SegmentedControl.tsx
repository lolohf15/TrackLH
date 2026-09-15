"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A pill riding inside a track, the way iOS segments work. Written by hand in
 * three places before this — the movement type, the account type, and now the
 * theme — which is two too many for a control this opinionated.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, since the track itself says nothing. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("grid gap-1 rounded-md bg-surface-2 p-1", className)}
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
              "press rounded-sm font-mono text-[11px] font-medium uppercase tracking-wide py-2.5 min-h-[40px]",
              "transition-colors duration-150 ease-out",
              // Dark ink on the brass, not white: white on this gold sits at
              // about 2:1 and fails every contrast floor there is.
              active ? "bg-accent text-accent-ink shadow-panel" : "text-text-dim"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

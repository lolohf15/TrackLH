"use client";

import { cn } from "@/lib/utils";

/** The palette everything in the app is coloured from. */
export const PALETTE = [
  "#e0703a", "#d2452e", "#e5484d", "#c2547a", "#8b5cd9",
  "#5b7fb5", "#3a8f95", "#4f9d5f", "#22a355", "#d99a15", "#6b7075",
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color">
      {PALETTE.map((color) => {
        const active = value.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              "press w-9 h-9 rounded-full transition-shadow duration-150 ease-out",
              // The ring reads as selection without shifting anything around it.
              active && "ring-2 ring-offset-2 ring-offset-surface ring-text"
            )}
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}

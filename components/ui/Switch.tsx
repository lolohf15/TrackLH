"use client";

import { cn } from "@/lib/utils";

/** An on/off toggle. The thumb slides on a CSS transition, so a fast double
 *  tap reverses it from where it is instead of restarting. */
export function Switch({
  checked, onChange, label, className,
}: { checked: boolean; onChange: (next: boolean) => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full border transition-colors duration-200 ease-out",
        checked ? "bg-accent border-accent" : "bg-surface-3 border-border",
        className
      )}
    >
      <span
        aria-hidden
        className="absolute left-[2px] h-[24px] w-[24px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

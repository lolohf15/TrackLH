"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/shell/icons";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  /** Full-width, touch-sized — the form/sheet variant. */
  block?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Select({
  value, onChange, placeholder, children, block, className, ...rest
}: Props) {
  return (
    <div className={cn("relative", block ? "w-full" : "inline-block")}>
      <select
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "font-mono bg-surface border border-border text-text-muted",
          "hover:border-border-strong hover:text-text",
          "focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/60",
          "appearance-none cursor-pointer transition-colors duration-150",
          block
            ? "w-full rounded-md bg-surface-2 text-[15px] text-text pl-3.5 pr-9 py-3 min-h-[48px]"
            : "rounded-full text-xs pl-3 pr-7 py-1.5",
          className
        )}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDownIcon
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-text-dim",
          block ? "right-3 w-4 h-4" : "right-2 w-3 h-3"
        )}
      />
    </div>
  );
}

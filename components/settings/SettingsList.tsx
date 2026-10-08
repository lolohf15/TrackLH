"use client";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Settings the way a phone lays them out: short grouped lists, one idea per
 * row, the current value on the right and a chevron where a row opens
 * something. Every screen under Perfil is built from these three pieces.
 */

/** The tile colour behind a row's icon, from the app's own semantic hues. */
const TILES = {
  accent: "var(--color-accent)",
  blue: "var(--color-blue)",
  green: "var(--color-green)",
  red: "var(--color-red)",
  amber: "var(--color-amber)",
  purple: "#8b5cd9",
  graphite: "color-mix(in srgb, var(--color-text-muted) 75%, var(--color-surface))",
} as const;
export type TileColor = keyof typeof TILES;

export function SettingsGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  /** A line under the group, for what a row can't say in its label. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title && (
        <h2 className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-4 pb-2">
          {title}
        </h2>
      )}
      <ul className="panel divide-y divide-divider">{children}</ul>
      {footer && <p className="text-[12px] text-text-dim leading-relaxed px-4 pt-2">{footer}</p>}
    </section>
  );
}

export function SettingsRow({
  icon: Icon,
  tile = "accent",
  leading,
  label,
  detail,
  value,
  href,
  onClick,
  tone = "default",
  trailing,
  disabled,
  selected,
}: {
  icon?: LucideIcon;
  tile?: TileColor;
  /** Instead of an icon tile: a colour dot, a category icon. */
  leading?: React.ReactNode;
  label: string;
  /** A second line under the label. */
  detail?: string;
  /** The current setting, shown on the right. */
  value?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** "danger" for destructive rows, "action" for a plain call to action. */
  tone?: "default" | "danger" | "action";
  /** Replaces the chevron (a spinner, a check). */
  trailing?: React.ReactNode;
  disabled?: boolean;
  /** In a choice list: this row is the current one. */
  selected?: boolean;
}) {
  const interactive = !!(href || onClick);
  const body = (
    <>
      {leading}
      {Icon && (
        <span
          aria-hidden
          className="w-[30px] h-[30px] shrink-0 rounded-[8px] grid place-items-center text-white"
          style={{ background: tone === "danger" ? TILES.red : TILES[tile] }}
        >
          <Icon className="w-[17px] h-[17px]" strokeWidth={2} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] leading-snug truncate",
            tone === "danger" ? "text-red-fg" : tone === "action" ? "text-accent" : "text-text"
          )}
        >
          {label}
        </span>
        {detail && <span className="block text-[12px] text-text-dim leading-snug mt-0.5">{detail}</span>}
      </span>
      {value !== undefined && (
        <span className="shrink min-w-0 max-w-[48%] truncate text-[14px] text-text-dim text-right">{value}</span>
      )}
      {trailing ??
        (selected !== undefined ? (
          <Check aria-hidden strokeWidth={2.5} className={cn("w-[18px] h-[18px] text-accent shrink-0", !selected && "invisible")} />
        ) : (
          interactive && tone !== "action" && <ChevronRight aria-hidden className="w-4 h-4 text-text-faint shrink-0" />
        ))}
    </>
  );
  const row = cn(
    "w-full flex items-center gap-3 px-4 min-h-[52px] py-2.5 text-left",
    interactive && "press transition-colors duration-150 active:bg-surface-2/70",
    disabled && "opacity-50 pointer-events-none"
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={row}>
          {body}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={selected}
          className={row}
        >
          {body}
        </button>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}

/** The top of a screen under Perfil: the way back and the screen's name. */
export function SubpageHeader({ title, backLabel, backHref = "/perfil" }: { title: string; backLabel: string; backHref?: string }) {
  return (
    <header className="pt-3 pb-4">
      <Link
        href={backHref}
        className="press inline-flex items-center gap-0.5 -ml-1.5 min-h-[40px] pr-2 text-[15px] text-accent"
      >
        <ChevronLeft className="w-5 h-5" aria-hidden />
        {backLabel}
      </Link>
      <h1 className="text-[26px] font-semibold text-text tracking-[-0.02em] mt-1 px-1">{title}</h1>
    </header>
  );
}

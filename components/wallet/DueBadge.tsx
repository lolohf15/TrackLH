"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import { dueTone } from "@/services/credit-cycle";
import type { CreditCycleStatus } from "@/types";

const TONES = {
  paid: "text-green-fg border-green-border bg-green-bg",
  ok: "text-text-muted border-border",
  soon: "text-amber-fg border-amber-border bg-amber-bg",
  overdue: "text-red-fg border-red-border bg-red-bg",
} as const;

/** How long until the statement is due: neutral, amber under 5 days, red once late. */
export function DueBadge({
  cycle, className,
}: { cycle: Pick<CreditCycleStatus, "remainingToPay" | "daysUntilDue">; className?: string }) {
  const t = useT();
  const tone = dueTone(cycle);
  if (tone === null || cycle.daysUntilDue === null) return null;
  const days = cycle.daysUntilDue;
  const label =
    tone === "paid" ? t.wallet.due.paid
    : days < 0 ? t.wallet.due.overdue(-days)
    : days === 0 ? t.wallet.due.today
    : days === 1 ? t.wallet.due.tomorrow
    : t.wallet.due.inDays(days);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 border font-mono text-[10.5px] font-medium uppercase tracking-wide whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}

/** "30 sep" from a `YYYY-MM-DD` key, read as the wall-clock day it stands for. */
export function shortDay(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${key}T00:00:00Z`))
    .replace(".", "");
}

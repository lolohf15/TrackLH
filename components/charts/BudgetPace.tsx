"use client";

import { useState } from "react";
import { mutate } from "swr";
import { ChartPanel, PanelNote } from "./ChartPanel";
import { Button } from "@/components/ui/Button";
import { BudgetSheet } from "@/components/onboarding/BudgetSheet";
import { formatMXN, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { BudgetPace as BudgetPaceRow } from "@/types";

/** Points ahead of the month before a budget reads as running hot. */
const AHEAD = 10;

/**
 * Each budget against where the month is: the bar is what's spent, the mark
 * is where an even pace would have it today. Being at 60% on the 20th is
 * fine; on the 5th it isn't, and a plain progress bar can't tell those apart.
 */
export function BudgetPace({
  budgets,
  monthProgress,
  inProgress,
}: {
  budgets: BudgetPaceRow[];
  /** 0–100. */
  monthProgress: number;
  inProgress: boolean;
}) {
  const t = useT();
  const [sheet, setSheet] = useState(false);

  return (
    <ChartPanel
      title={t.charts.budgetsTitle}
      aside={budgets.length > 0 && inProgress ? <PanelNote>{monthProgress}%</PanelNote> : undefined}
      readout={budgets.length > 0 && inProgress ? t.charts.budgetsHint(monthProgress) : undefined}
    >
      {budgets.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-1">
          <p className="text-[13px] text-text-muted leading-relaxed max-w-[42ch]">{t.charts.budgetsEmpty}</p>
          <Button size="sm" variant="secondary" onClick={() => setSheet(true)}>
            {t.charts.budgetsAction}
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {budgets.map((b) => {
            const used = (b.spent / b.budget) * 100;
            const over = b.spent > b.budget;
            const ahead = !over && inProgress && used > monthProgress + AHEAD;
            return (
              <li key={b.category}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0 text-[13px] text-text">
                    <span aria-hidden className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: b.color }} />
                    <span className="truncate">{b.category}</span>
                  </span>
                  <span className="text-[11.5px] text-text-dim tabular-nums shrink-0">
                    {t.charts.budgetOf(formatMXN(b.spent), formatMXN(b.budget))}
                  </span>
                </div>
                <div className="relative mt-1.5 h-[6px] rounded-full bg-surface-2">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.min(100, used)}%`, background: over ? "var(--color-red)" : b.color }}
                  />
                  {inProgress && (
                    <span
                      aria-hidden
                      className="absolute -top-[3px] -bottom-[3px] w-[2px] -translate-x-1/2 rounded-full bg-text"
                      style={{ left: `${monthProgress}%` }}
                    />
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    over ? "text-red-fg" : ahead ? "text-amber-fg" : "text-text-dim"
                  )}
                >
                  {over
                    ? t.charts.budgetOver(formatMXN(b.spent - b.budget))
                    : ahead
                      ? t.charts.budgetAhead
                      : t.charts.budgetOnPace}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <BudgetSheet
        open={sheet}
        onClose={() => {
          setSheet(false);
          mutate((key) => typeof key === "string" && key.startsWith("/api/analytics"));
        }}
      />
    </ChartPanel>
  );
}

"use client";

import { SubpageHeader } from "@/components/settings/SettingsList";
import { useState } from "react";
import { PlusIcon } from "@/components/shell/icons";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricTile } from "@/components/ui/MetricTile";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { shortDay } from "@/components/wallet/DueBadge";
import { RecurringEditSheet } from "@/components/recurring/RecurringEditSheet";
import {
  AMOUNT_TONES, ruleTitle, useFrequencyLabel, useRecurringList,
} from "@/components/recurring/use-recurring";
import { cn, formatMXN, getToday } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";
import { useLocale, useT } from "@/lib/i18n-react";
import { useCategoryLookup } from "@/lib/use-category-icons";
import type { RecurringRuleView } from "@/types";


/**
 * Every recurring movement, and what they come to in a month. The figure up
 * top is the floor of a month's spending — what goes out before a single
 * choice is made — which is the number the charts later split "fixed" by.
 */
export default function RecurringPage() {
  const t = useT();
  const { data, isLoading } = useRecurringList();
  const [editing, setEditing] = useState<RecurringRuleView | "new" | null>(null);
  const [session, setSession] = useState(0);

  const rules = data?.rules ?? [];
  const live = rules.filter((r) => r.active && r.nextDate !== null);
  const idle = rules.filter((r) => !(r.active && r.nextDate !== null));
  const fixedDisplay = useCountUp(data?.fixedExpenses ?? 0, formatMXN);

  function open(next: RecurringRuleView | "new") {
    setSession((s) => s + 1);
    setEditing(next);
  }

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pb-6 space-y-3">
      <SubpageHeader title={t.recurring.title} backLabel={t.profile.back} />

      {isLoading && !data ? (
        <ChartSkeleton height="h-64" />
      ) : (
        <>
          <section className="tint tint-gold">
            <div className="flex items-start justify-between gap-4 px-4 pt-3.5 pb-3.5">
              <MetricTile
                label={t.recurring.fixedExpenses}
                value={fixedDisplay}
                size="lg"
                hint={t.recurring.activeCount(live.length)}
              />
              {(data?.fixedIncome ?? 0) > 0 && (
                <div className="text-right shrink-0">
                  <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                    {t.recurring.fixedIncome}
                  </p>
                  <p className="text-[17px] font-semibold text-green-fg tabular-nums mt-1">
                    {formatMXN(data?.fixedIncome ?? 0)}
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="panel px-4">
            {rules.length === 0 && (
              <EmptyState title={t.recurring.emptyTitle} description={t.recurring.emptyHint} />
            )}
            {live.map((r) => (
              <RuleRow key={r.id} rule={r} onClick={() => open(r)} />
            ))}
            {idle.map((r) => (
              <RuleRow key={r.id} rule={r} onClick={() => open(r)} />
            ))}
            <button
              type="button"
              onClick={() => open("new")}
              className="press w-full flex items-center gap-2.5 min-h-[48px] border-t border-divider first:border-t-0 text-left text-accent"
            >
              <PlusIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[13px]">{t.recurring.add}</span>
            </button>
          </div>
        </>
      )}

      <RecurringEditSheet
        key={`rule-${session}`}
        rule={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function RuleRow({ rule, onClick }: { rule: RecurringRuleView; onClick: () => void }) {
  const t = useT();
  const locale = useLocale();
  const lookup = useCategoryLookup();
  const frequencyLabel = useFrequencyLabel();
  const category =
    rule.type === "Transferencia"
      ? null
      : lookup(rule.category, rule.type === "Ingreso" ? "income" : "expense");
  const color =
    rule.type === "Transferencia" ? "var(--color-blue)" : category?.color ?? "var(--color-text-muted)";
  const status = !rule.active ? t.recurring.paused : rule.nextDate === null ? t.recurring.ended : null;
  // Already due: it's sitting on Inicio waiting for a Confirm, not "next".
  const overdue = rule.active && rule.nextDate !== null && rule.nextDate <= getToday();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press w-full flex items-center gap-3 py-3 border-t border-divider first:border-t-0 text-left",
        status && "opacity-60"
      )}
    >
      <CategoryIcon
        icon={rule.type === "Transferencia" ? "transfer" : category?.icon}
        name={ruleTitle(rule)}
        color={color}
        size="md"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[13.5px] text-text truncate">{ruleTitle(rule)}</span>
          {status && (
            <span className="shrink-0 rounded-full px-2 py-px border border-border font-mono text-[9.5px] uppercase tracking-wide text-text-dim">
              {status}
            </span>
          )}
        </span>
        <span className="block text-[11.5px] text-text-dim mt-0.5 truncate">
          {frequencyLabel(rule.frequency, rule.interval)} · {rule.account}
          {rule.active && rule.nextDate && !overdue && ` · ${t.recurring.next(shortDay(rule.nextDate, locale))}`}
          {overdue && rule.nextDate && (
            <span className="text-amber-fg"> · {t.recurring.pendingSince(shortDay(rule.nextDate, locale))}</span>
          )}
        </span>
      </span>
      <span className="text-right shrink-0">
        <span className={cn("block font-mono text-[13.5px] font-semibold", AMOUNT_TONES[rule.type])}>
          {rule.type === "Gasto" ? "−" : rule.type === "Ingreso" ? "+" : ""}
          {formatMXN(rule.amount)}
        </span>
        {rule.frequency !== "monthly" || rule.interval !== 1 ? (
          <span className="block font-mono text-[10px] text-text-faint mt-0.5">
            ≈ {formatMXN(rule.monthlyAmount)}/{t.recurring.monthShort}
          </span>
        ) : null}
      </span>
    </button>
  );
}

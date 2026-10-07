"use client";

import { useState } from "react";
import { ChartCard, ReadoutFigure } from "./ChartCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ColumnChart } from "@/components/ui/ColumnChart";
import { LineChart } from "@/components/ui/LineChart";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { formatMXN } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import type { TrendMonth, TrendsData } from "@/types";

/**
 * Income sits at a lighter step of its green so a pair of columns still reads
 * as two under red-green colour blindness, where the app's own green and red
 * land a few ΔE apart. Position (income always left) and the legend carry the
 * rest. Mixed into the surface rather than made transparent, so it's the same
 * colour whatever the column overlaps.
 */
const INCOME = "color-mix(in srgb, var(--color-green) 55%, var(--color-surface))";
const EXPENSE = "var(--color-red)";
const NET = "var(--color-text)";

function monthDate(key: string): Date {
  return new Date(`${key}-01T00:00:00Z`);
}

function useMonthLabels() {
  const locale = useLocale();
  const short = (key: string) =>
    new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(monthDate(key)).replace(".", "");
  const long = (key: string) =>
    new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(monthDate(key));
  return { short, long };
}

/** The last month that has anything in it — what a readout opens on. */
function lastActive(months: TrendMonth[]): string | null {
  for (let i = months.length - 1; i >= 0; i--) {
    if (months[i].income > 0 || months[i].expenses > 0) return months[i].key;
  }
  return months[months.length - 1]?.key ?? null;
}

/** Axis labels thin out past eight months, the way the other charts do. */
function axisLabel(index: number, count: number, text: string): string | null {
  const step = count <= 8 ? 1 : 2;
  return index % step === (count - 1) % step ? text : null;
}

export function IncomeExpenseChart({
  months, partialKey, toolbar, title,
}: { months: TrendMonth[]; partialKey?: string | null; toolbar?: React.ReactNode; title?: string }) {
  const t = useT();
  const a = t.analytics;
  const labels = useMonthLabels();
  const [picked, setPicked] = useState<string | null>(null);
  // A month picked under another period may not be in this one; then the
  // readout falls back rather than going blank.
  const selected = picked !== null && months.some((x) => x.key === picked) ? picked : lastActive(months);
  const m = months.find((x) => x.key === selected) ?? null;

  const income = months.reduce((s, x) => s + x.income, 0);
  const expenses = months.reduce((s, x) => s + x.expenses, 0);
  const net = (x: TrendMonth) => Math.round((x.income - x.expenses) * 100) / 100;
  const positive = months.filter((x) => net(x) > 0 && (x.income > 0 || x.expenses > 0)).length;
  const active = months.filter((x) => x.income > 0 || x.expenses > 0).length;

  return (
    <ChartCard
      title={title ?? a.incomeVsExpenses}
      toolbar={toolbar}
      legend={[
        { label: a.income, color: INCOME },
        { label: t.home.expenses, color: EXPENSE },
        { label: a.net, color: NET, shape: "line" },
      ]}
      summary={a.incomeVsExpensesSummary(formatMXN(income), formatMXN(expenses), positive, active)}
      readout={
        m && (
          <div>
            <p className="font-mono text-[10.5px] text-text-muted uppercase tracking-wide mb-2">{labels.long(m.key)}</p>
            <div className="grid grid-cols-3 gap-3">
              <ReadoutFigure label={a.income} value={formatMXN(m.income)} swatch={INCOME} />
              <ReadoutFigure label={t.home.expenses} value={formatMXN(m.expenses)} swatch={EXPENSE} />
              <ReadoutFigure
                label={a.net}
                value={formatMXN(net(m))}
                tone={net(m) < 0 ? "text-red-fg" : "text-green-fg"}
              />
            </div>
          </div>
        )
      }
    >
      <ColumnChart
        groups={months.map((x, i) => ({
          key: x.key,
          label: axisLabel(i, months.length, labels.short(x.key)),
          columns: [[{ value: x.income, color: INCOME }], [{ value: x.expenses, color: EXPENSE }]],
          // The month still running: its payday may not have landed yet.
          partial: x.key === partialKey,
        }))}
        line={{ values: months.map(net), color: NET }}
        selectedKey={selected}
        onSelect={setPicked}
        label={labels.long}
      />
    </ChartCard>
  );
}

export function NetWorthChart({
  months, toolbar, title,
}: { months: TrendMonth[]; toolbar?: React.ReactNode; title?: string }) {
  const t = useT();
  const a = t.analytics;
  const labels = useMonthLabels();
  const [picked, setPicked] = useState<string | null>(null);
  const selected =
    picked !== null && months.some((x) => x.key === picked) ? picked : months[months.length - 1]?.key ?? null;
  const m = months.find((x) => x.key === selected) ?? null;

  const first = months[0];
  const last = months[months.length - 1];
  const change = first && last ? Math.round((last.netWorth - first.netWorth) * 100) / 100 : 0;
  const pct = first && first.netWorth > 0 ? Math.round((change / first.netWorth) * 100) : null;

  return (
    <ChartCard
      title={title ?? a.netWorthTrend}
      toolbar={toolbar}
      summary={a.netWorthSummary(formatMXN(first?.netWorth ?? 0), formatMXN(last?.netWorth ?? 0), months.length)}
      readout={
        m && (
          <div>
            <p className="font-mono text-[10.5px] text-text-muted uppercase tracking-wide mb-2">{a.endOf(labels.long(m.key))}</p>
            <div className="grid grid-cols-3 gap-3">
              <ReadoutFigure label={a.available} value={formatMXN(m.available)} />
              <ReadoutFigure label={a.cardDebt} value={formatMXN(Math.round((m.available - m.netWorth) * 100) / 100)} />
              <ReadoutFigure label={a.netWorth} value={formatMXN(m.netWorth)} tone={m.netWorth < 0 ? "text-red-fg" : undefined} />
            </div>
          </div>
        )
      }
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[22px] font-semibold text-text tracking-[-0.02em]">{formatMXN(last?.netWorth ?? 0)}</span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-text-dim">
          {/* A change needs two months to be one. */}
          {months.length > 1 && (
            <>
              {pct !== null && <TrendBadge value={pct} polarity="up-good" />}
              {a.changeOver(formatMXN(change), months.length)}
            </>
          )}
        </span>
      </div>
      <LineChart
        points={months.map((x, i) => ({
          key: x.key,
          label: axisLabel(i, months.length, labels.short(x.key)),
          value: x.netWorth,
        }))}
        color="var(--color-accent)"
        height={130}
        selectedKey={selected}
        onSelect={setPicked}
        format={formatMXN}
      />
    </ChartCard>
  );
}

/**
 * The long view, one card: income against spending, or net worth, month by
 * month, switched in place rather than stacked as two more cards.
 */
export function TrendsPanel({ data, partialKey }: { data: TrendsData; partialKey?: string | null }) {
  const t = useT();
  const [view, setView] = useState<"flow" | "worth">("flow");
  const empty = data.months.every((m) => m.income === 0 && m.expenses === 0);
  if (empty) {
    return (
      <div className="panel">
        <EmptyState title={t.analytics.noTrendsTitle} description={t.analytics.noTrendsHint} />
      </div>
    );
  }

  const title = `${t.charts.trends} · ${t.analytics.lastMonths(data.months.length)}`;
  const toolbar = (
    <SegmentedControl
      options={[
        { value: "flow", label: t.charts.trendsIncome },
        { value: "worth", label: t.charts.trendsNetWorth },
      ]}
      value={view}
      onChange={setView}
      label={t.charts.trends}
      size="sm"
      className="mt-1 mb-2"
    />
  );

  return view === "flow" ? (
    <IncomeExpenseChart months={data.months} partialKey={partialKey} toolbar={toolbar} title={title} />
  ) : (
    <NetWorthChart months={data.months} toolbar={toolbar} title={title} />
  );
}

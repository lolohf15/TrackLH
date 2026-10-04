"use client";

import { useState } from "react";
import { ChartCard, ReadoutFigure } from "./ChartCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ColumnChart } from "@/components/ui/ColumnChart";
import { LineChart } from "@/components/ui/LineChart";
import { StackedBarChart } from "@/components/ui/StackedBarChart";
import { Sparkline } from "@/components/ui/Sparkline";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { cn, formatMXN } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import type { CardTrend, TrendMonth, TrendsData } from "@/types";

/**
 * Income sits at a lighter step of its green so a pair of columns still reads
 * as two under red-green colour blindness, where the app's own green and red
 * land a few ΔE apart. Position (income always left) and the legend carry the
 * rest. Mixed into the surface rather than made transparent, so it's the same
 * colour whatever the column overlaps.
 */
const INCOME = "color-mix(in srgb, var(--color-green) 55%, var(--color-surface))";
const EXPENSE = "var(--color-red)";
const FIXED = "var(--color-red)";
const VARIABLE = "color-mix(in srgb, var(--color-red) 50%, var(--color-surface))";
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

export function IncomeExpenseChart({ months }: { months: TrendMonth[] }) {
  const t = useT();
  const a = t.analytics;
  const labels = useMonthLabels();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? lastActive(months);
  const m = months.find((x) => x.key === selected) ?? null;

  const income = months.reduce((s, x) => s + x.income, 0);
  const expenses = months.reduce((s, x) => s + x.expenses, 0);
  const net = (x: TrendMonth) => Math.round((x.income - x.expenses) * 100) / 100;
  const positive = months.filter((x) => net(x) > 0 && (x.income > 0 || x.expenses > 0)).length;
  const active = months.filter((x) => x.income > 0 || x.expenses > 0).length;

  return (
    <ChartCard
      title={a.incomeVsExpenses}
      legend={[
        { label: a.income, color: INCOME },
        { label: t.home.expenses, color: EXPENSE },
        { label: a.net, color: NET, shape: "line" },
      ]}
      summary={a.incomeVsExpensesSummary(formatMXN(income), formatMXN(expenses), positive, active)}
      table={{
        headers: [a.month, a.income, t.home.expenses, a.net],
        rows: months.map((x) => ({
          key: x.key,
          cells: [labels.long(x.key), formatMXN(x.income), formatMXN(x.expenses), formatMXN(net(x))],
        })),
      }}
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
        }))}
        line={{ values: months.map(net), color: NET }}
        selectedKey={selected}
        onSelect={setPicked}
        label={labels.long}
      />
    </ChartCard>
  );
}

export function FixedVariableChart({ months, commitment }: { months: TrendMonth[]; commitment: number }) {
  const t = useT();
  const a = t.analytics;
  const labels = useMonthLabels();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? lastActive(months);
  const m = months.find((x) => x.key === selected) ?? null;
  const variable = (x: TrendMonth) => Math.max(0, Math.round((x.expenses - x.fixed) * 100) / 100);
  const share = (x: TrendMonth) => (x.expenses > 0 ? Math.round((x.fixed / x.expenses) * 100) : 0);

  const anyFixed = months.some((x) => x.fixed > 0);

  return (
    <ChartCard
      title={a.fixedVsVariable}
      hint={anyFixed ? a.fixedHint : a.fixedEmptyHint}
      legend={[
        { label: a.fixed, color: FIXED },
        { label: a.variable, color: VARIABLE },
        ...(commitment > 0 ? [{ label: a.fixedNow, color: "var(--color-border-strong)", shape: "dashed" as const }] : []),
      ]}
      summary={a.fixedVsVariableSummary(
        formatMXN(months.reduce((s, x) => s + x.fixed, 0)),
        formatMXN(months.reduce((s, x) => s + variable(x), 0)),
        formatMXN(commitment)
      )}
      table={{
        headers: [a.month, a.fixed, a.variable, a.fixedShare],
        rows: months.map((x) => ({
          key: x.key,
          cells: [labels.long(x.key), formatMXN(x.fixed), formatMXN(variable(x)), `${share(x)}%`],
        })),
      }}
      readout={
        m && (
          <div>
            <p className="font-mono text-[10.5px] text-text-muted uppercase tracking-wide mb-2">{labels.long(m.key)}</p>
            <div className="grid grid-cols-3 gap-3">
              <ReadoutFigure label={a.fixed} value={formatMXN(m.fixed)} swatch={FIXED} />
              <ReadoutFigure label={a.variable} value={formatMXN(variable(m))} swatch={VARIABLE} />
              <ReadoutFigure label={a.fixedShare} value={`${share(m)}%`} />
            </div>
          </div>
        )
      }
    >
      <ColumnChart
        groups={months.map((x, i) => ({
          key: x.key,
          label: axisLabel(i, months.length, labels.short(x.key)),
          // Fixed on the baseline: it's the floor the month is built on.
          columns: [[{ value: x.fixed, color: FIXED }, { value: variable(x), color: VARIABLE }]],
        }))}
        reference={commitment > 0 ? { value: commitment, label: a.fixedNow } : null}
        selectedKey={selected}
        onSelect={setPicked}
        label={labels.long}
      />
    </ChartCard>
  );
}

export function NetWorthChart({ months }: { months: TrendMonth[] }) {
  const t = useT();
  const a = t.analytics;
  const labels = useMonthLabels();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? months[months.length - 1]?.key ?? null;
  const m = months.find((x) => x.key === selected) ?? null;

  const first = months[0];
  const last = months[months.length - 1];
  const change = first && last ? Math.round((last.netWorth - first.netWorth) * 100) / 100 : 0;
  const pct = first && first.netWorth > 0 ? Math.round((change / first.netWorth) * 100) : null;

  return (
    <ChartCard
      title={a.netWorthTrend}
      summary={a.netWorthSummary(formatMXN(first?.netWorth ?? 0), formatMXN(last?.netWorth ?? 0), months.length)}
      table={{
        headers: [a.month, a.available, a.cardDebt, a.netWorth],
        rows: months.map((x) => ({
          key: x.key,
          cells: [
            labels.long(x.key),
            formatMXN(x.available),
            formatMXN(Math.round((x.available - x.netWorth) * 100) / 100),
            formatMXN(x.netWorth),
          ],
        })),
      }}
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

/** The same bands the Wallet reads a card's line by. */
function usageTone(pct: number): { color: string; text: string } {
  if (pct >= 70) return { color: "var(--color-red)", text: "text-red-fg" };
  if (pct >= 30) return { color: "var(--color-amber)", text: "text-amber-fg" };
  return { color: "var(--color-green)", text: "text-green-fg" };
}

export function CardUsageChart({ cards }: { cards: CardTrend[] }) {
  const t = useT();
  const a = t.analytics;
  const labels = useMonthLabels();
  if (cards.length === 0) return null;

  return (
    <ChartCard
      title={a.cardUsage}
      hint={a.cardUsageHint}
      legend={[{ label: a.limitLine, color: "var(--color-border-strong)", shape: "dashed" }]}
      summary={cards
        .map((c) => a.cardUsageSummary(c.account, Math.round(c.points[c.points.length - 1]?.utilization ?? 0)))
        .join(" ")}
      table={{
        headers: [a.month, ...cards.map((c) => c.account)],
        rows: (cards[0]?.points ?? []).map((p, i) => ({
          key: p.key,
          cells: [labels.long(p.key), ...cards.map((c) => `${Math.round(c.points[i]?.utilization ?? 0)}%`)],
        })),
      }}
    >
      <ul className="divide-y divide-divider">
        {cards.map((card) => {
          const now = card.points[card.points.length - 1];
          const pct = Math.round(now?.utilization ?? 0);
          const tone = usageTone(pct);
          return (
            <li key={card.account} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13.5px] text-text">
                  <span aria-hidden="true" className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: card.color }} />
                  <span className="truncate">{card.account}</span>
                </p>
                <p className="text-[11.5px] text-text-dim mt-0.5 truncate tabular-nums">
                  <span className={cn("font-semibold", tone.text)}>{pct}%</span>
                  {" · "}
                  {a.ofLimit(formatMXN(now?.debt ?? 0), formatMXN(card.limit))}
                </p>
              </div>
              <Sparkline
                className="w-[112px] shrink-0"
                values={card.points.map((p) => p.utilization)}
                color={tone.color}
                reference={100}
                floorMax={100}
                height={40}
                label={card.points.map((p) => `${labels.short(p.key)} ${Math.round(p.utilization)}%`).join(", ")}
              />
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

export function WeekdayChart({ weekdays, counts }: { weekdays: number[]; counts: number[] }) {
  const t = useT();
  const a = t.analytics;
  const locale = useLocale();
  // 5 Jan 2026 was a Monday, so day i of that week names weekday i.
  const name = (i: number, style: "short" | "long") =>
    new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" })
      .format(new Date(Date.UTC(2026, 0, 5 + i)))
      .replace(".", "");

  const averages = weekdays.map((total, i) => (counts[i] > 0 ? Math.round(total / counts[i]) : 0));
  const top = averages.reduce((best, v, i) => (v > averages[best] ? i : best), 0);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? top;
  const days = counts.reduce((s, c) => s + c, 0);
  const overall = days > 0 ? Math.round(weekdays.reduce((s, v) => s + v, 0) / days) : 0;

  if (weekdays.every((v) => v === 0)) return null;

  return (
    <ChartCard
      title={a.byWeekday}
      hint={a.byWeekdayHint}
      summary={a.byWeekdaySummary(name(top, "long"), formatMXN(averages[top]), formatMXN(overall))}
      table={{
        headers: [a.weekday, a.avgPerDay, a.periodTotal],
        rows: weekdays.map((total, i) => ({
          key: String(i),
          cells: [name(i, "long"), formatMXN(averages[i]), formatMXN(total)],
        })),
      }}
      readout={
        <div className="grid grid-cols-3 gap-3">
          <ReadoutFigure label={name(selected, "long")} value={formatMXN(averages[selected])} />
          <ReadoutFigure label={a.periodTotal} value={formatMXN(weekdays[selected])} />
          <ReadoutFigure label={a.dailyAverage} value={formatMXN(overall)} />
        </div>
      }
    >
      <StackedBarChart
        bars={averages.map((v, i) => ({
          key: String(i),
          label: name(i, "short"),
          total: v,
          segments: [{ value: v, color: "var(--color-red)" }],
        }))}
        reference={{ value: overall, label: a.average }}
        highlightKey={String(selected)}
        onSelect={(key) => setPicked(Number(key))}
        height={110}
        // Room for the cap that floats over the lit bar when it's the tallest.
        className="pt-3"
      />
    </ChartCard>
  );
}

/** Everything under the breakdown on Analytics, in the order it's read. */
export function TrendCharts({ data }: { data: TrendsData }) {
  const t = useT();
  const empty =
    data.months.every((m) => m.income === 0 && m.expenses === 0) && data.weekdays.every((v) => v === 0);
  if (empty) {
    return (
      <div className="panel mt-3 md:col-span-2">
        <EmptyState title={t.analytics.noTrendsTitle} description={t.analytics.noTrendsHint} />
      </div>
    );
  }

  return (
    <>
      <IncomeExpenseChart months={data.months} />
      <FixedVariableChart months={data.months} commitment={data.fixedCommitment} />
      <NetWorthChart months={data.months} />
      <CardUsageChart cards={data.cards} />
      <WeekdayChart weekdays={data.weekdays} counts={data.weekdayCounts} />
    </>
  );
}

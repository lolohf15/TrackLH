/**
 * Sentences about a period, picked from its figures. Each comes back as data
 * (a kind and its numbers), not text: the screen writes it in the reader's
 * language from the dictionary, and the same figures read in either one.
 */
import type { CategorySummary } from "@/types";
import { round2 } from "./finance";

export type Insight =
  /** A category well above or below what it usually is by this point. */
  | { kind: "categoryVsUsual"; category: string; color: string; pct: number; diff: number }
  /** Share of the period's income that wasn't spent. */
  | { kind: "saved"; pct: number; amount: number }
  /** Spending went past income. */
  | { kind: "overspent"; amount: number }
  /** Days so far this period without a single expense. */
  | { kind: "quietDays"; days: number }
  /** One category carrying most of the spending. */
  | { kind: "topCategory"; category: string; color: string; pct: number };

export interface InsightInput {
  /** This period, up to today when it's still running. */
  categories: CategorySummary[];
  /** Each category's mean over the comparable earlier periods (same point). */
  usual: Map<string, number>;
  /** How many earlier periods `usual` was averaged over; 0 means no history. */
  usualPeriods: number;
  income: number;
  expenses: number;
  inProgress: boolean;
  /** Per-day spending so far, for day-sliced periods; empty otherwise. */
  dailyExpenses: number[];
}

/** Below this a swing is noise, whatever the percentage says. */
const MIN_DIFF = 250;
const MIN_PCT = 20;

/** Most telling first; at most `limit`. */
export function buildInsights(input: InsightInput, limit = 3): Insight[] {
  const { categories, usual, usualPeriods, income, expenses, inProgress, dailyExpenses } = input;
  const out: Insight[] = [];

  if (usualPeriods > 0) {
    const swings = categories
      .map((c) => {
        const base = usual.get(c.category) ?? 0;
        const diff = round2(c.amount - base);
        return { c, base, diff, pct: base > 0 ? Math.round((diff / base) * 100) : null };
      })
      // A category with no history isn't "up 100%"; it's just new.
      .filter((s) => s.pct !== null && Math.abs(s.pct) >= MIN_PCT && Math.abs(s.diff) >= Math.max(MIN_DIFF, expenses * 0.05))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    // The biggest rise, then the biggest drop: one of each reads as a
    // balanced picture rather than a list of alarms.
    const up = swings.find((s) => s.diff > 0);
    const down = swings.find((s) => s.diff < 0);
    for (const s of [up, down]) {
      if (s) out.push({ kind: "categoryVsUsual", category: s.c.category, color: s.c.color, pct: s.pct!, diff: s.diff });
    }
  }

  // Before payday, "you spent everything" is the calendar talking.
  if (income > 0) {
    if (expenses > income) out.push({ kind: "overspent", amount: round2(expenses - income) });
    else if (!inProgress || expenses > 0) {
      out.push({ kind: "saved", pct: Math.round(((income - expenses) / income) * 100), amount: round2(income - expenses) });
    }
  }

  if (inProgress && dailyExpenses.length >= 5) {
    const quiet = dailyExpenses.filter((v) => v === 0).length;
    if (quiet >= 3) out.push({ kind: "quietDays", days: quiet });
  }

  const top = categories[0];
  if (top && top.percentage >= 35 && !out.some((i) => i.kind === "categoryVsUsual" && i.category === top.category)) {
    out.push({ kind: "topCategory", category: top.category, color: top.color, pct: Math.round(top.percentage) });
  }

  return out.slice(0, limit);
}

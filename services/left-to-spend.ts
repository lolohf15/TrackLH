/**
 * "Te quedan $X · $Y por día": what this month can still take. With budgets
 * set, that's the plan: what's budgeted less what those categories have
 * spent and the fixed charges still due in them. Without any, it falls back
 * to what the month is expected to bring in, less everything spent and every
 * fixed charge to come. Pure arithmetic; `lib/left-to-spend.ts` gathers the
 * inputs.
 */
import { round2 } from "./finance";
import type { DateRange } from "./period";

export interface LeftToSpendInput {
  today: Date;
  month: DateRange;
  incomeSoFar: number;
  spentSoFar: number;
  /** Recurring income still due this month and not logged yet. */
  pendingIncome: number;
  /** Recurring expenses still due this month and not logged yet. */
  pendingFixed: number;
  /** Any active income rule: then the rules, not history, say what comes in. */
  hasIncomeRules: boolean;
  /** Mean income of the last complete months with any; 0 when there are none. */
  averageIncome: number;
  /** Monthly budgets above zero. Any at all switches to the budget. */
  budgets: Array<{ category: string; amount: number }>;
  /** This month's spending so far, by category (uncategorized under its display name). */
  spentByCategory: Map<string, number>;
  /** Recurring expenses still due this month and not logged yet, by category. */
  pendingByCategory: Map<string, number>;
}

export interface LeftToSpend {
  /** What the month is expected to bring in. */
  expected: number;
  spent: number;
  /** Fixed charges still to come this month. */
  committed: number;
  /** Expected less spent less committed. Negative when the month is over. */
  left: number;
  /** `left` spread over the days still to go, today included; never negative. */
  perDay: number;
  daysLeft: number;
  /** Spent and committed, as a share of expected, capped at 100. */
  usedPercent: number;
  /** Where `expected` came from, so the card can say so. */
  source: "budget" | "rules" | "average" | "received";
  /** Budget only: spent this month in categories with no budget, kept out of `left`. */
  outsideBudget: number;
}

const DAY = 86_400_000;

export function leftToSpend(input: LeftToSpendInput): LeftToSpend | null {
  const { incomeSoFar, spentSoFar, pendingIncome, pendingFixed, hasIncomeRules, averageIncome } = input;

  const budgets = input.budgets.filter((b) => b.amount > 0);
  if (budgets.length > 0) {
    // Only the budgeted categories count against the budget: rent or a
    // one-off with no budget would otherwise eat a number it was never in.
    const budgeted = new Set(budgets.map((b) => b.category));
    const total = budgets.reduce((s, b) => s + b.amount, 0);
    let spent = 0;
    let outside = 0;
    for (const [category, amount] of input.spentByCategory) {
      if (budgeted.has(category)) spent += amount;
      else outside += amount;
    }
    let committed = 0;
    for (const [category, amount] of input.pendingByCategory) {
      if (budgeted.has(category)) committed += amount;
    }
    return finish(input, total, spent, committed, "budget", outside);
  }

  let expected: number;
  let source: LeftToSpend["source"];
  if (hasIncomeRules) {
    expected = incomeSoFar + pendingIncome;
    source = "rules";
  } else if (averageIncome > incomeSoFar) {
    expected = averageIncome;
    source = "average";
  } else {
    expected = incomeSoFar;
    source = "received";
  }
  // Nothing coming in and nothing known about it: there's no "left" to tell.
  if (expected <= 0) return null;
  return finish(input, expected, spentSoFar, pendingFixed, source, 0);
}

function finish(
  { today, month }: LeftToSpendInput,
  expected: number,
  spentSoFar: number,
  pendingFixed: number,
  source: LeftToSpend["source"],
  outsideBudget: number
): LeftToSpend {
  const left = round2(expected - spentSoFar - pendingFixed);
  const start = Math.max(today.getTime(), month.from.getTime());
  const daysLeft = Math.max(1, Math.round((month.to.getTime() - start) / DAY));
  const used = ((spentSoFar + pendingFixed) / expected) * 100;

  return {
    expected: round2(expected),
    spent: round2(spentSoFar),
    committed: round2(pendingFixed),
    left,
    perDay: round2(Math.max(0, left) / daysLeft),
    daysLeft,
    usedPercent: Math.min(100, Math.max(0, Math.round(used))),
    source,
    outsideBudget: round2(outsideBudget),
  };
}

export interface OccurrenceLike {
  type: string;
  category: string | null;
  account: string;
  amount: number;
}

export interface MovementLike extends OccurrenceLike {
  /** Set when the movement was confirmed from a rule; those are matched exactly elsewhere. */
  recurringRuleId: string | null;
}

/** How far a hand-typed amount may drift from the rule and still be it. */
const TOLERANCE = 0.05;

/**
 * The occurrences that still look unpaid. One logged by hand instead of
 * through Confirm (same type, account and category, an amount within 5%)
 * counts as paid, so Netflix typed in by hand isn't subtracted twice. Each
 * movement can stand in for one occurrence only.
 */
export function unmatchedOccurrences<T extends OccurrenceLike>(occurrences: T[], movements: MovementLike[]): T[] {
  const used = new Set<number>();
  return occurrences.filter((o) => {
    const i = movements.findIndex(
      (m, idx) =>
        !used.has(idx) &&
        m.recurringRuleId === null &&
        m.type === o.type &&
        m.account === o.account &&
        (m.category ?? null) === (o.category ?? null) &&
        Math.abs(m.amount - o.amount) <= o.amount * TOLERANCE
    );
    if (i === -1) return true;
    used.add(i);
    return false;
  });
}

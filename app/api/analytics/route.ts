import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { readToday } from "@/lib/request-today";
import { mapTransaction } from "@/lib/transaction-map";
import { mapBudget } from "@/lib/money";
import {
  computeBucketBreakdowns,
  computeCategoryExpenses,
  computeExpenses,
  computeIncome,
  filterByRange,
  round2,
} from "@/services/finance";
import { buildInsights } from "@/services/insights";
import { moneyFlow } from "@/services/money-flow";
import {
  bucketsFor, comparablePrevious, dayKey, isInProgress, isPeriodKind, parseAnchor, resolvePeriod, stepAnchor,
  type DateRange,
} from "@/services/period";
import type { AnalyticsData, BudgetPace } from "@/types";

const DAY = 86_400_000;

/**
 * Everything the Analytics tab draws for one period, in one response: the
 * bars, the categories, the money flow, budgets against the month's pace and
 * the sentences about it. Inicio reads the month's pace and its first
 * insight from here too.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const kindParam = searchParams.get("period") ?? "month";
    const kind = isPeriodKind(kindParam) ? kindParam : "month";
    const anchor = parseAnchor(searchParams.get("anchor"));
    const today = readToday(req);
    const period = resolvePeriod(kind, anchor);
    const inProgress = isInProgress(period, today);

    // All-time starts at the user's first movement, not at 1970.
    const earliest =
      kind === "all"
        ? await prisma.transaction.findFirst({ where: { userId }, orderBy: { date: "asc" }, select: { date: true } })
        : null;

    const buckets = bucketsFor(period, earliest?.date);
    const previousBuckets = period.previous ? bucketsFor({ ...period, range: period.previous, previous: null }) : [];

    // The same point of the periods before, for "more than usual". A year
    // looks back one; shorter spans three, which smooths out one odd month.
    const lookback = kind === "all" ? 0 : kind === "year" ? 1 : 3;
    const usualRanges: DateRange[] = Array.from({ length: lookback }, (_, i) => {
      let at = anchor;
      for (let k = 0; k <= i; k++) at = stepAnchor(kind, at, -1);
      const back = resolvePeriod(kind, at);
      return comparablePrevious({ ...period, previous: back.range }, today) ?? back.range;
    });
    const samePoint = comparablePrevious(period, today);

    const from = new Date(
      Math.min(
        buckets[0]?.range.from.getTime() ?? period.range.from.getTime(),
        period.previous?.from.getTime() ?? Infinity,
        ...usualRanges.map((r) => r.from.getTime())
      )
    );

    const [rows, categoryRows, budgetRows] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: from, lt: period.range.to } },
        orderBy: { date: "desc" },
      }),
      prisma.category.findMany({ where: { userId } }),
      prisma.budgetConfig.findMany({ where: { userId, ...(kind === "month" ? {} : { id: -1 }) } }),
    ]);

    const transactions = rows.map(mapTransaction);
    const colors = new Map(categoryRows.map((c) => [c.name, c.color]));

    const expenses = computeExpenses(transactions, period.range);
    const income = computeIncome(transactions, period.range);
    const categories = computeCategoryExpenses(transactions, period.range, colors);
    const breakdowns = computeBucketBreakdowns(transactions, buckets, period.bucket, colors);

    // Each category's mean across the earlier periods that saw any spending.
    const usual = new Map<string, number>();
    let usualPeriods = 0;
    for (const range of usualRanges) {
      const summary = computeCategoryExpenses(transactions, range, colors);
      if (summary.length === 0) continue;
      usualPeriods++;
      for (const c of summary) usual.set(c.category, (usual.get(c.category) ?? 0) + c.amount);
    }
    for (const [k, v] of usual) usual.set(k, round2(v / usualPeriods));

    const todayKey = dayKey(today);
    const elapsed =
      period.bucket === "day"
        ? breakdowns.filter((b) => b.key <= todayKey).map((b) => b.expenses)
        : [];

    // How far into the month today is, for the budget bars' "where you
    // should be" mark. A finished month is all the way.
    const monthDays = Math.round((period.range.to.getTime() - period.range.from.getTime()) / DAY);
    const elapsedDays = inProgress
      ? Math.round((today.getTime() - period.range.from.getTime()) / DAY) + 1
      : monthDays;
    const spentBy = new Map(categories.map((c) => [c.category, c.amount]));
    const budgets: BudgetPace[] = budgetRows
      .map(mapBudget)
      .filter((b) => b.amount > 0)
      .map((b) => ({
        category: b.category,
        color: colors.get(b.category) ?? "#6b7075",
        budget: b.amount,
        spent: spentBy.get(b.category) ?? 0,
      }))
      .sort((a, b) => b.spent / b.budget - a.spent / a.budget);

    const data: AnalyticsData = {
      period: kind,
      from: period.range.from.toISOString(),
      to: period.range.to.toISOString(),
      granularity: period.bucket,
      buckets: breakdowns,
      previousExpenses: computeBucketBreakdowns(transactions, previousBuckets, period.bucket, colors).map((b) => b.expenses),
      categories,
      expenses,
      income,
      net: round2(income - expenses),
      prevExpenses: samePoint ? computeExpenses(transactions, samePoint) : 0,
      prevIncome: samePoint ? computeIncome(transactions, samePoint) : 0,
      inProgress,
      expenseCount: filterByRange(transactions, period.range).filter((t) => t.type === "Gasto").length,
      insights: buildInsights({ categories, usual, usualPeriods, income, expenses, inProgress, dailyExpenses: elapsed }),
      flow: moneyFlow(
        filterByRange(transactions, period.range),
        categories,
        new Map(categoryRows.filter((c) => c.kind === "income").map((c) => [c.name, c.color]))
      ),
      budgets,
      monthProgress: kind === "month" ? Math.min(100, Math.round((elapsedDays / monthDays) * 100)) : null,
    };

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/analytics");
  }
}

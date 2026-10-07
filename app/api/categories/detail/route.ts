import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { readToday } from "@/lib/request-today";
import { toNumber } from "@/lib/money";
import { round2, UNCATEGORIZED } from "@/services/finance";
import { comparablePrevious, isInProgress, isPeriodKind, monthKey, parseAnchor, resolvePeriod } from "@/services/period";
import type { CategoryDetailData } from "@/types";

const DAY = 86_400_000;

/**
 * One category over a period: what it came to, against the same point of the
 * period before, its budget against the month's pace, its last six months,
 * and the descriptions it repeats most.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get("category") ?? "").slice(0, 100);
    const kindParam = searchParams.get("period") ?? "month";
    const kind = isPeriodKind(kindParam) && kindParam !== "all" ? kindParam : "month";
    const today = readToday(req);
    const period = resolvePeriod(kind, parseAnchor(searchParams.get("anchor") ?? today.toISOString()));
    const samePoint = comparablePrevious(period, today);
    const inProgress = isInProgress(period, today);

    // Six calendar months ending with the one the period ends in.
    const lastMonth = new Date(period.range.to.getTime() - DAY);
    const sixFrom = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() - 5, 1));
    const from = new Date(Math.min(sixFrom.getTime(), samePoint?.from.getTime() ?? Infinity, period.range.from.getTime()));

    // "Sin categoría" is what an uncategorized expense is shown as.
    const categoryWhere = name === UNCATEGORIZED ? { category: null } : { category: name };
    const [rows, category, budget] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, type: "Gasto", ...categoryWhere, date: { gte: from, lt: period.range.to } },
        select: { date: true, amount: true, description: true },
      }),
      prisma.category.findFirst({ where: { userId, name, kind: "expense" }, select: { color: true } }),
      prisma.budgetConfig.findFirst({ where: { userId, category: name }, select: { amount: true } }),
    ]);

    const within = (d: Date, r: { from: Date; to: Date }) => d >= r.from && d < r.to;
    const sumIn = (r: { from: Date; to: Date }) => round2(rows.filter((x) => within(x.date, r)).reduce((s, x) => s + toNumber(x.amount), 0));

    const months = Array.from({ length: 6 }, (_, i) => {
      const f = new Date(Date.UTC(sixFrom.getUTCFullYear(), sixFrom.getUTCMonth() + i, 1));
      const t = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 1));
      return { month: monthKey(f), amount: sumIn({ from: f, to: t }) };
    });

    // Grouped case- and space-insensitively, shown as first written.
    const groups = new Map<string, { description: string; count: number; amount: number }>();
    for (const r of rows.filter((x) => within(x.date, period.range))) {
      const text = (r.description ?? "").trim();
      if (!text) continue;
      const key = text.toLocaleLowerCase("es").replace(/\s+/g, " ");
      const g = groups.get(key) ?? { description: text, count: 0, amount: 0 };
      g.count += 1;
      g.amount = round2(g.amount + toNumber(r.amount));
      groups.set(key, g);
    }
    const top = Array.from(groups.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const monthDays = Math.round((period.range.to.getTime() - period.range.from.getTime()) / DAY);
    const elapsed = inProgress ? Math.round((today.getTime() - period.range.from.getTime()) / DAY) + 1 : monthDays;

    const data: CategoryDetailData = {
      category: name,
      color: category?.color ?? "#6b7075",
      period: kind,
      from: period.range.from.toISOString(),
      to: period.range.to.toISOString(),
      inProgress,
      total: sumIn(period.range),
      previous: samePoint ? sumIn(samePoint) : 0,
      budget: kind === "month" && budget ? toNumber(budget.amount) : null,
      monthProgress: kind === "month" ? Math.min(100, Math.round((elapsed / monthDays) * 100)) : null,
      months,
      top,
    };
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/categories/detail");
  }
}

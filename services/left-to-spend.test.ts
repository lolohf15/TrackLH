import { describe, expect, it } from "vitest";
import { leftToSpend, unmatchedOccurrences } from "./left-to-spend";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const october = { from: d("2026-10-01"), to: d("2026-11-01") };
const base = {
  today: d("2026-10-07"),
  month: october,
  incomeSoFar: 0,
  spentSoFar: 9000,
  pendingIncome: 0,
  pendingFixed: 0,
  hasIncomeRules: false,
  averageIncome: 0,
  budgets: [] as Array<{ category: string; amount: number }>,
  spentByCategory: new Map<string, number>(),
  pendingByCategory: new Map<string, number>(),
};

describe("leftToSpend", () => {
  it("uses the income rules when there are any", () => {
    const r = leftToSpend({ ...base, hasIncomeRules: true, pendingIncome: 29000, pendingFixed: 350 })!;
    expect(r.source).toBe("rules");
    expect(r.left).toBe(19650);
    expect(r.daysLeft).toBe(25); // the 7th through the 31st
    expect(r.perDay).toBe(786);
    expect(r.usedPercent).toBe(32);
  });

  it("falls back to the average of past months", () => {
    const r = leftToSpend({ ...base, averageIncome: 30000 })!;
    expect(r.source).toBe("average");
    expect(r.expected).toBe(30000);
  });

  it("takes what already came in when that beats the average", () => {
    const r = leftToSpend({ ...base, incomeSoFar: 40000, averageIncome: 30000 })!;
    expect(r.source).toBe("received");
    expect(r.expected).toBe(40000);
  });

  it("never spreads a negative amount over the days", () => {
    const r = leftToSpend({ ...base, averageIncome: 5000 })!;
    expect(r.left).toBe(-4000);
    expect(r.perDay).toBe(0);
    expect(r.usedPercent).toBe(100);
  });

  it("has nothing to say with no income at all", () => {
    expect(leftToSpend(base)).toBeNull();
  });
});

describe("leftToSpend with budgets", () => {
  const withBudgets = {
    ...base,
    hasIncomeRules: true,
    pendingIncome: 29000,
    budgets: [{ category: "Alimentos", amount: 4000 }, { category: "Salidas", amount: 2000 }, { category: "Renta", amount: 0 }],
    spentByCategory: new Map([["Alimentos", 1500], ["Salidas", 500], ["Renta", 6500], ["Gustos", 300]]),
    pendingByCategory: new Map([["Salidas", 200], ["Suscripciones", 219]]),
  };

  it("takes the budget over income, counting only budgeted categories", () => {
    const r = leftToSpend(withBudgets)!;
    expect(r.source).toBe("budget");
    expect(r.expected).toBe(6000);
    expect(r.spent).toBe(2000);
    expect(r.committed).toBe(200);
    expect(r.left).toBe(3800);
    expect(r.perDay).toBe(152);
  });

  it("keeps what was spent outside the budget visible but out of the figure", () => {
    expect(leftToSpend(withBudgets)!.outsideBudget).toBe(6800);
  });

  it("falls back to income when every budget is zero", () => {
    const r = leftToSpend({ ...withBudgets, budgets: [{ category: "Renta", amount: 0 }] })!;
    expect(r.source).toBe("rules");
    expect(r.outsideBudget).toBe(0);
  });
});

describe("unmatchedOccurrences", () => {
  const netflix = { type: "Gasto", category: "Suscripciones", account: "Nu", amount: 219 };
  it("counts a hand-typed charge as paid, once", () => {
    const typed = { ...netflix, amount: 225, recurringRuleId: null };
    expect(unmatchedOccurrences([netflix], [typed])).toEqual([]);
    expect(unmatchedOccurrences([netflix, netflix], [typed])).toHaveLength(1);
  });
  it("ignores other accounts, other amounts and confirmed movements", () => {
    expect(unmatchedOccurrences([netflix], [{ ...netflix, account: "BBVA", recurringRuleId: null }])).toHaveLength(1);
    expect(unmatchedOccurrences([netflix], [{ ...netflix, amount: 300, recurringRuleId: null }])).toHaveLength(1);
    expect(unmatchedOccurrences([netflix], [{ ...netflix, recurringRuleId: "r1" }])).toHaveLength(1);
  });
});

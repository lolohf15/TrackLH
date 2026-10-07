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

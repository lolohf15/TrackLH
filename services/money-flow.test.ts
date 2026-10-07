import { describe, expect, it } from "vitest";
import { moneyFlow } from "./money-flow";

const cat = (category: string, amount: number) => ({ category, amount, count: 1, percentage: 0, color: "#000" });

describe("moneyFlow", () => {
  it("balances income against categories plus savings", () => {
    const f = moneyFlow(10000, [cat("A", 4000), cat("B", 3000)])!;
    expect(f.total).toBe(10000);
    expect(f.targets.map((t) => [t.key, t.amount])).toEqual([["cat:A", 4000], ["cat:B", 3000], ["saved", 3000]]);
  });

  it("folds the tail into Otros and covers overspending from the balance", () => {
    const f = moneyFlow(5000, [cat("A", 3000), cat("B", 2000), cat("C", 1000)], 2)!;
    expect(f.targets.at(-1)).toMatchObject({ key: "other", amount: 1000 });
    expect(f.sources).toEqual([
      { key: "income", label: "", color: null, amount: 5000 },
      { key: "deficit", label: "", color: null, amount: 1000 },
    ]);
    const left = f.sources.reduce((s, n) => s + n.amount, 0);
    const right = f.targets.reduce((s, n) => s + n.amount, 0);
    expect(left).toBe(right);
  });

  it("has no flow without income", () => {
    expect(moneyFlow(0, [cat("A", 10)])).toBeNull();
  });
});

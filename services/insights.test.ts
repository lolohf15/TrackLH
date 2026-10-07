import { describe, expect, it } from "vitest";
import { buildInsights } from "./insights";

const cat = (category: string, amount: number, percentage = 0) => ({ category, amount, count: 1, percentage, color: "#000" });
const base = {
  categories: [cat("Salidas", 3000, 30), cat("Alimentos", 2000, 20)],
  usual: new Map([["Salidas", 1500], ["Alimentos", 3000]]),
  usualPeriods: 3,
  income: 0,
  expenses: 5000,
  inProgress: true,
  dailyExpenses: [],
};

describe("buildInsights", () => {
  it("leads with the biggest rise and the biggest drop", () => {
    const [a, b] = buildInsights(base);
    expect(a).toMatchObject({ kind: "categoryVsUsual", category: "Salidas", pct: 100, diff: 1500 });
    expect(b).toMatchObject({ kind: "categoryVsUsual", category: "Alimentos", pct: -33 });
  });

  it("stays quiet about small swings and categories with no history", () => {
    const quiet = buildInsights({ ...base, usual: new Map([["Salidas", 2900]]) });
    expect(quiet.some((i) => i.kind === "categoryVsUsual")).toBe(false);
  });

  it("says nothing about saving before any income arrives", () => {
    expect(buildInsights(base).some((i) => i.kind === "saved" || i.kind === "overspent")).toBe(false);
    expect(buildInsights({ ...base, income: 20000 })).toContainEqual({ kind: "saved", pct: 75, amount: 15000 });
    expect(buildInsights({ ...base, income: 4000 })).toContainEqual({ kind: "overspent", amount: 1000 });
  });

  it("counts days without spending while the period runs", () => {
    const r = buildInsights({ ...base, usualPeriods: 0, dailyExpenses: [100, 0, 0, 50, 0, 20] });
    expect(r).toContainEqual({ kind: "quietDays", days: 3 });
  });

  it("names a dominant category when nothing else stands out", () => {
    const r = buildInsights({ ...base, usualPeriods: 0, categories: [cat("Renta", 6500, 60)] });
    expect(r).toContainEqual({ kind: "topCategory", category: "Renta", color: "#000", pct: 60 });
  });
});

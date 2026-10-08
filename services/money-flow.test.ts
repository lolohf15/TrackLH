import { describe, expect, it } from "vitest";
import { moneyFlow } from "./money-flow";
import type { Transaction } from "@/types";

const cat = (category: string, amount: number) => ({ category, amount, count: 1, percentage: 0, color: "#000" });
let n = 0;
const tx = (type: Transaction["type"], amount: number, category: string | null, description: string | null = null): Transaction => ({
  id: String(n++), date: "2026-09-10T12:00:00.000Z", amount, type, category, account: "A", toAccount: null,
  description, notes: null, procesado: false, syncedAt: "", recurringRuleId: null,
});

describe("moneyFlow", () => {
  const txs = [
    tx("Ingreso", 9000, "Sueldo"), tx("Ingreso", 1000, "Extra"),
    tx("Gasto", 300, "Alimentos", "Oxxo"), tx("Gasto", 200, "Alimentos", "oxxo "), tx("Gasto", 700, "Alimentos", "Walmart"),
    tx("Gasto", 100, "Alimentos", null), tx("Gasto", 3000, "Renta", "Renta"),
  ];
  const cats = [cat("Renta", 3000), cat("Alimentos", 1300)];

  it("splits income by source and leaves the rest as savings", () => {
    const f = moneyFlow(txs, cats, new Map([["Sueldo", "#0f0"]]))!;
    expect(f.sources).toEqual([
      { label: "Sueldo", amount: 9000, color: "#0f0" },
      { label: "Extra", amount: 1000, color: null },
    ]);
    expect(f.saved).toBe(5700);
    expect(f.deficit).toBe(0);
  });

  it("groups a category's descriptions loosely and folds the unnamed", () => {
    const f = moneyFlow(txs, cats, new Map(), { maxDetails: 1 })!;
    expect(f.details.Alimentos).toEqual([
      { label: "Walmart", amount: 700, color: null },
      { label: "", amount: 600, color: null },
    ]);
  });

  it("folds the tail of categories and covers overspending from the balance", () => {
    const f = moneyFlow([tx("Ingreso", 1000, "Sueldo")], [cat("A", 800), cat("B", 300), cat("C", 100)], new Map(), { maxCategories: 2 })!;
    expect(f.categories.at(-1)).toEqual({ label: "", amount: 100, color: null });
    expect(f.deficit).toBe(200);
    expect(f.saved).toBe(0);
  });

  it("still draws spending before any income arrives", () => {
    const f = moneyFlow([], [cat("A", 500)], new Map())!;
    expect(f.income).toBe(0);
    expect(f.deficit).toBe(0);
    expect(f.categories).toHaveLength(1);
  });

  it("has nothing to draw without movements", () => {
    expect(moneyFlow([], [], new Map())).toBeNull();
  });
});

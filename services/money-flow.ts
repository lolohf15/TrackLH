/**
 * The money-flow chart's two sides: where the period's money came from and
 * where it went. Both sides add up to the same total, so the bands between
 * them never have to invent a gap. When spending ran past income, the
 * difference comes "from your balance"; when it didn't, what's left is saved.
 */
import type { CategorySummary } from "@/types";
import { round2 } from "./finance";

export interface FlowNode {
  key: string;
  /** A category's name; empty for the built-in nodes, which the screen names. */
  label: string;
  color: string | null;
  amount: number;
}

export interface MoneyFlow {
  total: number;
  sources: FlowNode[];
  targets: FlowNode[];
}

export function moneyFlow(income: number, categories: CategorySummary[], maxCategories = 5): MoneyFlow | null {
  const expenses = round2(categories.reduce((s, c) => s + c.amount, 0));
  if (income <= 0) return null;

  const named = categories.slice(0, maxCategories);
  const rest = round2(categories.slice(maxCategories).reduce((s, c) => s + c.amount, 0));
  const targets: FlowNode[] = named.map((c) => ({ key: `cat:${c.category}`, label: c.category, color: c.color, amount: c.amount }));
  if (rest > 0) targets.push({ key: "other", label: "", color: null, amount: rest });

  const sources: FlowNode[] = [{ key: "income", label: "", color: null, amount: round2(income) }];
  if (expenses > income) sources.push({ key: "deficit", label: "", color: null, amount: round2(expenses - income) });
  else if (income > expenses) targets.push({ key: "saved", label: "", color: null, amount: round2(income - expenses) });

  return { total: round2(Math.max(income, expenses)), sources, targets };
}

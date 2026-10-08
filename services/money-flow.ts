/**
 * What the money-flow chart draws for a period, as plain figures: where the
 * money came from (income by category), what it went to (expense categories,
 * then savings or the shortfall), and what each category was mostly made of
 * (its top descriptions). `services/sankey.ts` turns a chosen slice of this
 * into positioned bands.
 */
import type { CategorySummary, Transaction } from "@/types";
import { round2, UNCATEGORIZED } from "./finance";

export interface FlowItem {
  label: string;
  amount: number;
  color: string | null;
}

export interface MoneyFlow {
  income: number;
  expenses: number;
  /** Income by category, largest first. */
  sources: FlowItem[];
  /** Expense categories, largest first; past `maxCategories` folded into one with an empty label. */
  categories: FlowItem[];
  /** Income left unspent; 0 when spending caught up. */
  saved: number;
  /** Spending past income, covered from the balance; 0 when income covered it. */
  deficit: number;
  /** Per named category: its top descriptions, the rest folded into an empty label. */
  details: Record<string, FlowItem[]>;
}

/** Folds everything past `max` into one item with an empty label, which the screen names. */
function fold(items: FlowItem[], max: number): FlowItem[] {
  if (items.length <= max) return items;
  const rest = round2(items.slice(max).reduce((s, i) => s + i.amount, 0));
  return [...items.slice(0, max), { label: "", amount: rest, color: null }];
}

export function moneyFlow(
  transactions: Transaction[],
  categories: CategorySummary[],
  incomeColors: Map<string, string>,
  { maxCategories = 6, maxDetails = 4 } = {}
): MoneyFlow | null {
  const expenses = round2(categories.reduce((s, c) => s + c.amount, 0));

  const bySource = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "Ingreso") continue;
    const key = t.category ?? UNCATEGORIZED;
    bySource.set(key, (bySource.get(key) ?? 0) + t.amount);
  }
  const sources = Array.from(bySource, ([label, amount]) => ({ label, amount: round2(amount), color: incomeColors.get(label) ?? null }))
    .sort((a, b) => b.amount - a.amount);
  const income = round2(sources.reduce((s, i) => s + i.amount, 0));
  if (income <= 0 && expenses <= 0) return null;

  const named = fold(
    categories.map((c) => ({ label: c.category, amount: c.amount, color: c.color })),
    maxCategories
  );

  // What each named category was spent on, by description.
  const shown = new Set(named.map((c) => c.label).filter(Boolean));
  const perCategory = new Map<string, Map<string, { label: string; amount: number }>>();
  for (const t of transactions) {
    if (t.type !== "Gasto") continue;
    const category = t.category ?? UNCATEGORIZED;
    if (!shown.has(category)) continue;
    const text = (t.description ?? "").trim();
    const key = text.toLocaleLowerCase("es").replace(/\s+/g, " ");
    const groups = perCategory.get(category) ?? new Map();
    const g = groups.get(key) ?? { label: text, amount: 0 };
    g.amount += t.amount;
    groups.set(key, g);
    perCategory.set(category, groups);
  }
  const details: Record<string, FlowItem[]> = {};
  for (const [category, groups] of perCategory) {
    const items = Array.from(groups.values())
      .map((g) => ({ label: g.label, amount: round2(g.amount), color: null }))
      .sort((a, b) => (a.label === "" ? 1 : b.label === "" ? -1 : b.amount - a.amount));
    // Unnamed movements join the folded rest rather than a blank row of their own.
    const blank = items.filter((i) => i.label === "").reduce((s, i) => s + i.amount, 0);
    const namedItems = items.filter((i) => i.label !== "");
    const folded = fold(namedItems, maxDetails);
    if (blank > 0) {
      const last = folded[folded.length - 1];
      if (last && last.label === "") last.amount = round2(last.amount + blank);
      else folded.push({ label: "", amount: round2(blank), color: null });
    }
    details[category] = folded;
  }

  return {
    income,
    expenses,
    sources,
    categories: named,
    saved: round2(Math.max(0, income - expenses)),
    deficit: income > 0 ? round2(Math.max(0, expenses - income)) : 0,
    details,
  };
}

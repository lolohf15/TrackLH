import { prisma } from "@/lib/prisma";
import { DEFAULT_BUDGETS, ACCOUNT_COLORS } from "@/types";

const ACCOUNT_DEFAULTS = [
  { account: "Nu Crédito",     isCredit: true,  color: ACCOUNT_COLORS["Nu Crédito"] },
  { account: "Nu Débito",      isCredit: false, color: ACCOUNT_COLORS["Nu Débito"] },
  { account: "Revolut",        isCredit: true,  color: ACCOUNT_COLORS["Revolut"] }, // rule 7: credit
  { account: "Revolut Débito", isCredit: false, color: ACCOUNT_COLORS["Revolut Débito"] },
  { account: "BBVA Débito",    isCredit: false, color: ACCOUNT_COLORS["BBVA Débito"] },
  { account: "Efectivo",       isCredit: false, color: ACCOUNT_COLORS["Efectivo"] },
  { account: "Inversiones",    isCredit: false, color: ACCOUNT_COLORS["Inversiones"] },
] as const;

/**
 * Seed account configs and budget presets on first run.
 * - Creates each account with initialBalance = 0 if it doesn't exist.
 * - Always re-applies isCredit and color from app rules so corrections are auto-fixed.
 * - Never overwrites the user's initialBalance or initialBalanceDate.
 */
let defaultsSeeded = false;

export async function ensureDefaults(): Promise<void> {
  if (defaultsSeeded) return;
  defaultsSeeded = true;
  for (const d of ACCOUNT_DEFAULTS) {
    await prisma.accountConfig.upsert({
      where: { account: d.account },
      create: { account: d.account, initialBalance: 0, isCredit: d.isCredit, color: d.color },
      update: { isCredit: d.isCredit, color: d.color },
    }).catch((err) => console.error(`[ensureDefaults] accountConfig "${d.account}":`, err));
  }
  for (const b of DEFAULT_BUDGETS) {
    await prisma.budgetConfig.upsert({
      where: { category: b.category },
      create: b,
      update: {},
    }).catch((err) => console.error(`[ensureDefaults] budgetConfig "${b.category}":`, err));
  }
}

import { prisma } from "@/lib/prisma";
import {
  queryAllPages,
  NOTION_DATABASE_ID,
  NOTION_PROPS,
  extractTitle,
  extractDate,
  extractNumber,
  extractSelect,
  extractRichText,
  extractCheckbox,
  type NotionPage,
} from "@/lib/notion";
import { isValidTransactionType, DEFAULT_BUDGETS } from "@/types";
import type { SyncResult } from "@/types";

const ACCOUNT_DEFAULTS = [
  { account: "Nu Crédito",     isCredit: true,  color: "#C084FC" },
  { account: "Nu Débito",      isCredit: false, color: "#7C9EFF" },
  { account: "Revolut",        isCredit: true,  color: "#F472B6" }, // rule 7: credit
  { account: "Revolut Débito", isCredit: false, color: "#38BDF8" },
  { account: "BBVA Débito",    isCredit: false, color: "#34D399" },
  { account: "Efectivo",       isCredit: false, color: "#FBBF24" },
  { account: "Bitso",          isCredit: false, color: "#FB923C" },
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

function mapPage(page: NotionPage): {
  data: Parameters<typeof prisma.transaction.upsert>[0]["create"];
  skipped: false;
} | { skipped: true; reason: string } {
  const date = extractDate(page);
  const rawAmount = extractNumber(page, NOTION_PROPS.amount);
  const type = extractSelect(page, NOTION_PROPS.type);
  const account = extractSelect(page, NOTION_PROPS.account);

  if (!date) return { skipped: true, reason: `[${page.id}] sin fecha` };
  if (rawAmount == null) return { skipped: true, reason: `[${page.id}] sin monto` };
  if (!account) return { skipped: true, reason: `[${page.id}] sin cuenta` };
  if (!type) return { skipped: true, reason: `[${page.id}] sin tipo` };

  // Rule 4: ignore unknown transaction types
  if (!isValidTransactionType(type)) {
    return { skipped: true, reason: `[${page.id}] tipo desconocido: "${type}"` };
  }

  // Rule 10: transfers require a destination account
  if (type === "Transferencia") {
    const toAccount = extractSelect(page, NOTION_PROPS.toAccount);
    if (!toAccount) {
      return { skipped: true, reason: `[${page.id}] transferencia sin cuenta destino` };
    }
  }

  // Descripción: try explicit property first, fall back to page title
  const description =
    extractRichText(page, NOTION_PROPS.description) ?? extractTitle(page);

  return {
    skipped: false,
    data: {
      id: page.id,
      date: new Date(date),
      amount: Math.abs(rawAmount), // always positive; type determines direction
      type,
      category: extractSelect(page, NOTION_PROPS.category),
      account,
      toAccount: extractSelect(page, NOTION_PROPS.toAccount),
      description,
      notes: extractRichText(page, NOTION_PROPS.notes),
      procesado: extractCheckbox(page, NOTION_PROPS.procesado),
      syncedAt: new Date(),
    },
  };
}

export async function syncFromNotion(): Promise<SyncResult> {
  if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return {
      success: false,
      count: 0,
      skipped: 0,
      warnings: [],
      message: "Faltan NOTION_API_KEY o NOTION_DATABASE_ID en .env",
      syncedAt: new Date().toISOString(),
    };
  }

  try {
    const pages = await queryAllPages(NOTION_DATABASE_ID);
    const results = pages.map(mapPage);

    const valid = results.filter((r) => !r.skipped) as Extract<ReturnType<typeof mapPage>, { skipped: false }>[];
    const skippedItems = results.filter((r) => r.skipped) as Extract<ReturnType<typeof mapPage>, { skipped: true }>[];
    const warnings = skippedItems.map((s) => s.reason);

    // Rule 2: upsert — never duplicate; Notion page ID is the primary key
    // Sequential to avoid exhausting the pgbouncer connection pool
    for (const r of valid) {
      await prisma.transaction.upsert({
        where: { id: r.data.id as string },
        create: r.data,
        update: { ...r.data, syncedAt: new Date() },
      });
    }

    await prisma.syncLog.create({
      data: {
        status: "success",
        count: valid.length,
        skipped: skippedItems.length,
        warnings: warnings.length > 0 ? warnings.join("\n") : null,
      },
    });

    return {
      success: true,
      count: valid.length,
      skipped: skippedItems.length,
      warnings,
      message: `${valid.length} transacciones sincronizadas${skippedItems.length > 0 ? `, ${skippedItems.length} omitidas` : ""}`,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await prisma.syncLog.create({ data: { status: "error", count: 0, message } });
    return {
      success: false,
      count: 0,
      skipped: 0,
      warnings: [],
      message,
      syncedAt: new Date().toISOString(),
    };
  }
}

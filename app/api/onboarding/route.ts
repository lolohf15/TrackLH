import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { CUSTOM_COLOR_CYCLE } from "@/services/presets";

interface IncomingAccount {
  account: string;
  isCredit: boolean;
  color?: string;
}

interface IncomingCategory {
  name: string;
  kind: "expense" | "income";
  color?: string;
  budget?: number;
}

/**
 * Writes everything the welcome wizard collected in one transaction, then
 * stamps `onboardedAt`. Re-runnable: a user who comes back to add an account
 * later hits the same endpoint and existing rows are left alone.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido (JSON)" }, { status: 400 });
    }

    const { accounts, categories } = body as {
      accounts?: IncomingAccount[];
      categories?: IncomingCategory[];
    };

    if (!Array.isArray(accounts) || !Array.isArray(categories)) {
      return NextResponse.json({ error: "Faltan cuentas o categorías" }, { status: 400 });
    }

    const cleanAccounts = accounts
      .filter((a) => typeof a?.account === "string" && a.account.trim() !== "")
      .map((a, i) => ({
        account: a.account.trim().slice(0, 60),
        isCredit: !!a.isCredit,
        color: a.color ?? CUSTOM_COLOR_CYCLE[i % CUSTOM_COLOR_CYCLE.length],
      }));

    const cleanCategories = categories
      .filter((c) => typeof c?.name === "string" && c.name.trim() !== "")
      .map((c, i) => ({
        name: c.name.trim().slice(0, 40),
        kind: c.kind === "income" ? "income" : "expense",
        color: c.color ?? CUSTOM_COLOR_CYCLE[i % CUSTOM_COLOR_CYCLE.length],
        budget: Number.isFinite(c.budget) && (c.budget as number) > 0 ? (c.budget as number) : 0,
        sortOrder: i,
      }));

    if (cleanAccounts.length === 0) {
      return NextResponse.json({ error: "Elige al menos una cuenta" }, { status: 400 });
    }

    await prisma.$transaction([
      ...cleanAccounts.map((a) =>
        prisma.accountConfig.upsert({
          where: { userId_account: { userId, account: a.account } },
          create: { userId, account: a.account, initialBalance: 0, isCredit: a.isCredit, color: a.color },
          // Someone re-running the wizard keeps whatever balance they set.
          update: { isCredit: a.isCredit, color: a.color },
        })
      ),
      ...cleanCategories.map((c) =>
        prisma.category.upsert({
          where: { userId_kind_name: { userId, kind: c.kind, name: c.name } },
          create: { userId, name: c.name, kind: c.kind, color: c.color, sortOrder: c.sortOrder },
          update: { color: c.color, sortOrder: c.sortOrder },
        })
      ),
      ...cleanCategories
        .filter((c) => c.kind === "expense" && c.budget > 0)
        .map((c) =>
          prisma.budgetConfig.upsert({
            where: { userId_category: { userId, category: c.name } },
            create: { userId, category: c.name, amount: c.budget },
            update: { amount: c.budget },
          })
        ),
      prisma.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/onboarding");
  }
}

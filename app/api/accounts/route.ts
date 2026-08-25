import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { round2, computeAccountBalances } from "@/services/finance";
import type { Transaction } from "@/types";

type AccountRow = {
  id: number;
  userId: string;
  account: string;
  initialBalance: number;
  initialBalanceDate: Date | null;
  balanceAdjustment: number;
  adjustmentDate: Date | null;
  isCredit: boolean;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializeAccount(a: AccountRow, calculatedBalance: number, currentBalance: number) {
  return {
    id: a.id,
    account: a.account,
    initialBalance: a.initialBalance,
    initialBalanceDate: a.initialBalanceDate?.toISOString() ?? null,
    balanceAdjustment: a.balanceAdjustment,
    adjustmentDate: a.adjustmentDate?.toISOString() ?? null,
    calculatedBalance,
    currentBalance,
    isCredit: a.isCredit,
    color: a.color,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

async function fetchTxs(userId: string): Promise<Transaction[]> {
  const rows = await prisma.transaction.findMany({ where: { userId } });
  return rows.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    amount: t.amount,
    type: t.type as Transaction["type"],
    category: t.category,
    account: t.account,
    toAccount: t.toAccount,
    description: t.description,
    notes: t.notes,
    procesado: t.procesado,
    syncedAt: t.syncedAt.toISOString(),
  }));
}

export async function GET() {
  try {
    const userId = await requireUser();

    const [accounts, txs] = await Promise.all([
      prisma.accountConfig.findMany({
        where: { userId },
        orderBy: [{ isCredit: "asc" }, { account: "asc" }],
      }),
      fetchTxs(userId),
    ]);

    const balances = computeAccountBalances(txs, accounts);
    const balanceMap = new Map(balances.map((b) => [b.account, b]));

    return NextResponse.json(
      accounts.map((a) => {
        const b = balanceMap.get(a.account);
        return serializeAccount(
          a,
          b?.calculatedBalance ?? a.initialBalance,
          b?.currentBalance ?? a.initialBalance
        );
      })
    );
  } catch (err) {
    return errorResponse(err, "GET /api/accounts");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUser();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido (JSON)" }, { status: 400 });
    }

    const { account, desiredBalance } = body as {
      account?: string;
      desiredBalance?: unknown;
    };

    if (!account || typeof account !== "string" || account.trim() === "") {
      return NextResponse.json({ error: "Campo 'account' requerido" }, { status: 400 });
    }

    if (desiredBalance === undefined || desiredBalance === null || desiredBalance === "") {
      return NextResponse.json({ error: "El saldo deseado no puede estar vacío" }, { status: 400 });
    }
    const parsed = Number(desiredBalance);
    if (!isFinite(parsed)) {
      return NextResponse.json({ error: "El saldo deseado debe ser un número válido" }, { status: 400 });
    }
    const rounded = round2(parsed);

    const [accounts, txs] = await Promise.all([
      prisma.accountConfig.findMany({ where: { userId } }),
      fetchTxs(userId),
    ]);

    const config = accounts.find((a) => a.account === account.trim());
    if (!config) {
      return NextResponse.json({ error: `Cuenta "${account}" no encontrada` }, { status: 404 });
    }

    const balances = computeAccountBalances(txs, accounts);
    const accountBalance = balances.find((b) => b.account === account.trim());
    const calculatedBalance = accountBalance?.calculatedBalance ?? config.initialBalance;

    const adjustment = round2(rounded - calculatedBalance);

    // Account names are only unique within a tenant now, so the update has to
    // travel through the compound key rather than the bare name.
    const updated = await prisma.accountConfig.update({
      where: { userId_account: { userId, account: account.trim() } },
      data: {
        balanceAdjustment: adjustment,
        adjustmentDate: new Date(),
      },
    });

    console.log(
      `[PUT /api/accounts] "${account}" desired=${rounded}, calculated=${calculatedBalance}, adjustment=${adjustment}`
    );

    return NextResponse.json(serializeAccount(updated, calculatedBalance, rounded));
  } catch (err) {
    return errorResponse(err, "PUT /api/accounts");
  }
}

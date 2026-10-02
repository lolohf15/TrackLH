import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { round2, computeAccountBalancesFromSums } from "@/services/finance";
import { getAccountSums } from "@/lib/account-sums";
import { parseAccountKind, parseCreditLimit, parseCycleDays } from "@/lib/account-input";
import { mapAccountConfig } from "@/lib/money";
import { getCreditCardStatus, type CreditCardStatus } from "@/lib/credit-sums";
import { readToday } from "@/lib/request-today";

type AccountRow = {
  id: number;
  userId: string;
  account: string;
  initialBalance: number;
  initialBalanceDate: Date | null;
  balanceAdjustment: number;
  adjustmentDate: Date | null;
  isCredit: boolean;
  creditLimit: number | null;
  statementDay: number | null;
  dueDay: number | null;
  kind: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializeAccount(
  a: AccountRow,
  calculatedBalance: number,
  currentBalance: number,
  cycle: CreditCardStatus | null = null
) {
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
    creditLimit: a.creditLimit,
    statementDay: a.statementDay,
    dueDay: a.dueDay,
    kind: a.kind,
    color: a.color,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    /** Cards with a cut day: where the statement stands. Null otherwise. */
    cycle,
  };
}

/** Add an account after onboarding. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const account =
      typeof body.account === "string" ? body.account.trim().slice(0, 60) : "";
    if (account === "") {
      return NextResponse.json({ error: m.accountNameRequired }, { status: 400 });
    }

    const isCredit = !!body.isCredit;
    const { statementDay, dueDay } = parseCycleDays(body, isCredit);

    try {
      const created = await prisma.accountConfig.create({
        data: {
          userId,
          account,
          isCredit,
          creditLimit: parseCreditLimit(body.creditLimit, isCredit),
          statementDay,
          dueDay,
          kind: parseAccountKind(body.kind, isCredit),
          color: typeof body.color === "string" ? body.color : null,
          initialBalance: 0,
        },
      });
      return NextResponse.json({ success: true, id: created.id }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: m.accountExists }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    return errorResponse(err, "POST /api/accounts");
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();
    const today = readToday(req);

    const [accounts, sums] = await Promise.all([
      prisma.accountConfig
        .findMany({
          where: { userId },
          orderBy: [{ isCredit: "asc" }, { account: "asc" }],
        })
        .then((rows) => rows.map(mapAccountConfig)),
      getAccountSums(userId),
    ]);

    const balances = computeAccountBalancesFromSums(sums, accounts);
    const balanceMap = new Map(balances.map((b) => [b.account, b]));

    const cycles = await getCreditCardStatus(
      userId,
      accounts.flatMap((a) =>
        a.isCredit && a.statementDay != null
          ? [{
              account: a.account,
              statementDay: a.statementDay,
              dueDay: a.dueDay,
              initialBalance: a.initialBalance,
              balanceAdjustment: a.balanceAdjustment,
            }]
          : []
      ),
      today
    );

    return NextResponse.json(
      accounts.map((a) => {
        const b = balanceMap.get(a.account);
        return serializeAccount(
          a,
          b?.calculatedBalance ?? a.initialBalance,
          b?.currentBalance ?? a.initialBalance,
          cycles.get(a.account) ?? null
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
    const m = await apiMessages();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const { account, desiredBalance } = body as {
      account?: string;
      desiredBalance?: unknown;
    };

    if (!account || typeof account !== "string" || account.trim() === "") {
      return NextResponse.json({ error: m.accountFieldRequired }, { status: 400 });
    }

    if (desiredBalance === undefined || desiredBalance === null || desiredBalance === "") {
      return NextResponse.json({ error: m.balanceEmpty }, { status: 400 });
    }
    const parsed = Number(desiredBalance);
    if (!isFinite(parsed)) {
      return NextResponse.json({ error: m.balanceNotNumber }, { status: 400 });
    }
    const rounded = round2(parsed);

    const [accounts, sums] = await Promise.all([
      prisma.accountConfig.findMany({ where: { userId } }).then((rows) => rows.map(mapAccountConfig)),
      getAccountSums(userId),
    ]);

    const config = accounts.find((a) => a.account === account.trim());
    if (!config) {
      return NextResponse.json({ error: m.accountNamedMissing(account) }, { status: 404 });
    }

    const balances = computeAccountBalancesFromSums(sums, accounts);
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

    return NextResponse.json(serializeAccount(mapAccountConfig(updated), calculatedBalance, rounded));
  } catch (err) {
    return errorResponse(err, "PUT /api/accounts");
  }
}

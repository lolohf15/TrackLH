"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AccountBalance } from "@/types";

export function AccountBalances({ data }: { data: AccountBalance[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Saldo por cuenta</CardTitle></CardHeader>
        <CardContent>
          <EmptyState title="Sin cuentas" description="Sincroniza tus transacciones" />
        </CardContent>
      </Card>
    );
  }

  const assets = data.filter((a) => !a.isCredit);
  const credits = data.filter((a) => a.isCredit);

  return (
    <Card>
      <CardHeader><CardTitle>Saldo por cuenta</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0.5">
          {assets.map((a) => <AccountRow key={a.account} account={a} />)}

          {credits.length > 0 && (
            <>
              <div className="pt-4 pb-1.5">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">
                  Crédito
                </p>
              </div>
              {credits.map((a) => <AccountRow key={a.account} account={a} credit />)}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AccountRow({ account, credit }: { account: AccountBalance; credit?: boolean }) {
  const isNegative = account.currentBalance < 0;

  return (
    <div className="flex items-center justify-between py-2.5 group rounded-lg px-2 -mx-2 hover:bg-[#F8F5F0] transition-colors">
      <div className="flex items-center gap-2.5">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: account.color }}
        />
        <span className="text-sm text-[#4B5563] group-hover:text-[#111827] transition-colors">
          {account.account}
        </span>
      </div>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          credit
            ? "text-purple-600"
            : isNegative
            ? "text-[#C0392B]"
            : "text-[#111827]"
        )}
      >
        {formatMXN(account.currentBalance)}
      </span>
    </div>
  );
}

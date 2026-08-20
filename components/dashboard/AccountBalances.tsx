"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AccountBalance } from "@/types";

export function AccountBalances({ data, bare = false }: { data: AccountBalance[]; bare?: boolean }) {
  const assets = data.filter((a) => !a.isCredit);
  const credits = data.filter((a) => a.isCredit);

  const body = data.length === 0 ? (
    <EmptyState title="Sin cuentas" description="Sincroniza tus transacciones" />
  ) : (
    <div>
      {assets.map((a) => <AccountRow key={a.account} account={a} />)}

      {credits.length > 0 && (
        <>
          <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] pt-4 pb-1">
            Crédito
          </p>
          {credits.map((a) => <AccountRow key={a.account} account={a} credit />)}
        </>
      )}
    </div>
  );

  if (bare) return body;

  return (
    <Card>
      <CardHeader><CardTitle>Saldo por cuenta</CardTitle></CardHeader>
      <CardContent className="pt-0">{body}</CardContent>
    </Card>
  );
}

function AccountRow({ account, credit }: { account: AccountBalance; credit?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-t border-divider first:border-t-0">
      <div className="flex items-center gap-2.5">
        <span className="w-[7px] h-[7px] shrink-0" style={{ backgroundColor: account.color }} />
        <span className="text-[13.5px] text-text">{account.account}</span>
      </div>
      <span className={cn("font-mono text-sm font-semibold", credit ? "text-red-fg" : "text-text")}>
        {formatMXN(account.currentBalance)}
      </span>
    </div>
  );
}

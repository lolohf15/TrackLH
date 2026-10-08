"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SettingsGroup, SettingsRow, SubpageHeader } from "@/components/settings/SettingsList";
import { AccountEditSheet, type EditableAccount } from "@/components/settings/AccountEditSheet";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { useAccounts } from "@/lib/use-accounts";
import { formatMXN } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";

/** Every account, grouped by what it is, each opening its edit sheet. */
export default function AccountsPage() {
  const t = useT();
  const { data: accounts } = useAccounts();
  const [editing, setEditing] = useState<EditableAccount | "new" | null>(null);

  const groups = [
    { title: t.wallet.debit, items: (accounts ?? []).filter((a) => !a.isCredit && a.kind === null) },
    { title: t.wallet.credit, items: (accounts ?? []).filter((a) => a.isCredit) },
    { title: t.profile.cashAndOther, items: (accounts ?? []).filter((a) => !a.isCredit && a.kind !== null) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pb-8 flex flex-col gap-7">
      <SubpageHeader title={t.profile.accounts} backLabel={t.profile.back} />
      {!accounts ? (
        <ChartSkeleton height="h-48" />
      ) : (
        groups.map((g) => (
          <SettingsGroup key={g.title} title={g.title}>
            {g.items.map((a) => (
              <SettingsRow
                key={a.id}
                leading={<span aria-hidden className="w-3 h-3 rounded-full shrink-0 mx-[9px]" style={{ background: a.color ?? "var(--color-text-faint)" }} />}
                label={a.account}
                detail={a.hiddenInWallet ? t.profile.hiddenInWallet : undefined}
                value={formatMXN(a.currentBalance)}
                onClick={() => setEditing(a)}
              />
            ))}
          </SettingsGroup>
        ))
      )}
      <SettingsGroup>
        <SettingsRow icon={Plus} tile="accent" tone="action" label={t.wallet.addAccount} onClick={() => setEditing("new")} />
      </SettingsGroup>
      <AccountEditSheet
        key={editing === "new" ? "new" : `account-${editing?.id ?? "none"}`}
        account={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

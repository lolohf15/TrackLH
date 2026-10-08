"use client";

import { SettingsGroup, SettingsRow, SubpageHeader } from "@/components/settings/SettingsList";
import { useToast } from "@/components/ui/Toast";
import { saveProfile, useProfile } from "@/lib/use-profile";
import { useAccounts } from "@/lib/use-accounts";
import { useT } from "@/lib/i18n-react";
import type { ProfileView } from "@/types";

/** What a new movement opens on: the account and the type, each a short choice list. */
export default function RecordDefaultsPage() {
  const t = useT();
  const toast = useToast();
  const { data: profile } = useProfile();
  const { data: accounts } = useAccounts();

  function save(patch: Partial<ProfileView>) {
    saveProfile(patch).catch(() => toast({ message: t.profile.saveFailed }));
  }

  const type = profile?.defaultType ?? "Gasto";
  const types = [
    { value: "Gasto" as const, label: t.txType.Gasto },
    { value: "Ingreso" as const, label: t.txType.Ingreso },
    { value: "Transferencia" as const, label: t.txType.Transferencia },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pb-8 flex flex-col gap-7">
      <SubpageHeader title={t.profile.recordDefaults} backLabel={t.profile.back} />
      <SettingsGroup title={t.profile.defaultType} footer={t.profile.recordDefaultsHint}>
        {types.map((o) => (
          <SettingsRow key={o.value} label={o.label} selected={type === o.value} onClick={() => save({ defaultType: o.value })} />
        ))}
      </SettingsGroup>
      <SettingsGroup title={t.profile.defaultAccount}>
        <SettingsRow
          label={t.profile.lastUsed}
          selected={!profile?.defaultAccount}
          onClick={() => save({ defaultAccount: null })}
        />
        {(accounts ?? []).map((a) => (
          <SettingsRow
            key={a.id}
            label={a.account}
            detail={a.isCredit ? t.wallet.credit : a.kind === "cash" ? t.wallet.cash : undefined}
            selected={profile?.defaultAccount === a.account}
            onClick={() => save({ defaultAccount: a.account })}
          />
        ))}
      </SettingsGroup>
    </div>
  );
}

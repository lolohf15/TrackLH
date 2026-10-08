"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { SettingsGroup, SettingsRow, SubpageHeader } from "@/components/settings/SettingsList";
import { PasswordSheet } from "@/components/profile/PasswordSheet";
import { useProfile } from "@/lib/use-profile";
import { useT } from "@/lib/i18n-react";

/** How this person signs in, and the password: changed, or created for a Google-only account. */
export default function SecurityPage() {
  const t = useT();
  const { data: profile } = useProfile();
  const [sheet, setSheet] = useState(false);
  const google = profile?.providers.includes("google") ?? false;

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pb-8 flex flex-col gap-7">
      <SubpageHeader title={t.profile.security} backLabel={t.profile.back} />
      <SettingsGroup title={t.profile.signInMethods}>
        <SettingsRow label={t.profile.google} value={google ? t.profile.connected : t.profile.notSet} />
        <SettingsRow label={t.profile.password} value={profile?.hasPassword ? t.profile.configured : t.profile.notSet} />
      </SettingsGroup>
      {profile && (
        <SettingsGroup footer={profile.hasPassword ? undefined : t.profile.setPasswordHint}>
          <SettingsRow
            icon={KeyRound}
            tile="blue"
            label={profile.hasPassword ? t.profile.changePassword : t.profile.setPassword}
            onClick={() => setSheet(true)}
          />
        </SettingsGroup>
      )}
      {profile && (
        <PasswordSheet key={String(sheet)} open={sheet} onClose={() => setSheet(false)} hasPassword={profile.hasPassword} />
      )}
    </div>
  );
}

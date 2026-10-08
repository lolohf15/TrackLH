"use client";

import { useSyncExternalStore } from "react";
import { mutate } from "swr";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { applyTheme, currentTheme, serverTheme, subscribeToTheme } from "@/lib/theme";
import { applyLang } from "@/lib/i18n";
import { useLang, useT } from "@/lib/i18n-react";
import { saveProfile, useProfile } from "@/lib/use-profile";
import { useAccounts } from "@/lib/use-accounts";
import type { ProfileView } from "@/types";

/**
 * How the app behaves for this person, saved to their account so it follows
 * them to any device. Theme and language also keep a copy on the device, for
 * a first paint without a flash.
 */
export function PreferencesPanel() {
  const t = useT();
  const toast = useToast();
  const lang = useLang();
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);
  const { data: profile } = useProfile();
  const { data: accounts } = useAccounts();

  function save(patch: Partial<ProfileView>) {
    saveProfile(patch)
      .then(() => {
        // Week boundaries are drawn on the server, so anything cut by week
        // has to be asked for again.
        if ("weekStart" in patch) {
          mutate((key) => typeof key === "string" && /^\/api\/(analytics|transactions|dashboard|categories)/.test(key));
        }
      })
      .catch(() => toast({ message: t.profile.saveFailed }));
  }

  return (
    <section aria-labelledby="prefs-title">
      <h2 id="prefs-title" className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
        {t.profile.preferences}
      </h2>
      <div className="panel px-4 divide-y divide-divider">
        <Row label={t.profile.theme}>
          <SegmentedControl
            options={[
              { value: "dark" as const, label: t.profile.dark },
              { value: "light" as const, label: t.profile.light },
            ]}
            value={theme}
            onChange={(v) => {
              applyTheme(v);
              save({ theme: v });
            }}
            label={t.profile.theme}
            size="sm"
          />
        </Row>
        <Row label={t.profile.language}>
          <SegmentedControl
            options={[
              { value: "es" as const, label: t.profile.spanish },
              { value: "en" as const, label: t.profile.english },
            ]}
            value={lang}
            onChange={(v) => {
              applyLang(v);
              save({ language: v });
            }}
            label={t.profile.language}
            size="sm"
          />
        </Row>
        <Row label={t.profile.defaultAccount} hint={t.profile.defaultAccountHint}>
          <Select
            value={profile?.defaultAccount ?? ""}
            onChange={(v) => save({ defaultAccount: v || null })}
            placeholder={t.profile.lastUsed}
            block
            aria-label={t.profile.defaultAccount}
          >
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.account}>
                {a.account}
              </option>
            ))}
          </Select>
        </Row>
        <Row label={t.profile.defaultType}>
          <SegmentedControl
            options={[
              { value: "Gasto" as const, label: t.txType.Gasto },
              { value: "Ingreso" as const, label: t.txType.Ingreso },
              { value: "Transferencia" as const, label: t.movements.typeShort.Transferencia },
            ]}
            value={profile?.defaultType ?? "Gasto"}
            onChange={(v) => save({ defaultType: v })}
            label={t.profile.defaultType}
            size="sm"
          />
        </Row>
        <Row label={t.profile.weekStart}>
          <SegmentedControl
            options={[
              { value: "1" as const, label: t.profile.monday },
              { value: "0" as const, label: t.profile.sunday },
            ]}
            value={String(profile?.weekStart ?? 1) as "0" | "1"}
            onChange={(v) => save({ weekStart: v === "0" ? 0 : 1 })}
            label={t.profile.weekStart}
            size="sm"
          />
        </Row>
        <Row label={t.profile.analyticsPeriod}>
          <SegmentedControl
            options={[
              { value: "week" as const, label: t.home.periodWeek },
              { value: "month" as const, label: t.home.periodMonth },
              { value: "year" as const, label: t.home.periodYear },
            ]}
            value={profile?.analyticsPeriod ?? "month"}
            onChange={(v) => save({ analyticsPeriod: v })}
            label={t.profile.analyticsPeriod}
            size="sm"
          />
        </Row>
      </div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="py-3.5 flex flex-col gap-2">
      <div>
        <p className="text-[13.5px] text-text">{label}</p>
        {hint && <p className="text-[11.5px] text-text-dim mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import useSWR, { mutate } from "swr";
import {
  CalendarDays, ChartPie, Download, Languages, Lightbulb, LogOut, Moon, PenLine, Repeat, Shield, Sun, Tags,
  Trash2, UserRound, WalletCards,
} from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { OptionSheet } from "@/components/settings/OptionSheet";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsList";
import { useExport } from "@/components/settings/DataExport";
import { useToast } from "@/components/ui/Toast";
import { applyTheme, currentTheme, serverTheme, subscribeToTheme } from "@/lib/theme";
import { applyLang } from "@/lib/i18n";
import { useLang, useT } from "@/lib/i18n-react";
import { saveProfile, useProfile } from "@/lib/use-profile";
import { useAccounts } from "@/lib/use-accounts";
import { signOutClean } from "@/lib/sign-out";
import type { ProfileView } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Picker = "theme" | "language" | "week" | "analytics" | null;

/**
 * Perfil as a phone's settings: who you are at the top, then short groups
 * (account, preferences, your data, help), each row showing its current
 * value and opening the screen or the choice behind it. Signing out and
 * deleting sit at the end, where nothing is tapped by accident.
 */
export default function Perfil() {
  const t = useT();
  const toast = useToast();
  const lang = useLang();
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);
  const { data: profile } = useProfile();
  const { data: accounts } = useAccounts();
  const { data: categories } = useSWR<unknown[]>("/api/categories", fetcher);
  const { download, busy: exporting, error: exportError } = useExport();

  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [leaving, setLeaving] = useState(false);

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

  const methods = profile
    ? [profile.providers.includes("google") && t.profile.google, profile.hasPassword && t.profile.password]
        .filter(Boolean)
        .join(" · ")
    : "";
  const typeLabel = { Gasto: t.txType.Gasto, Ingreso: t.txType.Ingreso, Transferencia: t.movements.typeShort.Transferencia };
  const periodLabel = { week: t.home.periodWeek, month: t.home.periodMonth, year: t.home.periodYear };
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pt-2 pb-8 flex flex-col gap-7">
      <h1 className="sr-only">{t.profile.title}</h1>

      {/* Who this is; tapping it edits the name and the avatar. */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="press flex flex-col items-center text-center gap-2 pt-5 outline-none focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-accent"
      >
        <Avatar name={profile?.name} email={profile?.email} color={profile?.avatarColor} size={80} className="shadow-float" />
        <span className="min-w-0 max-w-full">
          <span className="block text-[21px] font-semibold text-text truncate tracking-[-0.01em]">
            {profile?.name || profile?.email || " "}
          </span>
          {profile?.name && <span className="block text-[13px] text-text-dim truncate mt-0.5">{profile.email}</span>}
        </span>
      </button>

      <SettingsGroup title={t.profile.accountGroup}>
        <SettingsRow icon={UserRound} tile="accent" label={t.profile.personalInfo} value={profile?.name ?? ""} onClick={() => setEditing(true)} />
        <SettingsRow icon={Shield} tile="blue" label={t.profile.security} value={methods} href="/perfil/seguridad" />
      </SettingsGroup>

      <SettingsGroup title={t.profile.preferences}>
        <SettingsRow
          icon={theme === "light" ? Sun : Moon}
          tile="graphite"
          label={t.profile.appearance}
          value={theme === "light" ? t.profile.light : t.profile.dark}
          onClick={() => setPicker("theme")}
        />
        <SettingsRow
          icon={Languages}
          tile="blue"
          label={t.profile.language}
          value={lang === "en" ? t.profile.english : t.profile.spanish}
          onClick={() => setPicker("language")}
        />
        <SettingsRow
          icon={PenLine}
          tile="accent"
          label={t.profile.recordDefaults}
          // The type alone until an account is chosen; "the last one you
          // used" is the default and too long to repeat here.
          value={
            profile
              ? [profile.defaultAccount, typeLabel[profile.defaultType ?? "Gasto"]].filter(Boolean).join(" · ")
              : ""
          }
          href="/perfil/registro"
        />
        <SettingsRow
          icon={CalendarDays}
          tile="red"
          label={t.profile.weekStart}
          value={profile?.weekStart === 0 ? t.profile.sunday : t.profile.monday}
          onClick={() => setPicker("week")}
        />
        <SettingsRow
          icon={ChartPie}
          tile="green"
          label={t.profile.analyticsPeriod}
          value={periodLabel[profile?.analyticsPeriod ?? "month"]}
          onClick={() => setPicker("analytics")}
        />
      </SettingsGroup>

      <SettingsGroup title={t.profile.data} footer={exportError ?? undefined}>
        <SettingsRow icon={WalletCards} tile="purple" label={t.profile.accounts} value={accounts ? String(accounts.length) : ""} href="/perfil/cuentas" />
        <SettingsRow icon={Tags} tile="amber" label={t.profile.categories} value={categories ? String(categories.length) : ""} href="/perfil/categorias" />
        <SettingsRow icon={Repeat} tile="green" label={t.recurring.title} href="/perfil/recurrentes" />
        <SettingsRow
          icon={Download}
          tile="graphite"
          label={exporting ? t.profile.exporting : t.profile.exportExcel}
          onClick={download}
          disabled={exporting}
          trailing={
            exporting ? (
              <svg className="animate-spin-fast w-4 h-4 text-text-dim" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <span />
            )
          }
        />
      </SettingsGroup>

      <SettingsGroup title={t.profile.help}>
        <SettingsRow icon={Lightbulb} tile="amber" label={t.profile.tipsRow} href="/perfil/consejos" />
      </SettingsGroup>

      <SettingsGroup footer={profile?.email}>
        <SettingsRow
          icon={LogOut}
          tile="graphite"
          label={leaving ? t.profile.signingOut : t.profile.signOut}
          disabled={leaving}
          trailing={<span />}
          onClick={() => {
            setLeaving(true);
            signOutClean();
          }}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon={Trash2} tone="danger" label={t.profile.deleteAccount} href="/perfil/eliminar" />
      </SettingsGroup>

      {version && <p className="text-center font-mono text-[10.5px] text-text-faint -mt-3">{t.profile.version(version)}</p>}

      {profile && <ProfileSheet key={String(editing)} open={editing} onClose={() => setEditing(false)} profile={profile} />}

      <OptionSheet
        open={picker === "theme"}
        onClose={() => setPicker(null)}
        title={t.profile.appearance}
        options={[
          { value: "dark", label: t.profile.dark },
          { value: "light", label: t.profile.light },
        ]}
        value={theme}
        onChange={(v) => {
          applyTheme(v);
          save({ theme: v });
        }}
      />
      <OptionSheet
        open={picker === "language"}
        onClose={() => setPicker(null)}
        title={t.profile.language}
        options={[
          { value: "es", label: t.profile.spanish },
          { value: "en", label: t.profile.english },
        ]}
        value={lang}
        onChange={(v) => {
          applyLang(v);
          save({ language: v });
        }}
      />
      <OptionSheet
        open={picker === "week"}
        onClose={() => setPicker(null)}
        title={t.profile.weekStart}
        options={[
          { value: 1, label: t.profile.monday },
          { value: 0, label: t.profile.sunday },
        ]}
        value={profile?.weekStart ?? 1}
        onChange={(v) => save({ weekStart: v === 0 ? 0 : 1 })}
      />
      <OptionSheet
        open={picker === "analytics"}
        onClose={() => setPicker(null)}
        title={t.profile.analyticsPeriod}
        options={[
          { value: "week", label: t.home.periodWeek },
          { value: "month", label: t.home.periodMonth },
          { value: "year", label: t.home.periodYear },
        ]}
        value={profile?.analyticsPeriod ?? "month"}
        onChange={(v) => save({ analyticsPeriod: v })}
      />
    </div>
  );
}

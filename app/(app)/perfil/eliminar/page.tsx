"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { signOut } from "next-auth/react";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { DataExport } from "@/components/settings/DataExport";
import { useProfile } from "@/lib/use-profile";
import { useT } from "@/lib/i18n-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Counts = { accounts: number; transactions: number; categories: number; recurring: number; budgets: number };

/**
 * Deleting the account, made deliberate: the export comes first, the screen
 * says exactly what goes, and the button stays off until the account's own
 * email is typed in full. The server checks the email again.
 */
export default function DeleteAccountPage() {
  const t = useT();
  const { data: profile } = useProfile();
  const { data: counts } = useSWR<Counts>("/api/profile/delete", fetcher);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = !!profile && typed.trim().toLowerCase() === profile.email.toLowerCase();

  async function remove() {
    if (!matches) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: typed.trim() }),
    }).catch(() => null);
    if (!res?.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.error ?? t.profile.saveFailed);
      setBusy(false);
      return;
    }
    // Nothing of this person should stay cached on the device.
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-3 pb-8">
      <Link
        href="/perfil"
        className="press inline-flex items-center gap-1 -ml-1 min-h-[36px] pr-2 font-mono text-[10.5px] uppercase tracking-wide text-text-dim hover:text-text"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        {t.profile.title}
      </Link>

      <div className="flex items-center gap-3 mt-2">
        <span className="w-10 h-10 rounded-full grid place-items-center bg-red-bg text-red-fg shrink-0">
          <TriangleAlert className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="text-[20px] font-semibold text-text">{t.profile.deleteTitle}</h1>
      </div>
      <p className="text-[14px] text-text-muted leading-relaxed mt-3">{t.profile.deleteIntro}</p>

      <p className="text-[13px] text-text-muted mt-6 mb-2 px-1">{t.profile.deleteExportFirst}</p>
      <DataExport />

      <p className="text-[13px] text-text-muted mt-6 mb-2 px-1">{t.profile.deleteWhat}</p>
      {!counts ? (
        <ChartSkeleton height="h-28" />
      ) : (
        <ul className="panel px-4 py-1 divide-y divide-divider">
          {t.profile.deleteCounts(counts).map((line) => (
            <li key={line} className="py-2.5 text-[14px] text-text tabular-nums">
              {line}
            </li>
          ))}
        </ul>
      )}

      {profile && (
        <label className="flex flex-col gap-2 mt-6">
          <span className="text-[13px] text-text-muted px-1">{t.profile.deleteTypeEmail(profile.email)}</span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] text-[15px] text-text outline-none focus:border-red-border focus:ring-1 focus:ring-red-border"
          />
        </label>
      )}

      {error && <p role="alert" className="text-[12.5px] text-red-fg mt-3">{error}</p>}

      <div className="flex flex-col gap-2 mt-5">
        <Button variant="danger" size="lg" disabled={!matches || busy} onClick={remove}>
          {busy ? t.profile.deleting : t.profile.deleteConfirm}
        </Button>
        <Link href="/perfil" className="press text-center text-[13px] text-text-muted py-3">
          {t.profile.deleteBack}
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PROFILE_KEY, useProfile } from "@/lib/use-profile";
import { useT } from "@/lib/i18n-react";
import { cn } from "@/lib/utils";

/** How this person gets in, and a way to change or create a password. */
export function SecurityPanel() {
  const t = useT();
  const { data: profile } = useProfile();
  const [sheet, setSheet] = useState(false);
  if (!profile) return null;
  const google = profile.providers.includes("google");

  return (
    <section aria-labelledby="security-title">
      <h2 id="security-title" className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
        {t.profile.security}
      </h2>
      <div className="panel px-4 divide-y divide-divider">
        <div className="py-3.5">
          <p className="text-[13.5px] text-text">{t.profile.signInMethods}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            <Method label={t.profile.google} on={google} />
            <Method label={t.profile.password} on={profile.hasPassword} />
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="press w-full flex items-center justify-between gap-3 py-3.5 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[13.5px] text-text">
              {profile.hasPassword ? t.profile.changePassword : t.profile.setPassword}
            </span>
            {!profile.hasPassword && <span className="block text-[11.5px] text-text-dim mt-0.5">{t.profile.setPasswordHint}</span>}
          </span>
          <span aria-hidden className="text-text-faint">›</span>
        </button>
      </div>
      <PasswordSheet key={String(sheet)} open={sheet} onClose={() => setSheet(false)} hasPassword={profile.hasPassword} />
    </section>
  );
}

function Method({ label, on }: { label: string; on: boolean }) {
  const t = useT();
  return (
    <li className="flex items-center justify-between text-[12.5px]">
      <span className="text-text-muted">{label}</span>
      <span className={cn("flex items-center gap-1.5", on ? "text-green-fg" : "text-text-dim")}>
        <span aria-hidden className={cn("w-1.5 h-1.5 rounded-full", on ? "bg-green-fg" : "bg-border-strong")} />
        {on ? t.profile.connected : t.profile.notSet}
      </span>
    </li>
  );
}

function PasswordSheet({ open, onClose, hasPassword }: { open: boolean; onClose: () => void; hasPassword: boolean }) {
  const t = useT();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: string | null; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hasPassword ? { current, next } : { next }),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      setError({ field: body?.field ?? null, message: body?.error ?? t.profile.saveFailed });
      return;
    }
    mutate(PROFILE_KEY);
    toast({ message: t.profile.passwordChanged });
    onClose();
  }

  const field =
    "w-full rounded-md bg-surface-2 border px-3.5 py-3 min-h-[48px] text-[15px] text-text outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40";

  return (
    <BottomSheet open={open} onClose={onClose} title={hasPassword ? t.profile.changePassword : t.profile.setPassword}>
      <form onSubmit={submit} className="flex flex-col gap-4 pb-6">
        {!hasPassword && <p className="text-[13px] text-text-muted">{t.profile.setPasswordHint}</p>}
        {hasPassword && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-dim">{t.profile.currentPassword}</span>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              aria-invalid={error?.field === "current"}
              className={cn(field, error?.field === "current" ? "border-red-border" : "border-border")}
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-dim">{t.profile.newPassword}</span>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            aria-invalid={error?.field === "next"}
            aria-describedby="new-password-hint"
            className={cn(field, error?.field === "next" ? "border-red-border" : "border-border")}
          />
          <span id="new-password-hint" className="text-[11.5px] text-text-dim">{t.profile.passwordMin}</span>
        </label>
        {error && <p role="alert" className="text-[12.5px] text-red-fg">{error.message}</p>}
        <Button type="submit" size="lg" disabled={busy || next.length < 8 || (hasPassword && !current)}>
          {busy ? t.profile.saving : t.profile.save}
        </Button>
      </form>
    </BottomSheet>
  );
}

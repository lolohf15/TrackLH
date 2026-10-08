"use client";

import { useState } from "react";
import { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PROFILE_KEY } from "@/lib/use-profile";
import { useT } from "@/lib/i18n-react";
import { cn } from "@/lib/utils";

/** Changes the password with the current one, or creates a first one for a Google-only account. */
export function PasswordSheet({ open, onClose, hasPassword }: { open: boolean; onClose: () => void; hasPassword: boolean }) {
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

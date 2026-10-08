"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { ColorPicker } from "@/components/settings/ColorPicker";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "./Avatar";
import { saveProfile } from "@/lib/use-profile";
import { useT } from "@/lib/i18n-react";
import type { ProfileView } from "@/types";

/** Name and avatar colour, edited together and previewed live. */
export function ProfileSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: ProfileView }) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState(profile.name ?? "");
  const [color, setColor] = useState(profile.avatarColor ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await saveProfile({
        name: name.trim() || null,
        avatarColor: color || null,
      });
      toast({ message: t.profile.saved });
      onClose();
    } catch {
      toast({ message: t.profile.saveFailed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t.profile.editProfile}>
      <div className="flex flex-col gap-5 pb-6">
        <div className="flex justify-center pt-1">
          <Avatar
            name={name || profile.name}
            email={profile.email}
            color={color || null}
            size={72}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-dim">{t.profile.name}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={t.profile.namePlaceholder}
            autoComplete="name"
            className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] text-[15px] text-text placeholder:text-text-faint outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-text-dim">{t.profile.color}</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <Button onClick={save} disabled={busy} size="lg">
          {busy ? t.profile.saving : t.profile.save}
        </Button>
      </div>
    </BottomSheet>
  );
}

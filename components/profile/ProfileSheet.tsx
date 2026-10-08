"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ColorPicker } from "@/components/settings/ColorPicker";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "./Avatar";
import { saveProfile } from "@/lib/use-profile";
import { isSingleEmoji } from "@/services/profile-input";
import { useT } from "@/lib/i18n-react";
import { cn } from "@/lib/utils";
import type { ProfileView } from "@/types";

/** A handful to tap; anything else can be typed or pasted. */
const QUICK_EMOJI = ["🦊", "🐻", "🐼", "🦁", "🐯", "🐸", "🐙", "🦄", "🌵", "🌊", "🔥", "⭐️", "🍀", "☕️", "🎧", "🚀"];

/** Name and avatar, edited together and previewed live. */
export function ProfileSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: ProfileView }) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState(profile.name ?? "");
  const [mode, setMode] = useState<"initials" | "emoji">(profile.avatarEmoji ? "emoji" : "initials");
  const [emoji, setEmoji] = useState(profile.avatarEmoji ?? "");
  const [color, setColor] = useState(profile.avatarColor ?? "");
  const [busy, setBusy] = useState(false);

  const emojiOk = mode === "initials" || isSingleEmoji(emoji.trim());

  async function save() {
    if (!emojiOk) return;
    setBusy(true);
    try {
      await saveProfile({
        name: name.trim() || null,
        avatarEmoji: mode === "emoji" ? emoji.trim() : null,
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
            emoji={mode === "emoji" && emojiOk ? emoji.trim() : null}
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
          <span className="text-xs text-text-dim">{t.profile.avatar}</span>
          <SegmentedControl
            options={[
              { value: "initials" as const, label: t.profile.avatarInitials },
              { value: "emoji" as const, label: t.profile.avatarEmoji },
            ]}
            value={mode}
            onChange={setMode}
            label={t.profile.avatar}
          />
          {mode === "emoji" && (
            <>
              <div className="grid grid-cols-8 gap-1.5 mt-1">
                {QUICK_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    aria-pressed={emoji === e}
                    className={cn(
                      "press aspect-square rounded-md grid place-items-center text-[20px] bg-surface-2",
                      emoji === e && "ring-2 ring-accent"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder={t.profile.emojiPlaceholder}
                aria-invalid={!emojiOk}
                className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-2.5 text-[18px] text-text placeholder:text-[14px] placeholder:text-text-faint outline-none focus:border-accent/60"
              />
              {!emojiOk && emoji.trim() !== "" && <p className="text-[12px] text-red-fg">{t.profile.emojiInvalid}</p>}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-text-dim">{t.profile.color}</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <Button onClick={save} disabled={busy || !emojiOk || (mode === "emoji" && !emoji.trim())} size="lg">
          {busy ? t.profile.saving : t.profile.save}
        </Button>
      </div>
    </BottomSheet>
  );
}

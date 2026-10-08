"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { ProfileSheet } from "./ProfileSheet";
import { useProfile } from "@/lib/use-profile";
import { useT } from "@/lib/i18n-react";

/** Who this is: the avatar, the name and the email, one tap from editing. */
export function IdentityCard() {
  const t = useT();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press w-full flex flex-col items-center text-center gap-2.5 pt-4 pb-2 outline-none focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-accent"
      >
        <Avatar
          name={profile?.name}
          email={profile?.email}
          color={profile?.avatarColor}
          size={76}
          className="shadow-float"
        />
        <span className="min-w-0">
          <span className="block text-[19px] font-semibold text-text truncate">{profile?.name || profile?.email || " "}</span>
          {profile?.name && <span className="block text-[12.5px] text-text-dim truncate mt-0.5">{profile.email}</span>}
        </span>
        <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-accent">{t.profile.editProfile}</span>
      </button>
      {profile && <ProfileSheet key={String(open)} open={open} onClose={() => setOpen(false)} profile={profile} />}
    </>
  );
}

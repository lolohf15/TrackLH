"use client";

import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { useProfile } from "@/lib/use-profile";
import { firstName } from "@/services/profile-input";
import { useT } from "@/lib/i18n-react";

/** "Hola, Lorenzo" with the avatar, which leads to Perfil. */
export function Greeting() {
  const t = useT();
  const { data: profile } = useProfile();

  return (
    <div className="flex items-center gap-2.5 pt-4 min-h-[56px]">
      <Link
        href="/perfil"
        aria-label={t.profile.title}
        className="press rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Avatar
          name={profile?.name}
          email={profile?.email}
          emoji={profile?.avatarEmoji}
          color={profile?.avatarColor}
          size={36}
        />
      </Link>
      <p className="text-[15px] font-semibold text-text truncate">
        {profile ? t.profile.hello(firstName(profile.name)) : " "}
      </p>
    </div>
  );
}

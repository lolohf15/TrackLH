"use client";

import { SubpageHeader } from "@/components/settings/SettingsList";
import { TipsPanel } from "@/components/settings/TipsPanel";
import { useT } from "@/lib/i18n-react";

/** What the app can do that nobody has to set up to get started. */
export default function TipsPage() {
  const t = useT();
  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pb-8 flex flex-col gap-4">
      <SubpageHeader title={t.profile.tipsRow} backLabel={t.profile.back} />
      <TipsPanel bare />
    </div>
  );
}

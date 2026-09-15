"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { applyLang } from "@/lib/i18n";
import { useLang, useT } from "@/lib/i18n-react";

export function LanguageToggle() {
  const t = useT();
  const lang = useLang();

  const options = [
    { value: "es" as const, label: t.profile.spanish },
    { value: "en" as const, label: t.profile.english },
  ];

  return (
    <div className="panel px-4 py-4 space-y-2.5">
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {t.profile.language}
      </p>
      <SegmentedControl
        options={options}
        value={lang}
        onChange={applyLang}
        label={t.profile.language}
      />
    </div>
  );
}

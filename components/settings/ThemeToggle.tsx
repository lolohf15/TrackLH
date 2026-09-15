"use client";

import { useSyncExternalStore } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { applyTheme, currentTheme, serverTheme, subscribeToTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n-react";

export function ThemeToggle() {
  const t = useT();
  // The theme lives on the document element, put there before React booted.
  // Reading it as an external store keeps the server's "dark" and the
  // client's real value from disagreeing during hydration.
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);

  const options = [
    { value: "dark" as const, label: t.profile.dark },
    { value: "light" as const, label: t.profile.light },
  ];

  return (
    <div className="panel px-4 py-4 space-y-2.5">
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {t.profile.theme}
      </p>
      <SegmentedControl
        options={options}
        value={theme}
        onChange={applyTheme}
        label={t.profile.theme}
      />
    </div>
  );
}

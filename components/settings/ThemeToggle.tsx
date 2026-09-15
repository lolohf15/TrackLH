"use client";

import { useSyncExternalStore } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { applyTheme, currentTheme, serverTheme, subscribeToTheme } from "@/lib/theme";

const OPTIONS = [
  { value: "dark" as const, label: "Oscuro" },
  { value: "light" as const, label: "Claro" },
];

export function ThemeToggle() {
  // The theme lives on the document element, put there before React booted.
  // Reading it as an external store keeps the server's "dark" and the
  // client's real value from disagreeing during hydration.
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);

  function pick(next: typeof theme) {
    applyTheme(next);
  }

  return (
    <div className="panel px-4 py-4 space-y-2.5">
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        Tema
      </p>
      <SegmentedControl options={OPTIONS} value={theme} onChange={pick} label="Tema de la app" />
    </div>
  );
}

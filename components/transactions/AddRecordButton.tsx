"use client";

import { useState } from "react";
import { TransactionSheet } from "./TransactionSheet";
import { PlusIcon } from "@/components/shell/icons";
import { useT } from "@/lib/i18n-react";

/**
 * Always-available way to log a movement, mirroring what the iOS shortcut asks
 * for. On phones it docks into the tab bar's empty middle column and rises out
 * of it — the thing you do most often sits at the app's center of gravity. On
 * desktop there's no tab bar, so it goes back to floating bottom-right.
 *
 * Positioned by `left`, not a translate: `.press` puts a scale on :active, and
 * a transform from the stylesheet would drop a translate rather than compose
 * with it, snapping the button sideways on every tap.
 */
export function AddRecordButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  // Bumped on every open so the sheet remounts with an empty form — a reset
  // driven by the tap rather than by an effect watching `open`.
  const [session, setSession] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSession((s) => s + 1);
          setOpen(true);
        }}
        aria-label={t.addRecord}
        className="glass-accent press fixed z-40 w-14 h-14 rounded-full flex items-center justify-center
                   text-accent-ink
                   left-[calc(50%-1.75rem)] bottom-[calc(env(safe-area-inset-bottom)+2.5rem)]
                   md:left-auto md:right-6 md:bottom-6"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      <TransactionSheet key={session} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

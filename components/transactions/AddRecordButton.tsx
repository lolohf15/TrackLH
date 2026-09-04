"use client";

import { useState } from "react";
import { TransactionSheet } from "./TransactionSheet";
import { PlusIcon } from "@/components/shell/icons";

/**
 * Always-available way to log a movement, mirroring what the iOS shortcut asks
 * for. The one fully round element in the app, and the one that earns a real
 * shadow: it floats over scrolling content and has to read as above it.
 */
export function AddRecordButton() {
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
        aria-label="Agregar movimiento"
        className="glass-accent press fixed right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center
                   text-white
                   bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      <TransactionSheet key={session} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

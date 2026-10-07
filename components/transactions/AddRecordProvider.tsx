"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { TransactionSheet, type RecordPrefill } from "./TransactionSheet";

type OpenAddRecord = (prefill?: RecordPrefill) => void;

const AddRecordContext = createContext<OpenAddRecord | null>(null);

/**
 * One record sheet for the whole signed-in app. The + button opens it, and so
 * does anything else that wants a new movement (an empty list, the first
 * step on Inicio), so there is a single sheet with a single behavior.
 */
export function AddRecordProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<RecordPrefill | undefined>(undefined);
  // Bumped on every open so the sheet remounts with an empty form — a reset
  // driven by the tap rather than by an effect watching `open`.
  const [session, setSession] = useState(0);

  const openAddRecord = useCallback<OpenAddRecord>((next) => {
    setPrefill(next);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  return (
    <AddRecordContext.Provider value={openAddRecord}>
      {children}
      <TransactionSheet key={session} open={open} onClose={() => setOpen(false)} prefill={prefill} />
    </AddRecordContext.Provider>
  );
}

export function useAddRecord(): OpenAddRecord {
  const open = useContext(AddRecordContext);
  if (!open) throw new Error("useAddRecord needs an AddRecordProvider above it");
  return open;
}

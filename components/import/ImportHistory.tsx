"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { ImportBatchSummary } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Past reconciliations, each still undoable.
 *
 * This is what makes the whole flow safe to try: a mapping that read the
 * wrong column produces rows that look plausible and are all wrong, and the
 * only honest answer to that is one button that takes them all back out.
 */
export function ImportHistory({ onChanged }: { onChanged?: () => void }) {
  const t = useT();
  const { data, mutate } = useSWR<ImportBatchSummary[]>("/api/import", fetcher);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const batches = data ?? [];

  async function undo(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/import/${id}`, { method: "DELETE" });
      await mutate();
      onChanged?.();
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  return (
    <section className="panel px-4 py-4">
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {t.reconcile.history}
      </p>

      {batches.length === 0 ? (
        <p className="text-[12.5px] text-text-dim mt-2.5">{t.reconcile.historyEmpty}</p>
      ) : (
        <div className="mt-1">
          {batches.map((batch) => (
            <div key={batch.id} className="border-t border-divider py-3 first:border-t-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-text truncate">{batch.account}</p>
                  <p className="font-mono text-[10.5px] text-text-dim mt-0.5 truncate">
                    {batch.fileName}
                  </p>
                  <p className="font-mono text-[10.5px] text-text-dim mt-0.5">
                    {formatDate(batch.createdAt)} ·{" "}
                    {t.reconcile.batchSummary(batch.rowsCreated, batch.rowsMatched)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirming(confirming === batch.id ? null : batch.id)}
                  disabled={busy === batch.id}
                  className="press shrink-0 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-text-muted hover:border-border-strong hover:text-text transition-colors duration-150 disabled:opacity-40"
                >
                  {busy === batch.id ? t.reconcile.undoing : t.reconcile.undo}
                </button>
              </div>

              {confirming === batch.id && (
                <div className="mt-2.5 rounded-md border border-red-border bg-red-bg px-3 py-2.5">
                  <p className="text-[11.5px] text-text-muted">{t.reconcile.undoConfirm}</p>
                  <button
                    type="button"
                    onClick={() => undo(batch.id)}
                    className="press mt-2 text-[12px] text-red-fg font-medium"
                  >
                    {t.reconcile.undoYes}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

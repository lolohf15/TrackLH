"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/shell/icons";
import { useT } from "@/lib/i18n-react";

/** Pulls the name the server picked out of `Content-Disposition`. */
function fileNameFrom(header: string | null, fallback: string): string {
  if (!header) return fallback;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // A malformed header is not worth failing a finished download over.
    }
  }

  return /filename="([^"]+)"/i.exec(header)?.[1] ?? fallback;
}

/**
 * Downloads the whole ledger as an .xlsx.
 *
 * A plain `<a download>` would be simpler, but the file is built on demand —
 * a big ledger takes a moment, and a failure would land the reader on a page
 * of raw JSON. Fetching it means the button can say it's working and show
 * the error where they're already looking.
 */
export function DataExport() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.profile.exportFailed);
      }

      const blob = await res.blob();
      const name = fileNameFrom(res.headers.get("Content-Disposition"), "TrackLH.xlsx");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoking straight away cancels the download in Safari, which reads
      // the blob after the click returns.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.unknownError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel px-4 py-4 space-y-3">
      <div>
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
          {t.profile.data}
        </p>
        <p className="text-[13px] text-text mt-1.5">{t.profile.dataHint}</p>
        <p className="text-[11.5px] text-text-dim mt-1 leading-relaxed">
          {t.profile.exportNote}
        </p>
      </div>

      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="press w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-4 py-2.5 text-[13px] text-text-muted hover:border-border-strong hover:text-text transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? (
          <svg className="animate-spin-fast w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <DownloadIcon className="w-3.5 h-3.5 shrink-0" />
        )}
        {busy ? t.profile.exporting : t.profile.exportExcel}
      </button>

      {error && (
        <p role="alert" className="text-[11.5px] text-red-fg">
          {error}
        </p>
      )}
    </div>
  );
}

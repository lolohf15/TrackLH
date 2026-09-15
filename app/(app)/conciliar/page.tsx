"use client";

import { StatementReconcile } from "@/components/import/StatementReconcile";
import { useT } from "@/lib/i18n-react";

export default function Conciliar() {
  const t = useT();

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pt-4 pb-6">
      <h1 className="text-[15px] font-semibold text-text">{t.reconcile.title}</h1>
      <p className="text-[12.5px] text-text-dim mt-1 mb-4 leading-relaxed">
        {t.reconcile.subtitle}
      </p>

      <StatementReconcile />
    </div>
  );
}

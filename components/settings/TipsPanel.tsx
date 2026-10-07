"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, CalendarClock, CreditCard, Repeat, Smartphone, type LucideIcon } from "lucide-react";
import { InstallGuideSheet } from "@/components/onboarding/InstallGuideSheet";
import { ChevronDownIcon } from "@/components/shell/icons";
import { useT } from "@/lib/i18n-react";

/**
 * What the app can do that nobody has to set up to get started: card days,
 * fixed expenses, the keypad's arithmetic. Kept here rather than in Inicio's
 * first steps, for whoever has a use for them, when they come looking.
 */
export function TipsPanel() {
  const t = useT();
  const [installOpen, setInstallOpen] = useState(false);
  const tips: { icon: LucideIcon; title: string; text: string; href?: string; onClick?: () => void; action?: string }[] = [
    { icon: CreditCard, ...t.tips.cards, href: "/wallet" },
    { icon: CalendarClock, ...t.tips.recurring, href: "/perfil/recurrentes" },
    { icon: Calculator, ...t.tips.math },
    { icon: Repeat, ...t.tips.repeat },
    { icon: Smartphone, ...t.tips.install, onClick: () => setInstallOpen(true) },
  ];

  return (
    <section>
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
        {t.tips.title}
      </p>
      <ul className="panel divide-y divide-divider">
        {tips.map(({ icon: Icon, title, text, href, onClick }) => {
          const body = (
            <>
              <span className="w-8 h-8 shrink-0 rounded-md bg-accent/12 text-accent flex items-center justify-center mt-0.5">
                <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] text-text">{title}</span>
                <span className="block text-[12px] text-text-dim leading-relaxed mt-0.5">{text}</span>
              </span>
              {(href || onClick) && (
                <ChevronDownIcon className="w-4 h-4 text-text-faint shrink-0 -rotate-90 self-center" />
              )}
            </>
          );
          const row = "flex items-start gap-3 px-4 py-3";
          return (
            <li key={title}>
              {href ? (
                <Link href={href} className={`press ${row}`}>{body}</Link>
              ) : onClick ? (
                <button type="button" onClick={onClick} className={`press w-full text-left ${row}`}>{body}</button>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <InstallGuideSheet open={installOpen} onClose={() => setInstallOpen(false)} />
    </section>
  );
}

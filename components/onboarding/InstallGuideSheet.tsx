"use client";

import { Share, SquarePlus, Smartphone, type LucideIcon } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n-react";

/**
 * Safari never offers to install a web app, so the only way onto the home
 * screen is by hand. Three steps, each drawn with the glyph the person will
 * actually be looking for in Safari's own UI.
 */
export function InstallGuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const g = t.installGuide;
  const steps: { icon: LucideIcon; title: string; detail: string }[] = [
    { icon: Share, title: g.share, detail: g.shareDetail },
    { icon: SquarePlus, title: g.addToHome, detail: g.addToHomeDetail },
    { icon: Smartphone, title: g.confirm, detail: g.confirmDetail },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title={g.title}>
      <div className="pb-6 space-y-5">
        <p className="text-[14px] text-text-muted leading-relaxed">{g.intro}</p>

        <ol className="panel divide-y divide-divider">
          {steps.map(({ icon: Icon, title, detail }, i) => (
            <li key={title} className="flex items-start gap-3.5 px-4 py-3.5">
              <span className="relative w-10 h-10 shrink-0 rounded-md bg-surface-2 border border-border flex items-center justify-center text-accent">
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden />
                <span className="absolute -top-1.5 -left-1.5 w-[18px] h-[18px] rounded-full bg-accent text-accent-ink font-mono text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {i + 1}
                </span>
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-[14px] font-medium text-text">{title}</span>
                <span className="block text-[12.5px] text-text-dim leading-relaxed mt-0.5">{detail}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="text-[12px] text-text-faint leading-relaxed">{g.otherBrowser}</p>

        <Button size="lg" className="w-full py-3.5" onClick={onClose}>
          {g.gotIt}
        </Button>
      </div>
    </BottomSheet>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import useSWR, { mutate } from "swr";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SuccessCheck } from "@/components/ui/SuccessCheck";
import { useToast } from "@/components/ui/Toast";
import { useAddRecord } from "@/components/transactions/AddRecordProvider";
import { InstallGuideSheet } from "./InstallGuideSheet";
import { BalancesSheet } from "./BalancesSheet";
import { BudgetSheet } from "./BudgetSheet";
import {
  buildFirstSteps,
  detectDevice,
  nextStep,
  type FirstStepId,
  type FirstStepsDevice,
  type FirstStepsProgress,
} from "@/lib/first-steps";
import { useT } from "@/lib/i18n-react";
import { cn } from "@/lib/utils";

const PROGRESS_KEY = "/api/onboarding/progress";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

// The device never changes under a mounted page except for standalone, which
// only flips by relaunching; the media query listener is there for honesty.
const STANDALONE_QUERY = "(display-mode: standalone)";
function subscribeDevice(onChange: () => void) {
  const mq = window.matchMedia(STANDALONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function deviceSnapshot(): string {
  const d = detectDevice(navigator, window.matchMedia(STANDALONE_QUERY).matches);
  return `${d.ios ? 1 : 0}${d.standalone ? 1 : 0}`;
}
function useDevice(): FirstStepsDevice | null {
  // A string snapshot, so React can compare it; null while server-rendering,
  // where there's no device to ask.
  const snap = useSyncExternalStore(subscribeDevice, deviceSnapshot, () => "");
  return snap === "" ? null : { ios: snap[0] === "1", standalone: snap[1] === "1" };
}

type SheetId = Exclude<FirstStepId, "account" | "movement">;

/**
 * The setup that the welcome screens leave out on purpose, as a short list
 * on Inicio. It starts with steps already ticked, ticks the rest as the data
 * shows up, and goes away when it's done or when it's closed.
 */
export function FirstSteps() {
  const t = useT();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const openAddRecord = useAddRecord();
  const device = useDevice();
  const { data: progress } = useSWR<FirstStepsProgress>(PROGRESS_KEY, fetcher);
  const [sheet, setSheet] = useState<SheetId | null>(null);

  if (!progress || !device || progress.dismissed) return null;

  const steps = buildFirstSteps(progress, device);
  const next = nextStep(steps);
  const doneCount = steps.filter((s) => s.done).length;
  const copy = t.firstSteps.steps;

  function open(id: FirstStepId) {
    if (id === "account") return;
    if (id === "movement") {
      openAddRecord({ type: "Gasto" });
      return;
    }
    setSheet(id);
  }

  async function setDismissed(dismissed: boolean) {
    await mutate(PROGRESS_KEY, { ...progress!, dismissed }, { revalidate: false });
    await fetch(PROGRESS_KEY, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed }),
    }).catch(() => {});
    mutate(PROGRESS_KEY);
  }

  function hide() {
    setDismissed(true);
    toast({ message: t.firstSteps.hidden, action: { label: t.firstSteps.undo, onClick: () => setDismissed(false) } });
  }

  return (
    <>
      <section aria-labelledby="first-steps-title" className="panel overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {next === null ? (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col items-center text-center px-6 pt-6 pb-5"
            >
              <div className="scale-[0.6] -my-4">
                <SuccessCheck state="done" color="var(--color-accent)" />
              </div>
              <h2 id="first-steps-title" className="text-[16px] font-semibold text-text mt-2">
                {t.firstSteps.allDoneTitle}
              </h2>
              <p className="text-[13px] text-text-dim leading-relaxed mt-1 max-w-[30ch]">
                {t.firstSteps.allDoneHint}
              </p>
              <Button variant="secondary" size="md" className="mt-4" onClick={() => setDismissed(true)}>
                {t.firstSteps.close}
              </Button>
            </motion.div>
          ) : (
            <motion.div key="list" exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <div className="px-4 pt-3.5 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="first-steps-title" className="text-[15px] font-semibold text-text">
                    {t.firstSteps.title}
                  </h2>
                  <div className="flex items-center gap-1 -mr-2">
                    <span className="font-mono text-[11px] text-text-dim tabular-nums">
                      {t.firstSteps.progress(doneCount, steps.length)}
                    </span>
                    <button
                      type="button"
                      onClick={hide}
                      className="press font-mono text-[10.5px] text-text-faint uppercase tracking-wide px-2 min-h-[32px] hover:text-text-muted transition-colors duration-150"
                    >
                      {t.firstSteps.hide}
                    </button>
                  </div>
                </div>
                <ProgressBar
                  className="mt-2.5"
                  height={4}
                  segments={[{ percent: (doneCount / steps.length) * 100, color: "var(--color-accent)" }]}
                />
              </div>

              <ul className="border-t border-divider divide-y divide-divider">
                {steps.map((step) => {
                  const isNext = step.id === next.id;
                  const c = copy[step.id];
                  return (
                    <li key={step.id}>
                      {isNext ? (
                        <div className="flex gap-3 px-4 py-3.5 bg-surface-2/40">
                          <Mark done={false} current />
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-text">{c.title}</p>
                            <motion.p
                              key={step.id}
                              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                              className="text-[12.5px] text-text-dim leading-relaxed mt-0.5"
                            >
                              {c.hint}
                            </motion.p>
                            <Button size="sm" className="mt-2.5" onClick={() => open(step.id)}>
                              {c.action}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => open(step.id)}
                          disabled={step.done}
                          className={cn(
                            "press w-full flex items-center gap-3 px-4 min-h-[46px] text-left",
                            "disabled:cursor-default disabled:active:scale-100"
                          )}
                        >
                          <Mark done={step.done} />
                          <span
                            className={cn(
                              "flex-1 min-w-0 truncate text-[13.5px]",
                              step.done ? "text-text-faint" : "text-text-muted"
                            )}
                          >
                            {c.title}
                          </span>
                          {!step.done && <ChevronRight className="w-4 h-4 text-text-faint shrink-0" aria-hidden />}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <InstallGuideSheet open={sheet === "install"} onClose={() => setSheet(null)} />
      <BalancesSheet open={sheet === "balances"} onClose={() => setSheet(null)} />
      <BudgetSheet open={sheet === "budget"} onClose={() => setSheet(null)} />
    </>
  );
}

/** The step's state: an empty ring, the ring of the one to do now, or a check. */
function Mark({ done, current = false }: { done: boolean; current?: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <span
      className={cn(
        "relative w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center",
        done ? "bg-accent" : current ? "border-[1.5px] border-accent" : "border-[1.5px] border-border-strong"
      )}
      aria-hidden
    >
      <AnimatePresence initial={false}>
        {done && (
          <motion.span
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", visualDuration: 0.3, bounce: 0.35 }}
            className="text-accent-ink"
          >
            <Check className="w-3 h-3" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

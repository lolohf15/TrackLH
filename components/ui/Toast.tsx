"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastOptions {
  message: string;
  /** Second line, quieter: what the toast is about ("Gasto · $165.50 · Comida"). */
  detail?: string;
  tone?: "success" | "error";
  /** One action at most — a toast with two buttons is a dialog. */
  action?: { label: string; onClick: () => void | Promise<void> };
  /** Milliseconds on screen. Long enough to reach an Undo with one thumb. */
  duration?: number;
}

interface ActiveToast extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

/** Call `toast({...})` from anywhere under the app shell. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const DEFAULT_DURATION = 5000;
/** A flick this fast dismisses regardless of how far it travelled. */
const DISMISS_VELOCITY = 400;
const DISMISS_DISTANCE = 40;

/**
 * One toast at a time: a new one replaces the old rather than stacking,
 * because the only thing that produces toasts here is the person in front of
 * the screen, and they act one movement at a time. Sits above the tab bar on
 * phones, where the thumb already is, so Undo is a reach, not a stretch.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const nextId = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
  }, []);

  const dismiss = useCallback((id: number) => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 z-[60] flex justify-center
                   bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] md:bottom-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {toast && <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ActiveToast; onDismiss: () => void }) {
  const reduceMotion = useReducedMotion();
  const duration = toast.duration ?? DEFAULT_DURATION;
  const [paused, setPaused] = useState(false);
  const [acting, setActing] = useState(false);
  // Time left survives a pause: holding the toast and letting go resumes the
  // countdown where it was instead of starting it over.
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused) return;
    startedAt.current = performance.now();
    const timer = setTimeout(onDismiss, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= performance.now() - startedAt.current;
    };
  }, [paused, onDismiss]);

  // A toast that ran out while the app sat in the background was never read.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  function onDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) onDismiss();
    else setPaused(false);
  }

  async function runAction() {
    if (!toast.action || acting) return;
    setActing(true);
    try {
      await toast.action.onClick();
    } finally {
      onDismiss();
    }
  }

  const isError = toast.tone === "error";

  return (
    <motion.div
      role={isError ? "alert" : "status"}
      className="glass glass-float relative pointer-events-auto w-full max-w-sm rounded-[20px] flex items-center gap-3 pl-3.5 pr-1.5 py-2 min-h-[56px]"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // Leaves faster than it arrives: the arrival is news, the exit isn't.
      // No `y` here: the drag constraint pins y to 0 and would fight an exit
      // that moves it, leaving the old toast stuck on screen.
      exit={reduceMotion ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
      transition={reduceMotion ? { duration: 0.15 } : { type: "spring", visualDuration: 0.3, bounce: 0.12 }}
      drag={reduceMotion ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.6 }}
      onDragStart={() => setPaused(true)}
      onDragEnd={onDragEnd}
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "w-7 h-7 rounded-full grid place-items-center shrink-0",
          isError ? "bg-red-bg text-red-fg" : "bg-green-bg text-green-fg"
        )}
      >
        {isError ? <CircleAlert size={16} strokeWidth={2.2} /> : <Check size={16} strokeWidth={2.6} />}
      </span>

      <span className="flex-1 min-w-0 py-1">
        <span className="block text-[13.5px] text-text leading-snug truncate">{toast.message}</span>
        {toast.detail && (
          <span className="block text-[12px] text-text-dim leading-snug truncate mt-0.5">{toast.detail}</span>
        )}
      </span>

      {toast.action && (
        <button
          type="button"
          onClick={runAction}
          disabled={acting}
          className="press shrink-0 rounded-full px-3.5 min-h-[44px] text-[13.5px] font-semibold text-accent disabled:opacity-50"
        >
          {toast.action.label}
        </button>
      )}
    </motion.div>
  );
}

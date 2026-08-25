"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Past this projected drop the sheet dismisses instead of settling back. */
const DISMISS_DISTANCE = 110;
const VELOCITY_PROJECTION = 0.2;

/**
 * The app's one bottom sheet. Enters and exits along the same path — a sheet
 * that only animated in and then vanished read as broken — and can be flicked
 * away, which is how a sheet behaves everywhere else on a phone.
 */
export function BottomSheet({ open, onClose, title, children, className }: Props) {
  const reduceMotion = useReducedMotion();

  // A sheet owns the screen: don't let the page scroll behind it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function onDragEnd(_event: unknown, info: PanInfo) {
    const projected = info.offset.y + info.velocity.y * VELOCITY_PROJECTION;
    if (projected > DISMISS_DISTANCE) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "linear" }}
            onClick={onClose}
          />

          <motion.div
            className={cn(
              "relative bg-surface rounded-t-[var(--radius-sheet)] shadow-sheet max-h-[88dvh] flex flex-col",
              className
            )}
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={
              reduceMotion
                ? { duration: 0.15, ease: "linear" }
                : { type: "spring", visualDuration: 0.32, bounce: 0 }
            }
            drag={reduceMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            dragMomentum={false}
            onDragEnd={onDragEnd}
          >
            <div className="pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-9 h-1 rounded-full bg-surface-3 mx-auto" />
            </div>

            {title && (
              <div className="px-5 pt-3 pb-4 shrink-0">
                <h2 className="font-mono text-xs font-semibold text-text uppercase tracking-wide">
                  {title}
                </h2>
              </div>
            )}

            <div className="overflow-y-auto overscroll-contain px-5 pb-safe">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

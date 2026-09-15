"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useLocale, useT } from "@/lib/i18n-react";
import { formatPeriodLabel, resolvePeriod, type PeriodKind } from "@/services/period";

/**
 * Which span is on screen, and which one before or after it. The anchor is a
 * day; every period is "the week/month/year containing it", so stepping is a
 * matter of moving the anchor rather than of special-casing each span.
 */
export function PeriodNav({
  kind,
  anchor,
  onKindChange,
  onAnchorChange,
  /** Captured by the caller so nothing reads the clock mid-render. */
  now,
  onLabelClick,
}: {
  kind: PeriodKind;
  anchor: Date;
  onKindChange: (kind: PeriodKind) => void;
  onAnchorChange: (anchor: Date) => void;
  now: number;
  /** Given, the label becomes a button — the month picker hangs off it. */
  onLabelClick?: () => void;
}) {
  const t = useT();
  const locale = useLocale();

  const period = resolvePeriod(kind, anchor);
  const label = formatPeriodLabel(period, locale);
  // A period that already contains today has no "next" to walk into.
  const atLatest = period.range.to.getTime() > now;

  function step(dir: -1 | 1) {
    const next = new Date(anchor);
    if (kind === "week") next.setUTCDate(next.getUTCDate() + dir * 7);
    else if (kind === "month") next.setUTCMonth(next.getUTCMonth() + dir);
    else if (kind === "year") next.setUTCFullYear(next.getUTCFullYear() + dir);
    onAnchorChange(next);
  }

  return (
    <div className="flex items-center gap-2">
      <SegmentedControl
        options={[
          { value: "week", label: t.home.periodWeek },
          { value: "month", label: t.home.periodMonth },
          { value: "year", label: t.home.periodYear },
          { value: "all", label: t.home.periodAll },
        ]}
        value={kind}
        onChange={onKindChange}
        label={t.home.title}
        size="sm"
        className="flex-1 min-w-0"
      />

      {/* All-time has no span to step through, so the stepper goes away and
          the segments take the width back. */}
      {label !== null && (
        <div className="flex items-center shrink-0 -my-2">
          <StepButton label={t.home.prevPeriod} onClick={() => step(-1)}>
            ‹
          </StepButton>
          <button
            onClick={onLabelClick}
            disabled={!onLabelClick}
            className="press font-mono text-[10px] text-text-muted min-w-[70px] text-center uppercase tracking-wide hover:text-text transition-colors duration-150 ease-out disabled:hover:text-text-muted"
          >
            {label}
          </button>
          <StepButton label={t.home.nextPeriod} onClick={() => step(1)} disabled={atLatest}>
            ›
          </StepButton>
        </div>
      )}
    </div>
  );
}

/** 36px hit area around a 22px glyph box — the target grows, the chrome doesn't. */
function StepButton({
  label, onClick, disabled, children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="press w-9 h-9 flex items-center justify-center group disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center bg-surface-2 text-text-muted text-[11px] transition-colors duration-150 ease-out group-hover:bg-surface-3 group-hover:text-text">
        {children}
      </span>
    </button>
  );
}

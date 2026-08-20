export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

/** Inicio — solid square */
export function SquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" fill="currentColor" />
    </svg>
  );
}

/** Movimientos — stacked lines */
export function LinesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M5 7h14M5 12h9.5M5 17h14" />
    </svg>
  );
}

/** Cuentas — rectangle outline */
export function RectangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
    </svg>
  );
}

/** Categorías — diamond outline */
export function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)" />
    </svg>
  );
}

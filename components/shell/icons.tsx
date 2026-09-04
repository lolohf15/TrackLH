export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m2 0-.8 12.1a2 2 0 01-2 1.9H7.8a2 2 0 01-2-1.9L5 7h14z" />
    </svg>
  );
}

/** Tab icons take an `active` flag: the stroke thickens instead of the tab
 *  growing a top rule, which is how native tab bars signal selection. */
type TabIconProps = { className?: string; active?: boolean };

const sw = (active?: boolean) => (active ? 2 : 1.6);

/** Inicio */
export function HomeIcon({ className, active }: TabIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(active)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 11.2 12 4l8.5 7.2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.8 10v9.2h4.4V14h3.6v5.2h4.4V10" />
    </svg>
  );
}

/** Movimientos */
export function LinesIcon({ className, active }: TabIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(active)}>
      <path strokeLinecap="round" d="M4 7h16M4 12h10.5M4 17h16" />
    </svg>
  );
}

/** Cuentas */
export function WalletIcon({ className, active }: TabIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(active)}>
      <path strokeLinejoin="round" d="M3.2 7.2h17.6v12.4H3.2z" />
      <path d="M3.2 11h17.6" />
      <circle cx="17" cy="15.4" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Categorías */
export function GridIcon({ className, active }: TabIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(active)}>
      <path strokeLinejoin="round" d="M4 4h6.4v6.4H4zM13.6 4H20v6.4h-6.4zM4 13.6h6.4V20H4zM13.6 13.6H20V20h-6.4z" />
    </svg>
  );
}

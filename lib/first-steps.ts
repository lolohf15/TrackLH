/**
 * The "Primeros pasos" checklist on Inicio. Nothing here is ticked by hand:
 * every step reads as done once the data it asks for exists, so doing the
 * thing anywhere in the app (the Wallet, Perfil, the + button) counts.
 */

/** What the server knows; see `GET /api/onboarding/progress`. */
export interface FirstStepsProgress {
  dismissed: boolean;
  hasMovement: boolean;
  /** Any account carries a starting balance or a balance adjustment. */
  hasBalance: boolean;
  creditAccounts: number;
  /** Every credit card has its statement and due day. */
  creditConfigured: boolean;
  hasBudget: boolean;
  hasRecurring: boolean;
}

/** What only the device knows. */
export interface FirstStepsDevice {
  /** iPhone or iPad, where installing is a manual trip through Safari. */
  ios: boolean;
  /** Opened from the home screen rather than a browser tab. */
  standalone: boolean;
}

export type FirstStepId =
  | "account"
  | "movement"
  | "install"
  | "balances"
  | "card"
  | "budget"
  | "recurring";

export interface FirstStep {
  id: FirstStepId;
  done: boolean;
}

/**
 * The steps in the order they pay off: the account and the first movement
 * come first (and are usually already done by the time the card shows, which
 * is the point: a list that starts underway gets finished more often).
 * Steps that don't apply to this person are left out, not shown as done.
 */
export function buildFirstSteps(p: FirstStepsProgress, d: FirstStepsDevice): FirstStep[] {
  const steps: FirstStep[] = [
    { id: "account", done: true },
    { id: "movement", done: p.hasMovement },
  ];
  // Only iOS needs walking through it, and once it runs from the home screen
  // there's nothing left to say.
  if (d.ios || d.standalone) steps.push({ id: "install", done: d.standalone });
  steps.push({ id: "balances", done: p.hasBalance });
  if (p.creditAccounts > 0) steps.push({ id: "card", done: p.creditConfigured });
  steps.push({ id: "budget", done: p.hasBudget });
  steps.push({ id: "recurring", done: p.hasRecurring });
  return steps;
}

/** The first step still to do, which the card opens up. */
export function nextStep(steps: FirstStep[]): FirstStep | null {
  return steps.find((s) => !s.done) ?? null;
}

/** iPadOS reports itself as a Mac; the touch points give it away. */
export function detectDevice(nav: Navigator | undefined, standaloneQuery: boolean): FirstStepsDevice {
  if (!nav) return { ios: false, standalone: false };
  const ua = nav.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
  const standalone =
    standaloneQuery || (nav as Navigator & { standalone?: boolean }).standalone === true;
  return { ios, standalone };
}

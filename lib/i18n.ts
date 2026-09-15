import { es, en, type Dictionary } from "./dictionary";

export type Lang = "es" | "en";

export const LANG_KEY = "tracklh-lang";

/**
 * Deliberately free of React: `app/layout.tsx` is a Server Component and
 * imports the boot script from here, so a hook anywhere in this module would
 * pull a client-only API into the server graph and fail the build. The hooks
 * live in `lib/i18n-react.ts`.
 */
export const DICTIONARIES: Record<Lang, Dictionary> = { es, en };

/** What `Intl` should format dates and money with, per language. */
const LOCALES: Record<Lang, string> = { es: "es-MX", en: "en-US" };

/**
 * Inlined into <head> and run before first paint, like the theme's. Spanish
 * is the default, so only a saved English preference has to be applied —
 * and `lang` on the root element is where it belongs anyway: screen readers
 * and the browser's own translation prompt both read it.
 */
export const LANG_BOOT_SCRIPT = `
try {
  if (localStorage.getItem("${LANG_KEY}") === "en") {
    document.documentElement.setAttribute("lang", "en");
  }
} catch (e) {}
`.trim();

const listeners = new Set<() => void>();

export function subscribeToLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Reads what's on the element, which the boot script already settled. */
export function currentLang(): Lang {
  return document.documentElement.getAttribute("lang") === "en" ? "en" : "es";
}

/** Server render has no element to read, and Spanish is the default. */
export function serverLang(): Lang {
  return "es";
}

export function applyLang(lang: Lang): void {
  document.documentElement.setAttribute("lang", lang);

  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Private mode, or storage denied. The choice still holds for this visit.
  }

  for (const listener of listeners) listener();
}

export function localeFor(lang: Lang): string {
  return LOCALES[lang];
}

/**
 * For the formatters in `lib/utils.ts`, which are plain functions called from
 * dozens of places rather than hooks. Reading the element keeps their
 * signatures intact; on the server there's no element and Spanish wins, which
 * hydration then corrects along with everything else.
 */
export function currentLocale(): string {
  if (typeof document === "undefined") return LOCALES.es;
  return LOCALES[currentLang()];
}

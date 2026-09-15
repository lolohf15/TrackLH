"use client";

import { useSyncExternalStore } from "react";
import type { Dictionary } from "./dictionary";
import {
  DICTIONARIES,
  currentLang,
  localeFor,
  serverLang,
  subscribeToLang,
  type Lang,
} from "./i18n";

/**
 * The React half of the language store, kept apart from `lib/i18n.ts` so the
 * Server Component that inlines the boot script never pulls a client-only
 * hook into its module graph.
 */
export function useLang(): Lang {
  return useSyncExternalStore(subscribeToLang, currentLang, serverLang);
}

/** The strings for the current language. */
export function useT(): Dictionary {
  return DICTIONARIES[useLang()];
}

/** The BCP 47 tag for the current language, for `Intl` formatters. */
export function useLocale(): string {
  return localeFor(useLang());
}

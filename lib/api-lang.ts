import { cookies } from "next/headers";
import { DICTIONARIES, LANG_COOKIE, type Lang } from "./i18n";

/**
 * The language a route handler should answer in.
 *
 * Server-only: this reads request cookies and must never be imported from a
 * client component. The cookie is written before first paint by the boot
 * script in `lib/i18n.ts`, so it is already there on a visitor's very first
 * request — including the one that registers them, which happens before
 * there is any session to hang a preference off.
 */
export async function apiMessages() {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  const lang: Lang = value === "en" ? "en" : "es";
  return DICTIONARIES[lang].api;
}

export type ApiMessages = Awaited<ReturnType<typeof apiMessages>>;

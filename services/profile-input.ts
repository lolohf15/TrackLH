/**
 * The one gate every profile write goes through. Each field is optional: a
 * PATCH changes only what it names, and `null` puts a preference back to the
 * app's default. Pure, so the rules are tested without a database.
 */
export const TRANSACTION_TYPES = ["Gasto", "Ingreso", "Transferencia"] as const;
export const ANALYTICS_PERIODS = ["week", "month", "year"] as const;

export interface ProfileUpdate {
  name?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  defaultAccount?: string | null;
  defaultType?: (typeof TRANSACTION_TYPES)[number] | null;
  weekStart?: 0 | 1 | null;
  analyticsPeriod?: (typeof ANALYTICS_PERIODS)[number] | null;
  theme?: "dark" | "light" | null;
  language?: "es" | "en" | null;
}

export type ProfileField = keyof ProfileUpdate;

type Result = { ok: true; data: ProfileUpdate } | { ok: false; field: ProfileField | null };

const MAX_NAME = 60;

/** One grapheme that's an emoji (flags, skin tones and ZWJ families included). */
export function isSingleEmoji(value: string): boolean {
  const segments = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value));
  return segments.length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value);
}

export function parseProfileUpdate(body: unknown, accounts: string[]): Result {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, field: null };
  const raw = body as Record<string, unknown>;
  const out: ProfileUpdate = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(raw, k);
  const oneOf = <T extends string | number>(value: unknown, allowed: readonly T[]): value is T =>
    allowed.includes(value as T);

  if (has("name")) {
    const v = raw.name;
    if (v === null) out.name = null;
    else if (typeof v === "string" && v.trim().length <= MAX_NAME) out.name = v.trim().replace(/\s+/g, " ") || null;
    else return { ok: false, field: "name" };
  }
  if (has("avatarEmoji")) {
    const v = raw.avatarEmoji;
    if (v === null || v === "") out.avatarEmoji = null;
    else if (typeof v === "string" && isSingleEmoji(v.trim())) out.avatarEmoji = v.trim();
    else return { ok: false, field: "avatarEmoji" };
  }
  if (has("avatarColor")) {
    const v = raw.avatarColor;
    if (v === null) out.avatarColor = null;
    else if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) out.avatarColor = v.toLowerCase();
    else return { ok: false, field: "avatarColor" };
  }
  if (has("defaultAccount")) {
    const v = raw.defaultAccount;
    // Only one of the person's own accounts, as they're named now.
    if (v === null) out.defaultAccount = null;
    else if (typeof v === "string" && accounts.includes(v)) out.defaultAccount = v;
    else return { ok: false, field: "defaultAccount" };
  }
  if (has("defaultType")) {
    const v = raw.defaultType;
    if (v === null || oneOf(v, TRANSACTION_TYPES)) out.defaultType = v;
    else return { ok: false, field: "defaultType" };
  }
  if (has("weekStart")) {
    const v = raw.weekStart;
    if (v === null || v === 0 || v === 1) out.weekStart = v;
    else return { ok: false, field: "weekStart" };
  }
  if (has("analyticsPeriod")) {
    const v = raw.analyticsPeriod;
    if (v === null || oneOf(v, ANALYTICS_PERIODS)) out.analyticsPeriod = v;
    else return { ok: false, field: "analyticsPeriod" };
  }
  if (has("theme")) {
    const v = raw.theme;
    if (v === null || v === "dark" || v === "light") out.theme = v;
    else return { ok: false, field: "theme" };
  }
  if (has("language")) {
    const v = raw.language;
    if (v === null || v === "es" || v === "en") out.language = v;
    else return { ok: false, field: "language" };
  }
  return { ok: true, data: out };
}

/** "Lorenzo Herrera" → "LH"; one word → its first two letters; nothing → "". */
export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email ?? "").slice(0, 1).toUpperCase();
}

/** The first word of the name, for "Hola, Lorenzo". */
export function firstName(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || null;
}

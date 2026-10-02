/**
 * Keystroke rules for the amount field, shared by the on-screen keypad and a
 * desktop keyboard. Pure, so it can be tested without a DOM.
 */

/** What the keypad shows for each operator, and what it appends to the text. */
export const OPERATORS = [
  { glyph: "+", insert: "+" },
  { glyph: "−", insert: "−" },
  { glyph: "×", insert: "×" },
  { glyph: "÷", insert: "÷" },
] as const;

/** Keeps a typed amount sane before the parser ever sees it. */
const MAX_INPUT = 40;

/**
 * Append one key to the expression, refusing the inputs that could only ever
 * make it invalid: two operators in a row (the new one replaces the old), an
 * operator first, a second decimal point in the same number, more than two
 * decimals. What's left either parses or is a half-typed expression.
 */
export function pressKey(current: string, key: string): string {
  if (current.length >= MAX_INPUT) return current;
  const isOp = OPERATORS.some((o) => o.insert === key);
  const last = current.slice(-1);
  const lastIsOp = OPERATORS.some((o) => o.insert === last);
  const currentNumber = current.split(/[+−×÷]/).pop() ?? "";

  if (isOp) {
    if (current === "") return current;
    if (lastIsOp) return current.slice(0, -1) + key;
    if (last === ".") return current.slice(0, -1) + key;
    return current + key;
  }

  if (key === ".") {
    if (currentNumber.includes(".")) return current;
    return current + (currentNumber === "" ? "0." : ".");
  }

  // Cents stop at two places; a third digit would be thrown away on save.
  if (/\.\d{2}$/.test(currentNumber)) return current;
  // "05" reads as a typo; replace a lone leading zero instead of padding it.
  if (currentNumber === "0") return current.slice(0, -1) + key;
  return current + key;
}

/** A physical key, translated to what the keypad would have typed. Null ignores it. */
export function keyFromKeyboard(key: string): string | null {
  if (/^\d$/.test(key)) return key;
  if (key === "." || key === ",") return ".";
  const map: Record<string, string> = { "+": "+", "-": "−", "*": "×", x: "×", "/": "÷" };
  return map[key] ?? null;
}

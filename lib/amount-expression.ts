/**
 * The amount field accepts a little arithmetic — `120+45.5`, `3*89`,
 * `(250-30)/2` — so a split bill or a few items can be typed as they are
 * instead of added up in your head first. Evaluated by a small recursive
 * descent parser; nothing here ever reaches `eval` or `new Function`.
 *
 * Grammar:
 *   expr   := term (("+" | "-") term)*
 *   term   := factor (("*" | "/") factor)*
 *   factor := ("+" | "-") factor | number | "(" expr ")"
 */

type Token =
  | { kind: "num"; value: number }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" };

/** The glyphs the keypad shows, mapped to what the parser reads. */
const OPERATOR_ALIASES: Record<string, "+" | "-" | "*" | "/"> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "*": "*",
  "×": "*",
  "x": "*",
  "/": "/",
  "÷": "/",
};

/** Long enough for any honest receipt, short enough to keep parsing trivial. */
const MAX_LENGTH = 64;

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === " ") {
      i++;
      continue;
    }

    if (/[\d.,]/.test(ch)) {
      let raw = "";
      while (i < input.length && /[\d.,]/.test(input[i])) raw += input[i++];
      // Comma and dot both mean the decimal point — there are no thousands
      // separators in something you type by hand — and only one is allowed.
      const normalized = raw.replace(",", ".");
      if (!/^(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
      tokens.push({ kind: "num", value: Number(normalized) });
      continue;
    }

    const op = OPERATOR_ALIASES[ch];
    if (op) {
      tokens.push({ kind: "op", value: op });
      i++;
      continue;
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ kind: "paren", value: ch });
      i++;
      continue;
    }

    return null;
  }

  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): number | null {
    const value = this.expr();
    if (value === null || this.pos !== this.tokens.length) return null;
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private expr(): number | null {
    let left = this.term();
    while (left !== null) {
      const t = this.peek();
      if (t?.kind !== "op" || (t.value !== "+" && t.value !== "-")) break;
      this.pos++;
      const right = this.term();
      if (right === null) return null;
      left = t.value === "+" ? left + right : left - right;
    }
    return left;
  }

  private term(): number | null {
    let left = this.factor();
    while (left !== null) {
      const t = this.peek();
      if (t?.kind !== "op" || (t.value !== "*" && t.value !== "/")) break;
      this.pos++;
      const right = this.factor();
      if (right === null) return null;
      if (t.value === "/" && right === 0) return null;
      left = t.value === "*" ? left * right : left / right;
    }
    return left;
  }

  private factor(): number | null {
    const t = this.peek();
    if (!t) return null;

    if (t.kind === "op" && (t.value === "+" || t.value === "-")) {
      this.pos++;
      const inner = this.factor();
      if (inner === null) return null;
      return t.value === "-" ? -inner : inner;
    }

    if (t.kind === "num") {
      this.pos++;
      return t.value;
    }

    if (t.kind === "paren" && t.value === "(") {
      this.pos++;
      const inner = this.expr();
      const close = this.peek();
      if (inner === null || close?.kind !== "paren" || close.value !== ")") return null;
      this.pos++;
      return inner;
    }

    return null;
  }
}

/**
 * The value of what was typed, rounded to cents, or null when it doesn't
 * parse, divides by zero, or isn't a finite number. A bare `"165.5"` is an
 * expression too, so this is the one way the form reads the field.
 */
export function evaluateAmount(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_LENGTH) return null;

  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length === 0) return null;

  const value = new Parser(tokens).parse();
  if (value === null || !Number.isFinite(value)) return null;

  // Round half away from zero at the cent, without the binary drift that
  // makes Math.round(1.005 * 100) land on 100.
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** True when the text has arithmetic in it, so a "= $…" preview is worth showing. */
export function isExpression(input: string): boolean {
  return /\d\s*[-+*/×÷−x]\s*[\d(.]|[()]/.test(input.trim());
}

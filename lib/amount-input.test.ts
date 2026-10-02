import { describe, expect, it } from "vitest";
import { keyFromKeyboard, pressKey } from "./amount-input";
import { evaluateAmount } from "./amount-expression";

function type(keys: string[]): string {
  return keys.reduce(pressKey, "");
}

describe("pressKey", () => {
  it("builds an expression the parser accepts", () => {
    const text = type(["1", "2", "0", "+", "4", "5", ".", "5"]);
    expect(text).toBe("120+45.5");
    expect(evaluateAmount(text)).toBe(165.5);
  });

  it("refuses an operator first", () => {
    expect(type(["×", "5"])).toBe("5");
  });

  it("replaces an operator instead of stacking two", () => {
    expect(type(["5", "+", "×", "2"])).toBe("5×2");
  });

  it("allows one decimal point per number", () => {
    expect(type(["1", ".", "5", ".", "2"])).toBe("1.52");
    expect(type(["1", ".", "5", "+", "2", ".", "5"])).toBe("1.5+2.5");
  });

  it("starts a bare decimal with a zero", () => {
    expect(type([".", "5"])).toBe("0.5");
    expect(type(["3", "+", ".", "5"])).toBe("3+0.5");
  });

  it("stops at two decimals", () => {
    expect(type(["9", ".", "9", "9", "9"])).toBe("9.99");
  });

  it("drops a dangling decimal point when an operator follows", () => {
    expect(type(["7", ".", "+", "1"])).toBe("7+1");
  });

  it("replaces a lone leading zero", () => {
    expect(type(["0", "5"])).toBe("5");
    expect(type(["0", ".", "0", "5"])).toBe("0.05");
  });
});

describe("keyFromKeyboard", () => {
  it("maps a desktop keyboard onto the keypad", () => {
    expect(keyFromKeyboard("7")).toBe("7");
    expect(keyFromKeyboard(",")).toBe(".");
    expect(keyFromKeyboard("-")).toBe("−");
    expect(keyFromKeyboard("*")).toBe("×");
    expect(keyFromKeyboard("/")).toBe("÷");
    expect(keyFromKeyboard("a")).toBeNull();
  });
});

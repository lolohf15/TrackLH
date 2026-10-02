import { describe, expect, it } from "vitest";
import { evaluateAmount, isExpression } from "./amount-expression";

describe("evaluateAmount", () => {
  it.each([
    ["120", 120],
    ["165.5", 165.5],
    ["165,5", 165.5],
    [".5", 0.5],
    ["7.", 7],
    ["120+45.5", 165.5],
    ["3*89", 267],
    ["(250-30)/2", 110],
    ["2+3*4", 14],
    ["(2+3)*4", 20],
    ["10-2-3", 5],
    ["100/4/5", 5],
    ["-5+20", 15],
    ["-(3+2)", -5],
    ["10/3", 3.33],
    ["2/3", 0.67],
    ["1.005", 1.01],
    ["0.1+0.2", 0.3],
    ["99,90 + 0,10", 100],
    ["12×3", 36],
    ["90÷4", 22.5],
    ["50−20", 30],
  ])("%s = %s", (input, expected) => {
    expect(evaluateAmount(input)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    ["5+"],
    ["*5"],
    ["2/0"],
    ["(2-2)/(1-1)"],
    ["(1+2"],
    ["1+2)"],
    ["()"],
    ["1..2"],
    ["1.2.3"],
    ["1,2,3"],
    ["abc"],
    ["2+a"],
    ["1e5"],
    ["alert(1)"],
    ["9".repeat(65)],
  ])("rejects %j", (input) => {
    expect(evaluateAmount(input)).toBeNull();
  });
});

describe("isExpression", () => {
  it("is false for a plain number", () => {
    expect(isExpression("120")).toBe(false);
    expect(isExpression("120.50")).toBe(false);
    expect(isExpression("")).toBe(false);
  });

  it("is true once there is arithmetic", () => {
    expect(isExpression("120+4")).toBe(true);
    expect(isExpression("3×8")).toBe(true);
    expect(isExpression("(2")).toBe(true);
  });

  it("waits for the second operand before calling it an expression", () => {
    expect(isExpression("120+")).toBe(false);
  });
});

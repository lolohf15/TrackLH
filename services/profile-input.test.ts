import { describe, expect, it } from "vitest";
import { firstName, initialsOf, isSingleEmoji, parseProfileUpdate } from "./profile-input";

const accounts = ["Nu Crédito", "BBVA Débito"];

describe("parseProfileUpdate", () => {
  it("keeps only what was sent, tidied", () => {
    expect(parseProfileUpdate({ name: "  Lorenzo   Herrera " }, accounts)).toEqual({ ok: true, data: { name: "Lorenzo Herrera" } });
    expect(parseProfileUpdate({ weekStart: 0, theme: "light" }, accounts)).toEqual({ ok: true, data: { weekStart: 0, theme: "light" } });
  });

  it("lets null put a preference back to the default", () => {
    expect(parseProfileUpdate({ defaultAccount: null, avatarEmoji: "" }, accounts)).toEqual({
      ok: true,
      data: { defaultAccount: null, avatarEmoji: null },
    });
  });

  it("refuses accounts that aren't the person's and values outside the lists", () => {
    expect(parseProfileUpdate({ defaultAccount: "Someone else" }, accounts)).toEqual({ ok: false, field: "defaultAccount" });
    expect(parseProfileUpdate({ defaultType: "Robo" }, accounts)).toEqual({ ok: false, field: "defaultType" });
    expect(parseProfileUpdate({ weekStart: 3 }, accounts)).toEqual({ ok: false, field: "weekStart" });
    expect(parseProfileUpdate({ avatarColor: "red" }, accounts)).toEqual({ ok: false, field: "avatarColor" });
    expect(parseProfileUpdate({ name: "x".repeat(61) }, accounts)).toEqual({ ok: false, field: "name" });
    expect(parseProfileUpdate(null, accounts)).toEqual({ ok: false, field: null });
  });
});

describe("isSingleEmoji", () => {
  it("takes one emoji, families and flags included, and nothing else", () => {
    expect(isSingleEmoji("🦊")).toBe(true);
    expect(isSingleEmoji("👨‍👩‍👧")).toBe(true);
    expect(isSingleEmoji("🇲🇽")).toBe(true);
    expect(isSingleEmoji("🦊🦊")).toBe(false);
    expect(isSingleEmoji("A")).toBe(false);
    expect(isSingleEmoji("<b>")).toBe(false);
  });
});

describe("initialsOf / firstName", () => {
  it("reads names the way people write them", () => {
    expect(initialsOf("Lorenzo Herrera")).toBe("LH");
    expect(initialsOf("lorenzo")).toBe("LO");
    expect(initialsOf("", "qa@example.com")).toBe("Q");
    expect(firstName(" Lorenzo Herrera ")).toBe("Lorenzo");
    expect(firstName(null)).toBeNull();
  });
});

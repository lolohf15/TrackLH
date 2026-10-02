import { describe, expect, it } from "vitest";
import { CATEGORY_ICON_KEYS, isCategoryIconKey, suggestCategoryIcon } from "./category-icons";
import { EXPENSE_CATEGORY_PRESETS, INCOME_CATEGORY_PRESETS } from "@/services/presets";

describe("suggestCategoryIcon", () => {
  it.each([
    ["Alimentos", "food"],
    ["Comida fuera (Amex)", "food"],
    ["Comidas Tec (Amex)", "food"],
    ["Gas", "gas"],
    ["Gasolina (Amex)", "gas"],
    ["Gastos varios", "other"],
    ["Esenciales", "essentials"],
    ["Gustos", "treats"],
    ["Regalos", "gifts"],
    ["Salidas", "bars"],
    ["Salud", "health"],
    ["Servicios", "utilities"],
    ["Suscripciones", "subscriptions"],
    ["Transporte", "transport"],
    ["Renta", "home"],
    ["Barbería", "beauty"],
    ["Tecnología", "tech"],
    ["Colegiatura Tec", "education"],
    ["Café", "coffee"],
    ["Súper", "groceries"],
    ["Sueldo", "salary"],
    ["Extra Cash", "cash"],
    ["Dinero Mes", "cash"],
    ["Reembolso", "refunds"],
    ["Otro", "other"],
    ["Cosas raras", "other"],
  ])("%s → %s", (name, key) => {
    expect(suggestCategoryIcon(name)).toBe(key);
  });

  it("gives every preset a real icon, never the fallback, except Otro", () => {
    for (const preset of [...EXPENSE_CATEGORY_PRESETS, ...INCOME_CATEGORY_PRESETS]) {
      const key = suggestCategoryIcon(preset.name);
      expect(isCategoryIconKey(key)).toBe(true);
      if (preset.name !== "Otro") expect(key, preset.name).not.toBe("other");
    }
  });
});

describe("CATEGORY_ICON_KEYS", () => {
  it("has no duplicates", () => {
    expect(new Set(CATEGORY_ICON_KEYS).size).toBe(CATEGORY_ICON_KEYS.length);
  });
});

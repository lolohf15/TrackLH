/**
 * Starting points offered during the welcome wizard. These are suggestions a
 * new user picks from, never runtime truth — once onboarding writes them, the
 * database is the only source for accounts and categories.
 */

export interface AccountPreset {
  account: string;
  isCredit: boolean;
  color: string;
}

/** Common Mexican banks, plus the two everyone has regardless. */
export const ACCOUNT_PRESETS: AccountPreset[] = [
  { account: "Efectivo",        isCredit: false, color: "#6b7075" },
  { account: "BBVA Débito",     isCredit: false, color: "#5b7fb5" },
  { account: "Nu Débito",       isCredit: false, color: "#d99a15" },
  { account: "Santander",       isCredit: false, color: "#e5484d" },
  { account: "Banorte",         isCredit: false, color: "#d2452e" },
  { account: "HSBC",            isCredit: false, color: "#c2547a" },
  { account: "Banamex",         isCredit: false, color: "#3a8f95" },
  { account: "Revolut Débito",  isCredit: false, color: "#3a8f95" },
  { account: "Mercado Pago",    isCredit: false, color: "#5b7fb5" },
  { account: "Inversiones",     isCredit: false, color: "#4f9d5f" },
  { account: "Nu Crédito",      isCredit: true,  color: "#8b5cd9" },
  { account: "BBVA Crédito",    isCredit: true,  color: "#5b7fb5" },
  { account: "Revolut",         isCredit: true,  color: "#e5484d" },
];

export interface CategoryPreset {
  name: string;
  color: string;
  /** Suggested monthly budget, in MXN. Zero means "no budget suggested". */
  budget: number;
}

export const EXPENSE_CATEGORY_PRESETS: CategoryPreset[] = [
  { name: "Alimentos",  color: "#e0703a", budget: 3000 },
  { name: "Transporte", color: "#8b5cd9", budget: 1500 },
  { name: "Salidas",    color: "#d2452e", budget: 1500 },
  { name: "Servicios",  color: "#3a8f95", budget: 1000 },
  { name: "Esenciales", color: "#4f9d5f", budget: 1000 },
  { name: "Gustos",     color: "#d99a15", budget: 800 },
  { name: "Salud",      color: "#5b7fb5", budget: 500 },
  { name: "Regalos",    color: "#c2547a", budget: 500 },
  { name: "Renta",      color: "#a3a3a3", budget: 0 },
  { name: "Suscripciones", color: "#c2547a", budget: 300 },
  { name: "Otro",       color: "#6b7075", budget: 300 },
];

/** Income categories are not budgeted, so they carry no amount. */
export const INCOME_CATEGORY_PRESETS: CategoryPreset[] = [
  { name: "Sueldo",     color: "#22a355", budget: 0 },
  { name: "Extra Cash", color: "#4f9d5f", budget: 0 },
  { name: "Reembolso",  color: "#3a8f95", budget: 0 },
  { name: "Otro",       color: "#6b7075", budget: 0 },
];

/** What the "usar sugerencias" shortcut applies. */
export const SUGGESTED_ACCOUNTS = ["Efectivo", "BBVA Débito", "Nu Crédito"];
export const SUGGESTED_EXPENSE_CATEGORIES = [
  "Alimentos", "Transporte", "Salidas", "Servicios", "Esenciales", "Otro",
];
export const SUGGESTED_INCOME_CATEGORIES = ["Sueldo", "Otro"];

/** A stable palette to hand out when a user names a category of their own. */
export const CUSTOM_COLOR_CYCLE = [
  "#e0703a", "#8b5cd9", "#3a8f95", "#d99a15", "#c2547a",
  "#4f9d5f", "#5b7fb5", "#d2452e", "#6b7075",
];

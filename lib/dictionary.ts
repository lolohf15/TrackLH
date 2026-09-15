/**
 * Every user-facing string, side by side so a missing translation is visible
 * while writing rather than at runtime. `en` is typed against `es`, so
 * TypeScript refuses to compile if a key is forgotten or misspelled.
 *
 * Screens are migrated here as the redesign rewrites them — extracting all of
 * them up front would mean writing each string twice, since F5–F8 replace
 * Analytics, Wallet, Perfil and Inicio anyway.
 */
export const es = {
  nav: {
    home: "Inicio",
    analytics: "Analytics",
    wallet: "Wallet",
    profile: "Perfil",
  },

  profile: {
    title: "Perfil",
    theme: "Tema",
    dark: "Oscuro",
    light: "Claro",
    language: "Idioma",
    spanish: "Español",
    english: "Inglés",
    manage: "Administrar",
    accounts: "Cuentas",
    accountsHint: "Saldos, límites y ajustes",
    categories: "Categorías",
    categoriesHint: "Nombres, colores y presupuestos",
    session: "Sesión",
    signOut: "Cerrar sesión",
    signingOut: "Saliendo…",
  },

  /**
   * Movement types are stored in Spanish and the business rules compare
   * against those exact strings, so this map is display only — never write
   * a translated value back to the database.
   */
  txType: {
    Gasto: "Gasto",
    Ingreso: "Ingreso",
    Transferencia: "Transferencia",
  },

  home: {
    title: "Resumen",
    totalBalance: "Saldo total",
    /** Takes the count, because plural and word order aren't the same twice. */
    debitAccounts: (n: number) => `${n} ${n === 1 ? "cuenta" : "cuentas"} de débito`,
    income: "Ingresos",
    expenses: "Gastos",
    monthlySavings: "Ahorro del mes",
    recentActivity: "Actividad reciente",
    seeAll: "Ver todo",
    budget: "Presupuesto",
    emptyTitle: "Aún no hay movimientos",
    emptyHint: "Toca el botón + para registrar tu primer gasto o ingreso",
    prevMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
  },

  actions: {
    edit: "Editar",
    delete: "Eliminar",
  },

  dates: {
    today: "Hoy",
    yesterday: "Ayer",
  },

  addRecord: "Agregar movimiento",
};

export const en: typeof es = {
  nav: {
    home: "Home",
    analytics: "Analytics",
    wallet: "Wallet",
    profile: "Profile",
  },

  profile: {
    title: "Profile",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    language: "Language",
    spanish: "Spanish",
    english: "English",
    manage: "Manage",
    accounts: "Accounts",
    accountsHint: "Balances, limits and adjustments",
    categories: "Categories",
    categoriesHint: "Names, colors and budgets",
    session: "Session",
    signOut: "Sign out",
    signingOut: "Signing out…",
  },

  txType: {
    Gasto: "Expense",
    Ingreso: "Income",
    Transferencia: "Transfer",
  },

  home: {
    title: "Overview",
    totalBalance: "Total balance",
    debitAccounts: (n: number) => `${n} debit ${n === 1 ? "account" : "accounts"}`,
    income: "Income",
    expenses: "Expenses",
    monthlySavings: "Saved this month",
    recentActivity: "Recent activity",
    seeAll: "See all",
    budget: "Budget",
    emptyTitle: "No movements yet",
    emptyHint: "Tap the + button to log your first expense or income",
    prevMonth: "Previous month",
    nextMonth: "Next month",
  },

  actions: {
    edit: "Edit",
    delete: "Delete",
  },

  dates: {
    today: "Today",
    yesterday: "Yesterday",
  },

  addRecord: "Add movement",
};

export type Dictionary = typeof es;

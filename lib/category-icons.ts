/**
 * The icon vocabulary for categories. The database stores one of these keys,
 * never an SVG and never a library's own icon name, so swapping the icon set
 * later is a change to one map in `components/ui/CategoryIcon.tsx` instead of
 * a data migration. React-free on purpose: the presets, the export and the
 * SQL backfill all read it.
 */

export const CATEGORY_ICON_KEYS = [
  // Food and going out
  "groceries", "food", "coffee", "bars", "treats",
  // Getting around
  "transport", "car", "gas", "travel",
  // Home and bills
  "home", "utilities", "electricity", "water", "phone", "internet", "subscriptions",
  "bills", "essentials", "repairs",
  // Body and mind
  "health", "pharmacy", "gym", "beauty", "education", "books",
  // Things
  "shopping", "clothes", "gifts", "tech", "pets", "baby",
  // Fun
  "entertainment", "games", "music",
  // Money in
  "salary", "freelance", "cash", "investments", "savings", "refunds",
  // Money around
  "card", "bank", "transfer", "other",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
  return typeof value === "string" && (CATEGORY_ICON_KEYS as readonly string[]).includes(value);
}

/**
 * Words that point at an icon, checked against a category's name with accents
 * and case stripped. Order matters: the first rule that matches wins, so the
 * specific ones ("gasolina") sit before the broad ones ("comida").
 */
const NAME_RULES: Array<[CategoryIconKey, string[]]> = [
  ["gas", ["gasolina", "gas$", "fuel", "combustible"]],
  ["groceries", ["super", "despensa", "grocer", "mandado"]],
  ["coffee", ["cafe", "coffee", "starbucks"]],
  ["beauty", ["belleza", "beauty", "corte", "barber", "estetica", "cuidado personal"]],
  ["bars", ["salida", "bar$", "bares", "antro", "fiesta", "drinks", "party", "nightlife"]],
  ["food", ["comida", "alimento", "restaurant", "food", "lunch", "cena", "dinner", "desayuno"]],
  ["treats", ["gusto", "antojo", "treat", "capricho"]],
  ["subscriptions", ["suscrip", "subscri", "netflix", "spotify", "streaming"]],
  ["electricity", ["luz", "electric", "cfe"]],
  ["water", ["agua", "water"]],
  ["phone", ["celular", "telefono", "phone", "plan movil"]],
  ["internet", ["internet", "wifi"]],
  ["utilities", ["servicio", "utilit"]],
  ["home", ["renta", "rent", "casa", "hogar", "home", "hipoteca", "mortgage"]],
  ["essentials", ["esencial", "essential", "basico"]],
  ["transport", ["transporte", "transport", "uber", "didi", "taxi", "metro", "camion", "bus$"]],
  ["car", ["auto", "carro", "coche", "car$", "estacionamiento", "parking"]],
  ["travel", ["viaje", "travel", "vuelo", "flight", "hotel", "vacacion"]],
  ["pharmacy", ["farmacia", "medicina", "pharmacy", "medicine"]],
  ["health", ["salud", "health", "doctor", "medico", "dentista", "hospital"]],
  ["gym", ["gym", "gimnasio", "deporte", "sport", "fitness"]],
  ["tech", ["tecnologia", "tech", "electronica", "gadget"]],
  ["education", ["escuela", "colegiatura", "educacion", "education", "school", "curso", "universidad", "tec$"]],
  ["books", ["libro", "book"]],
  ["clothes", ["ropa", "clothes", "clothing", "zapato", "shoes"]],
  ["gifts", ["regalo", "gift"]],
  ["pets", ["mascota", "pet$", "pets", "perro", "gato", "veterinari"]],
  ["baby", ["bebe", "baby", "hijo", "kids", "ninos"]],
  ["entertainment", ["entretenimiento", "entertainment", "cine", "movie", "concierto", "concert"]],
  ["games", ["juego", "game", "videojuego"]],
  ["music", ["musica", "music"]],
  ["shopping", ["compra", "shopping", "amazon", "tienda"]],
  ["repairs", ["reparacion", "mantenimiento", "repair", "maintenance"]],
  ["bills", ["recibo", "factura", "bill", "impuesto", "tax$", "seguro", "insurance"]],
  ["salary", ["sueldo", "salario", "nomina", "salary", "payroll", "paycheck"]],
  ["freelance", ["freelance", "honorario", "proyecto", "cliente", "side$"]],
  ["cash", ["extra", "dinero", "mesada", "efectivo", "cash", "allowance", "bono", "bonus"]],
  ["investments", ["inversion", "invest", "rendimiento", "dividend", "interes"]],
  ["savings", ["ahorro", "saving"]],
  ["refunds", ["reembolso", "devolucion", "refund", "reintegro"]],
  ["card", ["tarjeta", "card", "credito"]],
  ["transfer", ["transferencia", "transfer"]],
];

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * A rule word matches at the start of a word, so "servicio" covers
 * "Servicios". A trailing `$` makes it a whole word instead, which is what
 * keeps "gas$" from lighting up inside "Gastos" or "tec$" inside "tecnología".
 */
function mentions(haystack: string, word: string): boolean {
  const whole = word.endsWith("$");
  const stem = whole ? word.slice(0, -1) : word;
  return new RegExp(`(^|[^a-z])${stem}${whole ? "($|[^a-z])" : ""}`).test(haystack);
}

/** The best icon for a category name, or "other" when nothing matches. */
export function suggestCategoryIcon(name: string): CategoryIconKey {
  const n = normalize(name);
  for (const [key, words] of NAME_RULES) {
    if (words.some((w) => mentions(n, w))) return key;
  }
  return "other";
}

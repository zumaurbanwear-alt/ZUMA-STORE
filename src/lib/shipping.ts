import { SHIPPING_RATES, DEFAULT_SHIPPING_FEE } from "@/data/shippingRates";

/**
 * Normalizes a city string for comparison:
 * lowercase, strips accents, drops anything in parentheses/quotes
 * (region qualifiers like "( nador )" or "Région Agadir"), collapses
 * punctuation/whitespace.
 */
const normalize = (raw: string): string =>
  raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // drop "( nador )"
    .replace(/["'’][^"'’]*$/g, " ") // drop trailing quoted region e.g. "Région ..."
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Base name only, dropping anything after a " - " or " region " qualifier. */
const baseName = (raw: string): string => {
  const n = normalize(raw);
  return n.split(/\bregion\b/)[0].split(" - ").join(" ").split("-")[0].trim();
};

// Full-label lookup (exact normalized match, e.g. "mohammedia al massira")
const exactMap = new Map<string, number>();
// Base-name lookup (e.g. "azrou" -> first matching fee)
const baseMap = new Map<string, number>();

for (const { city, fee } of SHIPPING_RATES) {
  const full = normalize(city);
  if (!exactMap.has(full)) exactMap.set(full, fee);

  const base = baseName(city);
  if (!baseMap.has(base)) baseMap.set(base, fee);
}

/**
 * Returns the delivery fee (MAD) for a given city string typed by the customer.
 * Falls back to DEFAULT_SHIPPING_FEE when no match is found.
 */
export const getShippingFee = (cityInput: string): number => {
  if (!cityInput || !cityInput.trim()) return DEFAULT_SHIPPING_FEE;

  const full = normalize(cityInput);
  if (exactMap.has(full)) return exactMap.get(full)!;

  const base = baseName(cityInput);
  if (baseMap.has(base)) return baseMap.get(base)!;

  return DEFAULT_SHIPPING_FEE;
};

/** True when the typed city was found in the rate sheet (vs. using the fallback fee). */
export const isKnownCity = (cityInput: string): boolean => {
  if (!cityInput || !cityInput.trim()) return false;
  const full = normalize(cityInput);
  if (exactMap.has(full)) return true;
  return baseMap.has(baseName(cityInput));
};

/** Sorted, de-duplicated list of city labels — handy for an autocomplete/datalist. */
export const CITY_SUGGESTIONS: string[] = Array.from(
  new Set(SHIPPING_RATES.map(r => r.city))
).sort((a, b) => a.localeCompare(b));

export { DEFAULT_SHIPPING_FEE };

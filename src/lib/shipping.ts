/**
 * Delivery-fee lookup for Moroccan cities.
 *
 * The actual rate table (~450 entries) lives in @/data/shippingRates and is
 * loaded lazily via dynamic import so it doesn't bloat the main JS bundle
 * for every visitor — only pages that actually open the checkout dialog
 * pay for downloading it.
 */

// Small, cheap constant — safe to import statically everywhere.
export const DEFAULT_SHIPPING_FEE = 45;

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

export type ShippingLookup = {
  getShippingFee: (cityInput: string) => number;
  isKnownCity: (cityInput: string) => boolean;
  citySuggestions: string[];
};

const buildLookup = (rates: { city: string; fee: number }[]): ShippingLookup => {
  const exactMap = new Map<string, number>();
  const baseMap = new Map<string, number>();

  for (const { city, fee } of rates) {
    const full = normalize(city);
    if (!exactMap.has(full)) exactMap.set(full, fee);

    const base = baseName(city);
    if (!baseMap.has(base)) baseMap.set(base, fee);
  }

  const getShippingFee = (cityInput: string): number => {
    if (!cityInput || !cityInput.trim()) return DEFAULT_SHIPPING_FEE;
    const full = normalize(cityInput);
    if (exactMap.has(full)) return exactMap.get(full)!;
    const base = baseName(cityInput);
    if (baseMap.has(base)) return baseMap.get(base)!;
    return DEFAULT_SHIPPING_FEE;
  };

  const isKnownCity = (cityInput: string): boolean => {
    if (!cityInput || !cityInput.trim()) return false;
    const full = normalize(cityInput);
    if (exactMap.has(full)) return true;
    return baseMap.has(baseName(cityInput));
  };

  const citySuggestions = Array.from(new Set(rates.map(r => r.city))).sort((a, b) =>
    a.localeCompare(b)
  );

  return { getShippingFee, isKnownCity, citySuggestions };
};

let cached: Promise<ShippingLookup> | null = null;

/**
 * Loads (once, memoized) and returns the shipping lookup helpers.
 * The underlying rate table is fetched via dynamic import on first call,
 * so it's only downloaded when someone actually needs it (checkout open).
 */
export const loadShippingLookup = (): Promise<ShippingLookup> => {
  if (!cached) {
    cached = import("@/data/shippingRates").then(mod => buildLookup(mod.SHIPPING_RATES));
  }
  return cached;
};

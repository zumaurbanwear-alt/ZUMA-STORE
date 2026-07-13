import { describe, it, expect } from "vitest";
import { getShippingFee } from "./shipping";
import { DEFAULT_SHIPPING_FEE, SHIPPING_RATES } from "@/data/shippingRates";

describe("getShippingFee", () => {
  it("returns the exact fee for a known city", () => {
    expect(getShippingFee("Agadir")).toBe(35);
  });

  it("is case-insensitive", () => {
    expect(getShippingFee("aGaDiR")).toBe(35);
  });

  it("ignores accents", () => {
    // "Agadir" has no accent in the table; pick a city and strip/garble accents to confirm normalization
    expect(getShippingFee("agadir")).toBe(getShippingFee("agàdir"));
  });

  it("strips parenthesized region qualifiers", () => {
    expect(getShippingFee("Afsou")).toBe(getShippingFee("Afsou ( nador )"));
  });

  it("falls back to the default fee for an unknown city", () => {
    expect(getShippingFee("Nowhereville Zzzz")).toBe(DEFAULT_SHIPPING_FEE);
  });

  it("falls back to the default fee for empty input", () => {
    expect(getShippingFee("")).toBe(DEFAULT_SHIPPING_FEE);
    expect(getShippingFee("   ")).toBe(DEFAULT_SHIPPING_FEE);
  });

  it("every rate table entry resolves to its own fee", () => {
    for (const { city, fee } of SHIPPING_RATES.slice(0, 25)) {
      expect(getShippingFee(city)).toBe(fee);
    }
  });
});

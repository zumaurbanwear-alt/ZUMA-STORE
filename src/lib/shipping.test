import { describe, it, expect, beforeAll } from "vitest";
import { loadShippingLookup, DEFAULT_SHIPPING_FEE, type ShippingLookup } from "./shipping";
import { SHIPPING_RATES } from "@/data/shippingRates";

describe("getShippingFee", () => {
  let lookup: ShippingLookup;

  beforeAll(async () => {
    lookup = await loadShippingLookup();
  });

  it("returns the exact fee for a known city", () => {
    expect(lookup.getShippingFee("Agadir")).toBe(35);
  });

  it("is case-insensitive", () => {
    expect(lookup.getShippingFee("aGaDiR")).toBe(35);
  });

  it("ignores accents", () => {
    expect(lookup.getShippingFee("agadir")).toBe(lookup.getShippingFee("agàdir"));
  });

  it("strips parenthesized region qualifiers", () => {
    expect(lookup.getShippingFee("Afsou")).toBe(lookup.getShippingFee("Afsou ( nador )"));
  });

  it("falls back to the default fee for an unknown city", () => {
    expect(lookup.getShippingFee("Nowhereville Zzzz")).toBe(DEFAULT_SHIPPING_FEE);
  });

  it("falls back to the default fee for empty input", () => {
    expect(lookup.getShippingFee("")).toBe(DEFAULT_SHIPPING_FEE);
    expect(lookup.getShippingFee("   ")).toBe(DEFAULT_SHIPPING_FEE);
  });

  it("every rate table entry resolves to its own fee", () => {
    for (const { city, fee } of SHIPPING_RATES.slice(0, 25)) {
      expect(lookup.getShippingFee(city)).toBe(fee);
    }
  });
});

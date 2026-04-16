/**
 * @jest-environment jsdom
 */

import { convertPrice, getCurrencySymbol, getSavedCurrency, saveCurrency, CURRENCIES } from "@/lib/currency";

describe("getCurrencySymbol", () => {
  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns ₪ for ILS", () => {
    expect(getCurrencySymbol("ILS")).toBe("₪");
  });
});

describe("convertPrice", () => {
  const rates = { USD: 1, EUR: 0.92, GBP: 0.79, ILS: 3.7 };

  it("returns same price for USD", () => {
    expect(convertPrice(100, rates, "USD")).toBe(100);
  });

  it("converts USD to EUR", () => {
    expect(convertPrice(100, rates, "EUR")).toBeCloseTo(92, 0);
  });

  it("converts USD to GBP", () => {
    expect(convertPrice(100, rates, "GBP")).toBeCloseTo(79, 0);
  });

  it("converts USD to ILS", () => {
    expect(convertPrice(100, rates, "ILS")).toBeCloseTo(370, 0);
  });

  it("returns USD price when rate is missing", () => {
    expect(convertPrice(100, {}, "EUR")).toBe(100);
  });
});

describe("getSavedCurrency / saveCurrency", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to USD when nothing saved", () => {
    expect(getSavedCurrency()).toBe("USD");
  });

  it("returns saved currency", () => {
    saveCurrency("EUR");
    expect(getSavedCurrency()).toBe("EUR");
  });

  it("overwrites previous saved currency", () => {
    saveCurrency("GBP");
    saveCurrency("ILS");
    expect(getSavedCurrency()).toBe("ILS");
  });
});

describe("CURRENCIES constant", () => {
  it("has 4 currencies", () => {
    expect(CURRENCIES).toHaveLength(4);
  });

  it("each entry has code, symbol, and name", () => {
    for (const c of CURRENCIES) {
      expect(c.code).toBeDefined();
      expect(c.symbol).toBeDefined();
      expect(c.name).toBeDefined();
    }
  });
});

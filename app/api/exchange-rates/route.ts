import { NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

type QuoteData = { c: number };

// Approximate fallback rates (2024-2025 averages) — used when Finnhub forex fails.
// Free tier often doesn't return forex quotes, so these keep the UI working.
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  ILS: 3.7,
};

// Fetch exchange rates relative to USD using Finnhub forex quotes, with fallbacks
export async function GET() {
  const pairs = [
    { pair: "OANDA:EUR_USD", code: "EUR" },
    { pair: "OANDA:GBP_USD", code: "GBP" },
    { pair: "OANDA:USD_ILS", code: "ILS" },
  ];

  const rates: Record<string, number> = { ...FALLBACK_RATES };

  await Promise.all(
    pairs.map(async ({ pair, code }) => {
      try {
        const data = await finnhubFetch<QuoteData>("/quote", { symbol: pair });
        if (data && data.c > 0) {
          // EUR_USD means 1 EUR = c USD, so 1 USD = 1/c EUR
          // USD_ILS means 1 USD = c ILS
          if (code === "ILS") {
            rates[code] = data.c;
          } else {
            rates[code] = 1 / data.c;
          }
        }
      } catch {
        // Keep fallback rate
      }
    })
  );

  return NextResponse.json(rates, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

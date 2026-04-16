import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type YahooChart = {
  chart: {
    result?: {
      meta: {
        symbol: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
      };
    }[];
  };
};

async function fetchYahooQuote(symbol: string): Promise<{ c: number; d: number; dp: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChart;
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    return { c: price, d: change, dp: changePct };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "Missing symbols parameter" }, { status: 400 });
  }

  const symbols = symbolsParam.split(",").slice(0, 50); // cap at 50
  const results: Record<string, { c: number; d: number; dp: number } | null> = {};

  // Fetch all in parallel — Yahoo has no rate limits
  await Promise.all(
    symbols.map(async (sym) => {
      results[sym] = await fetchYahooQuote(sym);
    })
  );

  return NextResponse.json(results);
}

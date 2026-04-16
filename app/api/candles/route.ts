import { NextRequest, NextResponse } from "next/server";

/**
 * Convert a Finnhub-style symbol to a Yahoo Finance ticker.
 *   BINANCE:BTCUSDT  → BTC-USD
 *   OANDA:EUR_USD    → EURUSD=X
 *   AAPL             → AAPL
 */
function toYahooSymbol(symbol: string): string {
  if (symbol.startsWith("BINANCE:")) {
    // BINANCE:BTCUSDT → BTC-USD
    const pair = symbol.replace("BINANCE:", "");
    const base = pair.replace(/USDT$/, "").replace(/USD$/, "");
    return `${base}-USD`;
  }
  if (symbol.startsWith("OANDA:")) {
    // OANDA:EUR_USD → EURUSD=X
    const pair = symbol.replace("OANDA:", "").replace("_", "");
    return `${pair}=X`;
  }
  return symbol;
}

/**
 * Map from/to timestamps to a Yahoo Finance range string.
 */
function toYahooRange(fromTs: number, toTs: number): string {
  const diffDays = Math.round((toTs - fromTs) / 86400);
  if (diffDays <= 7) return "5d";
  if (diffDays <= 35) return "1mo";
  if (diffDays <= 100) return "3mo";
  if (diffDays <= 200) return "6mo";
  if (diffDays <= 400) return "1y";
  if (diffDays <= 800) return "2y";
  return "5y";
}

/**
 * Map resolution to Yahoo interval.
 */
function toYahooInterval(resolution: string): string {
  switch (resolution) {
    case "1": return "1m";
    case "5": return "5m";
    case "15": return "15m";
    case "30": return "30m";
    case "60": return "60m";
    case "D": return "1d";
    case "W": return "1wk";
    case "M": return "1mo";
    default: return "1d";
  }
}

type YahooChart = {
  chart: {
    result?: {
      timestamp: number[];
      indicators: {
        quote: {
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
        }[];
      };
    }[];
    error?: { description?: string };
  };
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const resolution = searchParams.get("resolution") ?? "D";

  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  if (!from) return NextResponse.json({ error: "Missing from" }, { status: 400 });
  if (!to) return NextResponse.json({ error: "Missing to" }, { status: 400 });

  const yahooSymbol = toYahooSymbol(symbol);
  const range = toYahooRange(Number(from), Number(to));
  const interval = toYahooInterval(resolution);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ s: "no_data" });
    }

    const data = (await res.json()) as YahooChart;
    const result = data.chart?.result?.[0];

    if (!result || !result.timestamp?.length) {
      return NextResponse.json({ s: "no_data" });
    }

    const quote = result.indicators.quote[0];
    const timestamps = result.timestamp;

    // Filter out entries with null values
    const t: number[] = [];
    const o: number[] = [];
    const h: number[] = [];
    const l: number[] = [];
    const c: number[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (
        quote.close[i] != null &&
        quote.open[i] != null &&
        quote.high[i] != null &&
        quote.low[i] != null
      ) {
        t.push(timestamps[i]);
        o.push(quote.open[i]!);
        h.push(quote.high[i]!);
        l.push(quote.low[i]!);
        c.push(quote.close[i]!);
      }
    }

    if (t.length === 0) {
      return NextResponse.json({ s: "no_data" });
    }

    // Return in Finnhub-compatible format
    return NextResponse.json({ s: "ok", t, o, h, l, c });
  } catch {
    return NextResponse.json({ s: "no_data" });
  }
}

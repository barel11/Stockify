import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDICES = [
  { yahoo: "^GSPC", name: "S&P 500" },
  { yahoo: "^IXIC", name: "NASDAQ" },
  { yahoo: "^DJI", name: "DOW" },
  { yahoo: "^RUT", name: "Russell 2K" },
];

// Interval between pushes (ms)
const TICK_MS = 10_000;

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

async function fetchYahooQuote(yahooSymbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;
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

async function snapshot() {
  const idxData = await Promise.all(
    INDICES.map(async (idx) => {
      const q = await fetchYahooQuote(idx.yahoo);
      return q
        ? { symbol: idx.yahoo, name: idx.name, c: q.c, dp: q.dp, d: q.d }
        : null;
    })
  );
  return {
    indices: idxData.filter(Boolean),
    ts: Date.now(),
  };
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial push
      try {
        send(await snapshot());
      } catch {
        /* ignore */
      }

      const interval = setInterval(async () => {
        if (closed) return;
        try {
          send(await snapshot());
        } catch {
          /* ignore */
        }
      }, TICK_MS);

      // Heartbeat comment every 20s so proxies don't close the connection
      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: hb ${Date.now()}\n\n`));
      }, 20_000);

      // Close on client disconnect
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

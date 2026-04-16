import type { NextRequest } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

type QuoteData = { c: number; d: number; dp: number };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDICES = [
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "QQQ", name: "NASDAQ" },
  { symbol: "DIA", name: "DOW" },
  { symbol: "IWM", name: "Russell 2K" },
];

// Interval between pushes (ms). Keep it modest to stay under Finnhub's 60 req/min.
const TICK_MS = 10_000;

async function snapshot() {
  const idxData = await Promise.all(
    INDICES.map(async (idx) => {
      const q = await finnhubFetch<QuoteData>("/quote", { symbol: idx.symbol }).catch(() => null);
      return q && q.c > 0
        ? { symbol: idx.symbol, name: idx.name, c: q.c, dp: q.dp, d: q.d }
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

import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const resolution = searchParams.get("resolution") ?? "D";
  const type = searchParams.get("type") ?? "stock";

  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  if (!from) return NextResponse.json({ error: "Missing from" }, { status: 400 });
  if (!to) return NextResponse.json({ error: "Missing to" }, { status: 400 });

  const endpoint = type === "forex" ? "/forex/candle" : type === "crypto" ? "/crypto/candle" : "/stock/candle";
  let data = await finnhubFetch(endpoint, { symbol, resolution, from, to });
  // Retry once if rate-limited
  if (!data) {
    await new Promise((r) => setTimeout(r, 1200));
    data = await finnhubFetch(endpoint, { symbol, resolution, from, to });
  }
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}

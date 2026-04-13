import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.FINNHUB_API_KEY ?? "";
  // Only expose the key for authenticated WebSocket connections
  // The free Finnhub plan has limited WebSocket access
  return NextResponse.json({ token: key });
}

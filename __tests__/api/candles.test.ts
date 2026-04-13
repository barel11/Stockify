/**
 * @jest-environment node
 */

import { GET } from "@/app/api/candles/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/finnhub", () => ({
  finnhubFetch: jest.fn(),
}));

import { finnhubFetch } from "@/lib/finnhub";
const mockFinnhubFetch = finnhubFetch as jest.MockedFunction<typeof finnhubFetch>;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/candles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when required params are missing", async () => {
    const res = await GET(makeRequest("/api/candles?symbol=AAPL"));
    expect(res.status).toBe(400);
  });

  it("uses stock/candle endpoint by default", async () => {
    const mockCandles = { s: "ok", c: [150], h: [151], l: [149], o: [149.5], v: [1000], t: [123] };
    mockFinnhubFetch.mockResolvedValue(mockCandles);

    const res = await GET(makeRequest("/api/candles?symbol=AAPL&from=100&to=200"));
    expect(res.status).toBe(200);
    expect(mockFinnhubFetch).toHaveBeenCalledWith("/stock/candle", expect.objectContaining({ symbol: "AAPL" }));
  });

  it("uses forex/candle endpoint when type=forex", async () => {
    mockFinnhubFetch.mockResolvedValue({ s: "ok", c: [1.1] });

    await GET(makeRequest("/api/candles?symbol=OANDA:EUR_USD&from=100&to=200&type=forex"));
    expect(mockFinnhubFetch).toHaveBeenCalledWith("/forex/candle", expect.objectContaining({ symbol: "OANDA:EUR_USD" }));
  });
});

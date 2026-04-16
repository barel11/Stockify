/**
 * @jest-environment node
 */

import { GET } from "@/app/api/candles/route";
import { NextRequest } from "next/server";

// Mock global fetch for Yahoo Finance calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function yahooResponse(closes: number[], timestamps: number[]) {
  return {
    ok: true,
    json: async () => ({
      chart: {
        result: [
          {
            timestamp: timestamps,
            indicators: {
              quote: [
                {
                  open: closes.map((c) => c - 1),
                  high: closes.map((c) => c + 1),
                  low: closes.map((c) => c - 2),
                  close: closes,
                },
              ],
            },
          },
        ],
      },
    }),
  };
}

describe("GET /api/candles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when required params are missing", async () => {
    const res = await GET(makeRequest("/api/candles?symbol=AAPL"));
    expect(res.status).toBe(400);
  });

  it("returns candle data for a stock symbol", async () => {
    mockFetch.mockResolvedValue(yahooResponse([150, 152], [100, 200]));

    const res = await GET(makeRequest("/api/candles?symbol=AAPL&from=100&to=200"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.s).toBe("ok");
    expect(data.c).toEqual([150, 152]);
    expect(data.t).toEqual([100, 200]);
  });

  it("converts forex symbols to Yahoo format", async () => {
    mockFetch.mockResolvedValue(yahooResponse([1.1], [100]));

    await GET(makeRequest("/api/candles?symbol=OANDA:EUR_USD&from=100&to=200&type=forex"));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("EURUSD%3DX"),
      expect.any(Object)
    );
  });

  it("converts crypto symbols to Yahoo format", async () => {
    mockFetch.mockResolvedValue(yahooResponse([50000], [100]));

    await GET(makeRequest("/api/candles?symbol=BINANCE:BTCUSDT&from=100&to=200&type=crypto"));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("BTC-USD"),
      expect.any(Object)
    );
  });
});

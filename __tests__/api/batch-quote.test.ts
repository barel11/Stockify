/**
 * @jest-environment node
 */

import { GET } from "@/app/api/batch-quote/route";
import { NextRequest } from "next/server";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function yahooChartResponse(price: number, prevClose: number) {
  return {
    ok: true,
    json: async () => ({
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: price,
              chartPreviousClose: prevClose,
            },
          },
        ],
      },
    }),
  };
}

describe("GET /api/batch-quote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when symbols param is missing", async () => {
    const res = await GET(makeRequest("/api/batch-quote"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing symbols parameter");
  });

  it("returns quotes for multiple symbols", async () => {
    mockFetch
      .mockResolvedValueOnce(yahooChartResponse(150, 148))
      .mockResolvedValueOnce(yahooChartResponse(300, 305));

    const res = await GET(makeRequest("/api/batch-quote?symbols=AAPL,MSFT"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.AAPL).toBeDefined();
    expect(body.AAPL.c).toBe(150);
    expect(body.MSFT.c).toBe(300);
  });

  it("returns null for symbols that fail to fetch", async () => {
    mockFetch
      .mockResolvedValueOnce(yahooChartResponse(150, 148))
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    const res = await GET(makeRequest("/api/batch-quote?symbols=AAPL,INVALID"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.AAPL.c).toBe(150);
    expect(body.INVALID).toBeNull();
  });

  it("caps at 50 symbols", async () => {
    const symbols = Array.from({ length: 60 }, (_, i) => `SYM${i}`).join(",");
    mockFetch.mockResolvedValue(yahooChartResponse(100, 99));

    await GET(makeRequest(`/api/batch-quote?symbols=${symbols}`));
    expect(mockFetch).toHaveBeenCalledTimes(50);
  });

  it("computes change percentage correctly", async () => {
    // price=110, prevClose=100 → dp should be +10%
    mockFetch.mockResolvedValueOnce(yahooChartResponse(110, 100));

    const res = await GET(makeRequest("/api/batch-quote?symbols=TEST"));
    const body = await res.json();
    expect(body.TEST.dp).toBeCloseTo(10, 1);
    expect(body.TEST.d).toBeCloseTo(10, 1);
  });
});

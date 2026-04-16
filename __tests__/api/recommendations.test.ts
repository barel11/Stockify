/**
 * @jest-environment node
 */

import { GET } from "@/app/api/recommendations/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/finnhub", () => ({
  finnhubFetch: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  cachedFetch: jest.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
}));

import { finnhubFetch } from "@/lib/finnhub";
const mockFinnhubFetch = finnhubFetch as jest.MockedFunction<typeof finnhubFetch>;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(makeRequest("/api/recommendations"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing symbol");
  });

  it("returns recommendation data for valid symbol", async () => {
    const mockRec = [{ buy: 20, hold: 10, sell: 2, strongBuy: 8, strongSell: 1, period: "2024-01" }];
    mockFinnhubFetch.mockResolvedValue(mockRec);

    const res = await GET(makeRequest("/api/recommendations?symbol=AAPL"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].buy).toBe(20);
  });

  it("returns 502 when fetch fails", async () => {
    mockFinnhubFetch.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/recommendations?symbol=INVALID"));
    expect(res.status).toBe(502);
  });
});

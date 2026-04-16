/**
 * @jest-environment node
 */

import { GET } from "@/app/api/price-target/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/finnhub", () => ({
  finnhubFetch: jest.fn(),
}));

import { finnhubFetch } from "@/lib/finnhub";
const mockFinnhubFetch = finnhubFetch as jest.MockedFunction<typeof finnhubFetch>;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/price-target", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(makeRequest("/api/price-target"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing symbol");
  });

  it("returns price target data for valid symbol", async () => {
    const mockTarget = { targetHigh: 200, targetLow: 150, targetMean: 175, targetMedian: 178 };
    mockFinnhubFetch.mockResolvedValue(mockTarget);

    const res = await GET(makeRequest("/api/price-target?symbol=AAPL"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetHigh).toBe(200);
    expect(body.targetMean).toBe(175);
  });

  it("returns 502 when Finnhub fails", async () => {
    mockFinnhubFetch.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/price-target?symbol=INVALID"));
    expect(res.status).toBe(502);
  });
});

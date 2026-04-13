/**
 * @jest-environment node
 */

import { GET } from "@/app/api/quote/route";
import { NextRequest } from "next/server";

// Mock the finnhub helper
jest.mock("@/lib/finnhub", () => ({
  finnhubFetch: jest.fn(),
}));

import { finnhubFetch } from "@/lib/finnhub";
const mockFinnhubFetch = finnhubFetch as jest.MockedFunction<typeof finnhubFetch>;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/quote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(makeRequest("/api/quote"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing symbol");
  });

  it("returns quote data for valid symbol", async () => {
    const mockQuote = { c: 150.0, d: 2.5, dp: 1.69, h: 151, l: 148, o: 149, pc: 147.5, t: 1234567890 };
    mockFinnhubFetch.mockResolvedValue(mockQuote);

    const res = await GET(makeRequest("/api/quote?symbol=AAPL"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.c).toBe(150.0);
    expect(body.dp).toBe(1.69);
    expect(mockFinnhubFetch).toHaveBeenCalledWith("/quote", { symbol: "AAPL" });
  });

  it("returns 502 when Finnhub fails", async () => {
    mockFinnhubFetch.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/quote?symbol=INVALID"));
    expect(res.status).toBe(502);
  });
});

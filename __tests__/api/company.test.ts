/**
 * @jest-environment node
 */

import { GET } from "@/app/api/company/route";
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

describe("GET /api/company", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(makeRequest("/api/company"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing symbol");
  });

  it("returns company profile for valid symbol", async () => {
    const mockProfile = { name: "Apple Inc", exchange: "NASDAQ", finnhubIndustry: "Technology" };
    mockFinnhubFetch.mockResolvedValue(mockProfile);

    const res = await GET(makeRequest("/api/company?symbol=AAPL"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Apple Inc");
  });

  it("returns 502 when fetch fails", async () => {
    mockFinnhubFetch.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/company?symbol=INVALID"));
    expect(res.status).toBe(502);
  });
});

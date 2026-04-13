/**
 * @jest-environment node
 */

import { GET } from "@/app/api/search/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/finnhub", () => ({
  finnhubFetch: jest.fn(),
}));

import { finnhubFetch } from "@/lib/finnhub";
const mockFinnhubFetch = finnhubFetch as jest.MockedFunction<typeof finnhubFetch>;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when query is missing", async () => {
    const res = await GET(makeRequest("/api/search"));
    expect(res.status).toBe(400);
  });

  it("returns search results for valid query", async () => {
    const mockResults = { count: 2, result: [{ symbol: "AAPL", description: "Apple Inc" }] };
    mockFinnhubFetch.mockResolvedValue(mockResults);

    const res = await GET(makeRequest("/api/search?q=AAPL"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.result).toHaveLength(1);
    expect(body.result[0].symbol).toBe("AAPL");
    expect(mockFinnhubFetch).toHaveBeenCalledWith("/search", { q: "AAPL" });
  });
});

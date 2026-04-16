/**
 * @jest-environment node
 */

import { GET } from "@/app/api/news/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/finnhub", () => ({
  finnhubFetch: jest.fn(),
}));

import { finnhubFetch } from "@/lib/finnhub";
const mockFinnhubFetch = finnhubFetch as jest.MockedFunction<typeof finnhubFetch>;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/news", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(makeRequest("/api/news"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when from is missing", async () => {
    const res = await GET(makeRequest("/api/news?symbol=AAPL&to=2024-01-01"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when to is missing", async () => {
    const res = await GET(makeRequest("/api/news?symbol=AAPL&from=2024-01-01"));
    expect(res.status).toBe(400);
  });

  it("returns news data for valid params", async () => {
    const mockNews = [{ headline: "Apple earnings beat", source: "Reuters" }];
    mockFinnhubFetch.mockResolvedValue(mockNews);

    const res = await GET(makeRequest("/api/news?symbol=AAPL&from=2024-01-01&to=2024-01-31"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].headline).toBe("Apple earnings beat");
  });

  it("returns 502 when Finnhub fails", async () => {
    mockFinnhubFetch.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/news?symbol=AAPL&from=2024-01-01&to=2024-01-31"));
    expect(res.status).toBe(502);
  });
});

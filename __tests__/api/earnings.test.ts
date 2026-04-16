/**
 * @jest-environment node
 */

import { GET } from "@/app/api/earnings/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/finnhub", () => ({
  finnhubFetch: jest.fn(),
}));

import { finnhubFetch } from "@/lib/finnhub";
const mockFinnhubFetch = finnhubFetch as jest.MockedFunction<typeof finnhubFetch>;

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/earnings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(makeRequest("/api/earnings"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing symbol");
  });

  it("returns earnings data for valid symbol", async () => {
    const mockEarnings = [
      { actual: 1.52, estimate: 1.43, period: "2024-01-01", surprise: 0.09 },
    ];
    mockFinnhubFetch.mockResolvedValue(mockEarnings);

    const res = await GET(makeRequest("/api/earnings?symbol=AAPL"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].actual).toBe(1.52);
    expect(body[0].estimate).toBe(1.43);
  });

  it("returns 502 when Finnhub fails", async () => {
    mockFinnhubFetch.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/earnings?symbol=INVALID"));
    expect(res.status).toBe(502);
  });
});

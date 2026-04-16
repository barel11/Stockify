import { runBacktest, type Candle } from "@/lib/backtest";

function makeCandles(closes: number[], startTime = 1000000): Candle[] {
  return closes.map((c, i) => ({
    t: startTime + i * 86400,
    o: c - 1,
    h: c + 1,
    l: c - 2,
    c,
  }));
}

describe("runBacktest", () => {
  it("returns empty result for fewer than 2 candles", () => {
    const result = runBacktest([], "buy_hold");
    expect(result.equityCurve).toEqual([]);
    expect(result.trades).toEqual([]);
    expect(result.totalReturn).toBe(0);
  });

  it("returns empty result for a single candle", () => {
    const result = runBacktest(makeCandles([100]), "rsi");
    expect(result.equityCurve).toEqual([]);
    expect(result.totalReturn).toBe(0);
  });

  describe("buy_hold strategy", () => {
    it("buys on day 1 and holds to end", () => {
      const candles = makeCandles([100, 110, 120]);
      const result = runBacktest(candles, "buy_hold", 10_000);
      expect(result.strategy).toBe("buy_hold");
      expect(result.totalReturn).toBeCloseTo(20, 0);
      expect(result.trades.length).toBe(1);
    });

    it("tracks negative returns", () => {
      const candles = makeCandles([100, 90, 80]);
      const result = runBacktest(candles, "buy_hold", 10_000);
      expect(result.totalReturn).toBeCloseTo(-20, 0);
    });

    it("buy_hold and buyHoldReturn are equal", () => {
      const candles = makeCandles([50, 60, 70, 80]);
      const result = runBacktest(candles, "buy_hold", 10_000);
      expect(result.totalReturn).toBeCloseTo(result.buyHoldReturn, 1);
    });
  });

  describe("equity curve", () => {
    it("has same length as input candles", () => {
      const candles = makeCandles([100, 105, 110, 108, 115]);
      const result = runBacktest(candles, "buy_hold");
      expect(result.equityCurve.length).toBe(candles.length);
      expect(result.buyHoldCurve.length).toBe(candles.length);
    });

    it("equity curve starts at initial capital", () => {
      const candles = makeCandles([100, 105, 110]);
      const result = runBacktest(candles, "buy_hold", 5000);
      expect(result.equityCurve[0].value).toBe(5000);
    });
  });

  describe("statistics", () => {
    it("computes sharpe ratio", () => {
      const candles = makeCandles([100, 102, 104, 103, 106, 108, 110]);
      const result = runBacktest(candles, "buy_hold");
      expect(typeof result.sharpe).toBe("number");
      expect(Number.isFinite(result.sharpe)).toBe(true);
    });

    it("computes max drawdown as negative percentage", () => {
      const candles = makeCandles([100, 110, 90, 95, 100]);
      const result = runBacktest(candles, "buy_hold");
      expect(result.maxDrawdown).toBeLessThanOrEqual(0);
    });

    it("computes win rate for strategies with trades", () => {
      const candles = makeCandles([100, 105, 110, 108, 115]);
      const result = runBacktest(candles, "buy_hold");
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(100);
    });
  });

  describe("RSI strategy", () => {
    it("returns valid result with enough data", () => {
      // RSI needs 14+ periods to generate signals
      const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.5) * 20);
      const candles = makeCandles(closes);
      const result = runBacktest(candles, "rsi");
      expect(result.strategy).toBe("rsi");
      expect(result.equityCurve.length).toBe(30);
    });
  });

  describe("SMA cross strategy", () => {
    it("returns valid result with enough data", () => {
      // SMA cross needs 50+ periods for the slow SMA
      const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
      const candles = makeCandles(closes);
      const result = runBacktest(candles, "sma_cross");
      expect(result.strategy).toBe("sma_cross");
      expect(result.equityCurve.length).toBe(60);
    });
  });

  describe("MACD strategy", () => {
    it("returns valid result with enough data", () => {
      // MACD needs 26+ periods for slow EMA + 9 for signal
      const closes = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i * 0.3) * 15);
      const candles = makeCandles(closes);
      const result = runBacktest(candles, "macd");
      expect(result.strategy).toBe("macd");
      expect(result.equityCurve.length).toBe(40);
    });
  });

  describe("custom initial capital", () => {
    it("uses provided capital", () => {
      const candles = makeCandles([100, 200]);
      const result = runBacktest(candles, "buy_hold", 50_000);
      const finalEquity = result.equityCurve[result.equityCurve.length - 1].value;
      expect(finalEquity).toBeCloseTo(100_000, 0);
    });
  });
});

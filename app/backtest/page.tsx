"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, LineSeries, type Time, type LineData } from "lightweight-charts";
import {
  FiPlay,
  FiTarget,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
  FiBarChart2,
  FiPercent,
  FiAward,
  FiRefreshCw,
} from "react-icons/fi";
import Navbar from "@/components/Navbar";
import Background from "@/components/Background";
import { runBacktest, type BacktestResult, type Candle, type Strategy } from "@/lib/backtest";

const STRATEGIES: { key: Strategy; label: string; description: string }[] = [
  { key: "buy_hold", label: "Buy & Hold", description: "Buy on day 1, hold to end." },
  { key: "rsi", label: "RSI Oversold/Overbought", description: "Buy RSI<30, sell RSI>70." },
  { key: "sma_cross", label: "SMA 20/50 Cross", description: "Buy on golden cross, sell on death cross." },
  { key: "macd", label: "MACD Crossover", description: "Buy/sell on MACD signal line cross." },
];

const RANGES: { key: string; label: string; days: number }[] = [
  { key: "1Y", label: "1 Year", days: 365 },
  { key: "2Y", label: "2 Years", days: 730 },
  { key: "5Y", label: "5 Years", days: 1825 },
];

type ApiCandles = { s: string; t: number[]; o: number[]; h: number[]; l: number[]; c: number[] };

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [input, setInput] = useState("AAPL");
  const [strategy, setStrategy] = useState<Strategy>("rsi");
  const [rangeDays, setRangeDays] = useState(730);
  const [capital, setCapital] = useState(10_000);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const to = Math.floor(Date.now() / 1000);
    const from = to - rangeDays * 86400;
    const res = await fetch(
      `/api/candles?symbol=${encodeURIComponent(symbol.toUpperCase())}&resolution=D&from=${from}&to=${to}&type=stock`
    );
    if (!res.ok) {
      setError("Could not load candle data for this symbol.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as ApiCandles;
    if (data.s !== "ok" || !data.t?.length) {
      setError("No historical data for this symbol");
      setLoading(false);
      return;
    }
    const candles: Candle[] = data.t.map((t, i) => ({
      t,
      o: data.o[i],
      h: data.h[i],
      l: data.l[i],
      c: data.c[i],
    }));
    const r = runBacktest(candles, strategy, capital);
    setResult(r);
    setLoading(false);
  };

  // Render chart when result changes
  useEffect(() => {
    if (!result || !containerRef.current || result.equityCurve.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    if (resizeObsRef.current) {
      resizeObsRef.current.disconnect();
      resizeObsRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 380,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#6b7280" },
      grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    chartRef.current = chart;

    const toLineData = (pts: { time: number; value: number }[]): LineData<Time>[] =>
      pts.map((p) => ({ time: p.time as Time, value: p.value }));

    chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "Strategy",
    }).setData(toLineData(result.equityCurve));

    chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      lineStyle: 2,
      title: "Buy & Hold",
    }).setData(toLineData(result.buyHoldCurve));

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);
    resizeObsRef.current = ro;

    return () => {
      if (resizeObsRef.current) resizeObsRef.current.disconnect();
      if (chartRef.current) chartRef.current.remove();
    };
  }, [result]);

  const alpha = result ? result.totalReturn - result.buyHoldReturn : 0;

  return (
    <Background>
      <Navbar />
      <main className="pt-24 pb-24 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-wider uppercase backdrop-blur-sm mb-3">
            <FiTarget /> Strategy Playground
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            Backtest
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Replay a trading strategy on historical daily candles and compare it to buy-and-hold.
            Signals execute at each candle&apos;s close.
          </p>
        </header>

        {/* Controls */}
        <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-2">Symbol</label>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && setSymbol(input)}
                onBlur={() => setSymbol(input)}
                placeholder="AAPL"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all uppercase tracking-wider"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-2">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as Strategy)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
              >
                {STRATEGIES.map((s) => (
                  <option key={s.key} value={s.key} className="bg-black text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-2">Period</label>
              <select
                value={rangeDays}
                onChange={(e) => setRangeDays(Number(e.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
              >
                {RANGES.map((r) => (
                  <option key={r.key} value={r.days} className="bg-black text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-2">Capital (USD)</label>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value) || 0)}
                min={100}
                step={100}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-gray-500">
              {STRATEGIES.find((s) => s.key === strategy)?.description}
            </p>
            <button
              onClick={run}
              disabled={loading || !symbol}
              className="rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-sm font-black uppercase tracking-wider text-white transition-all shadow-lg shadow-blue-600/20 inline-flex items-center gap-2"
            >
              {loading ? <FiRefreshCw className="animate-spin" size={14} /> : <FiPlay size={14} />}
              {loading ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300 mb-6">{error}</div>
        )}

        {result && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Strategy Return" value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)}%`} positive={result.totalReturn >= 0} icon={<FiTrendingUp size={11} />} />
              <StatCard label="Buy & Hold" value={`${result.buyHoldReturn >= 0 ? "+" : ""}${result.buyHoldReturn.toFixed(2)}%`} positive={result.buyHoldReturn >= 0} icon={<FiActivity size={11} />} />
              <StatCard label="Alpha" value={`${alpha >= 0 ? "+" : ""}${alpha.toFixed(2)}%`} positive={alpha >= 0} icon={<FiAward size={11} />} />
              <StatCard label="Sharpe" value={result.sharpe.toFixed(2)} positive={result.sharpe > 1} icon={<FiBarChart2 size={11} />} />
              <StatCard label="Max Drawdown" value={`${result.maxDrawdown.toFixed(2)}%`} positive={false} icon={<FiTrendingDown size={11} />} />
              <StatCard label="Trades" value={String(result.trades.length)} positive icon={<FiTarget size={11} />} />
              <StatCard label="Win Rate" value={`${result.winRate.toFixed(1)}%`} positive={result.winRate > 50} icon={<FiPercent size={11} />} />
              <StatCard label="Avg Trade" value={result.trades.length > 0 ? `${(result.trades.reduce((s, t) => s + t.pnlPct, 0) / result.trades.length).toFixed(2)}%` : "N/A"} positive={result.trades.length > 0 && result.trades.reduce((s, t) => s + t.pnlPct, 0) >= 0} icon={<FiActivity size={11} />} />
            </div>

            {/* Equity curve */}
            <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-2">
                  <FiBarChart2 size={12} /> Equity Curve · ${capital.toLocaleString()} Initial
                </p>
                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400" /> Strategy</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-400 border-dashed" style={{ borderTop: "2px dashed #8b5cf6", backgroundColor: "transparent" }} /> Buy &amp; Hold</span>
                </div>
              </div>
              <div ref={containerRef} style={{ minHeight: 380 }} />
            </div>

            {/* Trades list */}
            {result.trades.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-4">
                  Trades ({result.trades.length})
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                        <th className="text-left pb-2">Entry</th>
                        <th className="text-left pb-2">Exit</th>
                        <th className="text-right pb-2">Entry $</th>
                        <th className="text-right pb-2">Exit $</th>
                        <th className="text-right pb-2">P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((t, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="py-2 text-gray-400">{new Date(t.entryTime * 1000).toLocaleDateString()}</td>
                          <td className="py-2 text-gray-400">{new Date(t.exitTime * 1000).toLocaleDateString()}</td>
                          <td className="py-2 text-right text-white font-bold">${t.entryPrice.toFixed(2)}</td>
                          <td className="py-2 text-right text-white font-bold">${t.exitPrice.toFixed(2)}</td>
                          <td className={`py-2 text-right font-black ${t.pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </Background>
  );
}

function StatCard({ label, value, positive, icon }: { label: string; value: string; positive: boolean; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className={`mt-1.5 text-lg font-black ${positive ? "text-emerald-400" : "text-rose-400"}`}>{value}</p>
    </div>
  );
}

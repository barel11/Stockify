"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, LineSeries, CrosshairMode, type Time, type LineData } from "lightweight-charts";
import { FiBarChart2, FiTrendingUp, FiTrendingDown, FiActivity } from "react-icons/fi";

type Holding = {
  symbol: string;
  shares: number;
  buy_price: number;
};

type Candle = { t: number[]; c: number[]; s: string };

type Stats = {
  totalReturn: number; // %
  sharpe: number; // annualized
  maxDrawdown: number; // %
  volatility: number; // annualized %
};

const DAYS = 180;

function computeStats(values: number[]): Stats {
  if (values.length < 2) return { totalReturn: 0, sharpe: 0, maxDrawdown: 0, volatility: 0 };

  const first = values[0];
  const last = values[values.length - 1];
  const totalReturn = ((last - first) / first) * 100;

  // Daily returns
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const stdev = Math.sqrt(variance);
  const annualizedVol = stdev * Math.sqrt(252) * 100;
  // Assume risk-free rate ~= 0 for simplicity
  const sharpe = stdev > 0 ? (mean / stdev) * Math.sqrt(252) : 0;

  // Max drawdown
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    totalReturn,
    sharpe,
    maxDrawdown: -maxDD * 100,
    volatility: annualizedVol,
  };
}

export default function PortfolioBenchmark({ holdings }: { holdings: Holding[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolioStats, setPortfolioStats] = useState<Stats | null>(null);
  const [spyStats, setSpyStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (holdings.length === 0 || !containerRef.current) return;
      setLoading(true);
      setError(null);

      const to = Math.floor(Date.now() / 1000);
      const from = to - DAYS * 86400;

      try {
        // Fetch SPY first, then holdings sequentially to avoid rate limits
        const targets = [{ symbol: "SPY", type: "stock" }, ...holdings.map((h) => ({ symbol: h.symbol, type: "stock" }))];
        const results: (Candle | null)[] = [];
        for (const t of targets) {
          if (results.length > 0) await new Promise((r) => setTimeout(r, 300));
          try {
            const res = await fetch(
              `/api/candles?symbol=${encodeURIComponent(t.symbol)}&resolution=D&from=${from}&to=${to}&type=${t.type}`
            );
            if (!res.ok) { results.push(null); continue; }
            const data = (await res.json()) as Candle;
            results.push(data.s === "ok" ? data : null);
          } catch {
            results.push(null);
          }
        }

        if (cancelled) return;

        const spyCandle = results[0];
        const holdingCandles = results.slice(1);

        if (!spyCandle || !spyCandle.t.length) {
          setError("S&P 500 data unavailable");
          setLoading(false);
          return;
        }

        // Use SPY timestamps as the master timeline
        const timeline = spyCandle.t;

        // Build a map of timestamp -> close for each holding
        const holdingMaps = holdingCandles.map((c) => {
          const map = new Map<number, number>();
          if (c) c.t.forEach((t, i) => map.set(t, c.c[i]));
          return map;
        });

        // Forward-fill any missing close for a holding with last known close
        const portfolioValues: number[] = [];
        const spyValues: number[] = [];

        const lastClose = holdings.map((h) => h.buy_price); // seed with buy price
        for (let i = 0; i < timeline.length; i++) {
          const ts = timeline[i];
          let pv = 0;
          for (let j = 0; j < holdings.length; j++) {
            const close = holdingMaps[j].get(ts);
            if (close != null) lastClose[j] = close;
            pv += holdings[j].shares * lastClose[j];
          }
          portfolioValues.push(pv);
          spyValues.push(spyCandle.c[i]);
        }

        if (portfolioValues.length < 2) {
          setError("Not enough history to plot");
          setLoading(false);
          return;
        }

        // Normalize both to start = 100
        const pStart = portfolioValues[0];
        const sStart = spyValues[0];
        const pNorm = portfolioValues.map((v) => (v / pStart) * 100);
        const sNorm = spyValues.map((v) => (v / sStart) * 100);

        const portfolioSeries: LineData<Time>[] = timeline.map((t, i) => ({ time: t as Time, value: pNorm[i] }));
        const spySeries: LineData<Time>[] = timeline.map((t, i) => ({ time: t as Time, value: sNorm[i] }));

        setPortfolioStats(computeStats(portfolioValues));
        setSpyStats(computeStats(spyValues));

        // Render chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
        if (resizeObsRef.current) {
          resizeObsRef.current.disconnect();
          resizeObsRef.current = null;
        }

        const chart = createChart(containerRef.current!, {
          width: containerRef.current!.clientWidth,
          height: 300,
          layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#6b7280" },
          grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
          crosshair: { mode: CrosshairMode.Magnet },
          rightPriceScale: { borderVisible: false },
          timeScale: { borderVisible: false },
        });
        chartRef.current = chart;

        chart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 2,
          title: "Portfolio",
        }).setData(portfolioSeries);

        chart.addSeries(LineSeries, {
          color: "#8b5cf6",
          lineWidth: 2,
          lineStyle: 2,
          title: "S&P 500",
        }).setData(spySeries);

        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
          }
        });
        ro.observe(containerRef.current!);
        resizeObsRef.current = ro;
      } catch {
        if (!cancelled) setError("Failed to load benchmark data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (resizeObsRef.current) {
        resizeObsRef.current.disconnect();
        resizeObsRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(holdings.map((h) => ({ s: h.symbol, n: h.shares })))]);

  if (holdings.length === 0) return null;

  const alpha =
    portfolioStats && spyStats ? portfolioStats.totalReturn - spyStats.totalReturn : 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 mb-8 shadow-2xl">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FiBarChart2 size={14} className="text-blue-400" />
          <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
            Portfolio vs S&amp;P 500 · 6M
          </p>
        </div>
        {portfolioStats && spyStats && (
          <div className={`text-xs font-black px-3 py-1 rounded-full border ${alpha >= 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
            Alpha {alpha >= 0 ? "+" : ""}{alpha.toFixed(2)}%
          </div>
        )}
      </div>

      <div className="relative" style={{ minHeight: 300 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">{error}</div>
        )}
        <div ref={containerRef} />
      </div>

      {portfolioStats && spyStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <StatCard label="Portfolio Return" value={`${portfolioStats.totalReturn >= 0 ? "+" : ""}${portfolioStats.totalReturn.toFixed(2)}%`} positive={portfolioStats.totalReturn >= 0} icon={<FiTrendingUp size={11} />} />
          <StatCard label="S&P 500 Return" value={`${spyStats.totalReturn >= 0 ? "+" : ""}${spyStats.totalReturn.toFixed(2)}%`} positive={spyStats.totalReturn >= 0} icon={<FiActivity size={11} />} />
          <StatCard label="Sharpe (ann.)" value={portfolioStats.sharpe.toFixed(2)} positive={portfolioStats.sharpe > 1} icon={<FiBarChart2 size={11} />} />
          <StatCard label="Max Drawdown" value={`${portfolioStats.maxDrawdown.toFixed(2)}%`} positive={false} icon={<FiTrendingDown size={11} />} />
        </div>
      )}
    </div>
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

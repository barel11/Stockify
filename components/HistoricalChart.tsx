"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, CrosshairMode, LineSeries, CandlestickSeries } from "lightweight-charts";
import { useTheme } from "@/lib/use-theme";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";
type ChartMode = "candle" | "line";

const RANGES: { key: TimeRange; label: string; resolution: string; days: number }[] = [
  { key: "1D", label: "1D", resolution: "5", days: 1 },
  { key: "1W", label: "1W", resolution: "15", days: 7 },
  { key: "1M", label: "1M", resolution: "60", days: 30 },
  { key: "3M", label: "3M", resolution: "D", days: 90 },
  { key: "1Y", label: "1Y", resolution: "D", days: 365 },
  { key: "5Y", label: "5Y", resolution: "W", days: 1825 },
];

type Props = {
  symbol: string;
  assetType: "stock" | "crypto" | "forex";
};

export default function HistoricalChart({ symbol, assetType }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [range, setRange] = useState<TimeRange>("3M");
  const [mode, setMode] = useState<ChartMode>("candle");
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  const fetchAndRender = useCallback(async (selectedRange: TimeRange, chartMode: ChartMode) => {
    if (!chartContainerRef.current) return;

    const config = RANGES.find((r) => r.key === selectedRange)!;
    const to = Math.floor(Date.now() / 1000);
    const from = to - config.days * 86400;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/candles?symbol=${encodeURIComponent(symbol)}&resolution=${config.resolution}&from=${from}&to=${to}&type=${assetType}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (data.s !== "ok" || !data.t?.length) return;

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const bg = isDark ? "#0a0a0a" : "#f5f5f7";
      const textColor = isDark ? "#6b7280" : "#9ca3af";
      const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";

      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 350,
        layout: { background: { type: ColorType.Solid, color: bg }, textColor },
        grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
        crosshair: { mode: CrosshairMode.Magnet },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: selectedRange === "1D" || selectedRange === "1W" },
      });
      chartRef.current = chart;

      if (chartMode === "candle" && data.o && data.h && data.l) {
        const candleData = data.t.map((t: number, i: number) => ({
          time: t,
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i],
        }));

        chart.addSeries(CandlestickSeries, {
          upColor: "#10b981",
          downColor: "#f43f5e",
          borderUpColor: "#10b981",
          borderDownColor: "#f43f5e",
          wickUpColor: "#10b981",
          wickDownColor: "#f43f5e",
        }).setData(candleData);
      } else {
        const lineData = data.t.map((t: number, i: number) => ({
          time: t,
          value: data.c[i],
        }));

        const isUp = data.c[data.c.length - 1] >= data.c[0];
        chart.addSeries(LineSeries, {
          color: isUp ? "#10b981" : "#f43f5e",
          lineWidth: 2,
          crosshairMarkerRadius: 4,
        }).setData(lineData);
      }

      chart.timeScale().fitContent();

      // Resize handler
      const resizeObserver = new ResizeObserver(() => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      });
      resizeObserver.observe(chartContainerRef.current);

      return () => resizeObserver.disconnect();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [symbol, assetType, isDark]);

  useEffect(() => {
    fetchAndRender(range, mode);
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [range, mode, fetchAndRender]);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                range === r.key
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode("candle")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              mode === "candle"
                ? "bg-white/10 text-white border border-white/10"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
          >
            Candle
          </button>
          <button
            onClick={() => setMode("line")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              mode === "line"
                ? "bg-white/10 text-white border border-white/10"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
          >
            Line
          </button>
        </div>
      </div>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={chartContainerRef} />
      </div>
    </div>
  );
}

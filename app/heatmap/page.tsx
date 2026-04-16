"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiGrid, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiArrowUp, FiArrowDown, FiActivity } from "react-icons/fi";
import { useCurrency } from "@/lib/use-currency";
import Navbar from "@/components/Navbar";
import Background from "@/components/Background";

type QuoteData = { c: number; dp: number; d: number };

type SectorStock = {
  symbol: string;
  name: string;
  sector: string;
  quote: QuoteData | null;
};

const SECTOR_STOCKS: { symbol: string; name: string; sector: string }[] = [
  { symbol: "AAPL", name: "Apple", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology" },
  { symbol: "GOOG", name: "Alphabet", sector: "Technology" },
  { symbol: "META", name: "Meta", sector: "Technology" },
  { symbol: "TSM", name: "TSMC", sector: "Technology" },
  { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare" },
  { symbol: "JNJ", name: "J&J", sector: "Healthcare" },
  { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare" },
  { symbol: "PFE", name: "Pfizer", sector: "Healthcare" },
  { symbol: "JPM", name: "JPMorgan", sector: "Finance" },
  { symbol: "V", name: "Visa", sector: "Finance" },
  { symbol: "BAC", name: "BofA", sector: "Finance" },
  { symbol: "GS", name: "Goldman", sector: "Finance" },
  { symbol: "XOM", name: "Exxon", sector: "Energy" },
  { symbol: "CVX", name: "Chevron", sector: "Energy" },
  { symbol: "COP", name: "Conoco", sector: "Energy" },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer" },
  { symbol: "TSLA", name: "Tesla", sector: "Consumer" },
  { symbol: "WMT", name: "Walmart", sector: "Consumer" },
  { symbol: "NKE", name: "Nike", sector: "Consumer" },
  { symbol: "CAT", name: "Caterpillar", sector: "Industrial" },
  { symbol: "BA", name: "Boeing", sector: "Industrial" },
  { symbol: "HON", name: "Honeywell", sector: "Industrial" },
  { symbol: "NFLX", name: "Netflix", sector: "Communication" },
  { symbol: "DIS", name: "Disney", sector: "Communication" },
  { symbol: "CMCSA", name: "Comcast", sector: "Communication" },
];

const SECTOR_ICONS: Record<string, string> = {
  Technology: "💻",
  Healthcare: "🏥",
  Finance: "🏦",
  Energy: "⚡",
  Consumer: "🛒",
  Industrial: "🏗️",
  Communication: "📡",
};

function getHeatBg(dp: number): string {
  if (dp >= 3) return "from-emerald-500/40 to-emerald-600/20";
  if (dp >= 2) return "from-emerald-500/30 to-emerald-600/15";
  if (dp >= 1) return "from-emerald-600/25 to-emerald-700/10";
  if (dp >= 0.5) return "from-emerald-700/20 to-emerald-800/10";
  if (dp >= 0) return "from-emerald-900/15 to-emerald-950/5";
  if (dp >= -0.5) return "from-rose-900/15 to-rose-950/5";
  if (dp >= -1) return "from-rose-700/20 to-rose-800/10";
  if (dp >= -2) return "from-rose-600/25 to-rose-700/10";
  if (dp >= -3) return "from-rose-500/30 to-rose-600/15";
  return "from-rose-500/40 to-rose-600/20";
}

function getHeatBorder(dp: number): string {
  if (dp >= 1) return "border-emerald-500/30";
  if (dp >= 0) return "border-emerald-500/15";
  if (dp >= -1) return "border-rose-500/15";
  return "border-rose-500/30";
}

function getHeatGlow(dp: number): string {
  if (dp >= 2) return "shadow-emerald-500/10";
  if (dp >= 0) return "shadow-transparent";
  if (dp >= -2) return "shadow-transparent";
  return "shadow-rose-500/10";
}

export default function HeatmapPage() {
  const { symbol: cSym, convert: cConv } = useCurrency();
  const [stocks, setStocks] = useState<SectorStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const loadData = async () => {
    setLoading(true);
    setLoadProgress(0);
    try {
      const BATCH = 5;
      const results: SectorStock[] = [];
      for (let i = 0; i < SECTOR_STOCKS.length; i += BATCH) {
        if (i > 0) await new Promise((r) => setTimeout(r, 1500));
        const batch = SECTOR_STOCKS.slice(i, i + BATCH);
        const batchResults = await Promise.all(
          batch.map(async (s) => {
            try {
              const res = await fetch(`/api/quote?symbol=${encodeURIComponent(s.symbol)}`);
              if (!res.ok) {
                // Retry once after a short delay
                await new Promise((r) => setTimeout(r, 800));
                const retry = await fetch(`/api/quote?symbol=${encodeURIComponent(s.symbol)}`);
                const quote = retry.ok ? ((await retry.json()) as QuoteData) : null;
                return { ...s, quote };
              }
              const quote = (await res.json()) as QuoteData;
              return { ...s, quote };
            } catch {
              return { ...s, quote: null };
            }
          })
        );
        results.push(...batchResults);
        setStocks([...results]);
        setLoadProgress(Math.round((results.length / SECTOR_STOCKS.length) * 100));
      }
      setStocks(results);
    } catch {
      setStocks(SECTOR_STOCKS.map((s) => ({ ...s, quote: null })));
    } finally {
      setLoading(false);
      setLoadProgress(100);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Group by sector
  const sectors = new Map<string, SectorStock[]>();
  for (const s of stocks) {
    const arr = sectors.get(s.sector) ?? [];
    arr.push(s);
    sectors.set(s.sector, arr);
  }

  const sectorAvgs = Array.from(sectors.entries()).map(([name, items]) => {
    const withQuote = items.filter((i) => i.quote && i.quote.c > 0);
    const avg = withQuote.length > 0 ? withQuote.reduce((s, i) => s + (i.quote?.dp ?? 0), 0) / withQuote.length : 0;
    return { name, avg, items };
  }).sort((a, b) => b.avg - a.avg);

  // Market overview stats
  const allWithQuote = stocks.filter((s) => s.quote && s.quote.c > 0);
  const gainers = allWithQuote.filter((s) => (s.quote?.dp ?? 0) > 0).length;
  const losers = allWithQuote.filter((s) => (s.quote?.dp ?? 0) < 0).length;
  const unchanged = allWithQuote.length - gainers - losers;
  const marketAvg = allWithQuote.length > 0 ? allWithQuote.reduce((s, i) => s + (i.quote?.dp ?? 0), 0) / allWithQuote.length : 0;
  const bestStock = allWithQuote.length > 0 ? allWithQuote.reduce((a, b) => (a.quote?.dp ?? 0) > (b.quote?.dp ?? 0) ? a : b) : null;
  const worstStock = allWithQuote.length > 0 ? allWithQuote.reduce((a, b) => (a.quote?.dp ?? 0) < (b.quote?.dp ?? 0) ? a : b) : null;

  return (
    <Background>
      <Navbar />

      <div className="relative z-10 pt-28 px-4 sm:px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20">
                <FiGrid className="text-blue-400 text-xl" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Market Heatmap</h1>
                <p className="text-gray-500 text-xs mt-0.5">Live sector performance · {allWithQuote.length} stocks tracked</p>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-300 hover:border-blue-500/30 hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} size={13} />
              {loading ? `${loadProgress}%` : "Refresh"}
            </button>
          </div>

          {/* Loading progress bar */}
          {loading && (
            <div className="mt-4 mb-6">
              <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-2 text-center uppercase tracking-widest">
                Loading market data... {loadProgress}%
              </p>
            </div>
          )}

          {/* Market Overview Cards */}
          {!loading && allWithQuote.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6 mb-8">
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
                <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5">
                  <FiActivity size={10} /> Market Avg
                </p>
                <p className={`mt-1.5 text-xl font-black ${marketAvg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {marketAvg >= 0 ? "+" : ""}{marketAvg.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
                <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold">Gainers / Losers</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xl font-black text-emerald-400">{gainers}</span>
                  <span className="text-gray-600">/</span>
                  <span className="text-xl font-black text-rose-400">{losers}</span>
                  {unchanged > 0 && <span className="text-xs text-gray-600">({unchanged} flat)</span>}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
                <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5">
                  <FiTrendingUp size={10} /> Top Gainer
                </p>
                <p className="mt-1.5 text-lg font-black text-emerald-400">{bestStock?.symbol ?? "None yet"}</p>
                <p className="text-[10px] text-emerald-400/70 font-bold">
                  {bestStock ? `+${(bestStock.quote?.dp ?? 0).toFixed(2)}%` : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
                <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5">
                  <FiTrendingDown size={10} /> Top Loser
                </p>
                <p className="mt-1.5 text-lg font-black text-rose-400">{worstStock?.symbol ?? "None yet"}</p>
                <p className="text-[10px] text-rose-400/70 font-bold">
                  {worstStock ? `${(worstStock.quote?.dp ?? 0).toFixed(2)}%` : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 col-span-2 lg:col-span-1">
                <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold">Breadth</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${allWithQuote.length > 0 ? (gainers / allWithQuote.length) * 100 : 0}%` }} />
                    <div className="h-full bg-rose-500 rounded-r-full" style={{ width: `${allWithQuote.length > 0 ? (losers / allWithQuote.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold">{allWithQuote.length > 0 ? Math.round((gainers / allWithQuote.length) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Sector Bar Chart */}
          {!loading && sectorAvgs.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl mb-8">
              <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-5">Sector Performance</p>
              <div className="space-y-3">
                {sectorAvgs.map(({ name, avg }) => {
                  const maxAbs = Math.max(...sectorAvgs.map((s) => Math.abs(s.avg)), 1);
                  const width = Math.min((Math.abs(avg) / maxAbs) * 100, 100);
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center">{SECTOR_ICONS[name] ?? "📊"}</span>
                      <span className="text-xs font-bold text-gray-300 w-28 shrink-0">{name}</span>
                      <div className="flex-1 h-7 rounded-lg bg-white/[0.03] relative overflow-hidden flex items-center">
                        <div
                          className={`h-full rounded-lg transition-all duration-700 ease-out ${
                            avg >= 0
                              ? "bg-gradient-to-r from-emerald-500/40 to-emerald-400/20"
                              : "bg-gradient-to-r from-rose-500/40 to-rose-400/20"
                          }`}
                          style={{ width: `${width}%` }}
                        />
                        <span className={`absolute right-3 text-[11px] font-black ${avg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mr-2">Bearish</span>
            {[
              "from-rose-500/40 to-rose-500/40",
              "from-rose-500/30 to-rose-500/30",
              "from-rose-600/25 to-rose-600/25",
              "from-rose-700/20 to-rose-700/20",
              "from-rose-900/15 to-rose-900/15",
              "from-emerald-900/15 to-emerald-900/15",
              "from-emerald-700/20 to-emerald-700/20",
              "from-emerald-600/25 to-emerald-600/25",
              "from-emerald-500/30 to-emerald-500/30",
              "from-emerald-500/40 to-emerald-500/40",
            ].map((gradient, i) => (
              <div key={i} className={`bg-gradient-to-r ${gradient} w-7 h-4 ${i === 0 ? "rounded-l-full" : ""} ${i === 9 ? "rounded-r-full" : ""} border border-white/5`} />
            ))}
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider ml-2">Bullish</span>
          </div>

          {/* Heatmap Grid */}
          {loading && stocks.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 27 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {sectorAvgs.map(({ name, avg, items }) => (
                <div key={name}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg">{SECTOR_ICONS[name] ?? "📊"}</span>
                    <h2 className="text-base font-black tracking-tight">{name}</h2>
                    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      avg >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {avg >= 0 ? <FiArrowUp size={9} /> : <FiArrowDown size={9} />}
                      {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
                    </div>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {items.map((stock) => {
                      const dp = stock.quote?.dp ?? 0;
                      const price = stock.quote?.c ?? 0;
                      const isPositive = dp >= 0;
                      return (
                        <Link
                          key={stock.symbol}
                          href={`/?ticker=${encodeURIComponent(stock.symbol)}`}
                          className={`group relative rounded-2xl bg-gradient-to-br ${getHeatBg(dp)} border ${getHeatBorder(dp)} p-4 transition-all duration-300 hover:scale-[1.03] hover:border-white/30 shadow-lg ${getHeatGlow(dp)} backdrop-blur-sm`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-black text-white tracking-tight">{stock.symbol}</p>
                              <p className="text-[10px] text-white/40 mt-0.5">{stock.name}</p>
                            </div>
                            <div className={`rounded-full p-1 ${isPositive ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                              {isPositive ? <FiArrowUp size={10} className="text-emerald-400" /> : <FiArrowDown size={10} className="text-rose-400" />}
                            </div>
                          </div>
                          <div className="mt-3">
                            {price > 0 ? (
                              <>
                                <p className="text-lg font-black text-white/90">{cSym}{cConv(price).toFixed(2)}</p>
                                <p className={`text-xs font-bold mt-0.5 ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                  {isPositive ? "+" : ""}{dp.toFixed(2)}%
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-600">Loading...</p>
                            )}
                          </div>
                          <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${isPositive ? "from-emerald-500/5 to-transparent" : "from-rose-500/5 to-transparent"}`} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Background>
  );
}

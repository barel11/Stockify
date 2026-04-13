"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiFilter,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import Navbar from "@/components/Navbar";
import Background from "@/components/Background";

type QuoteData = { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number };
type ProfileData = {
  name?: string;
  exchange?: string;
  finnhubIndustry?: string;
  marketCapitalization?: number;
  country?: string;
};
type MetricsData = {
  metric?: {
    peBasicExclExtraTTM?: number;
    dividendYieldIndicatedAnnual?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
  };
};

type ScreenerResult = {
  symbol: string;
  quote: QuoteData | null;
  profile: ProfileData | null;
  metrics: MetricsData | null;
};

type SortKey = "symbol" | "price" | "change" | "marketCap" | "pe" | "divYield" | "beta";

const SCREENER_UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META", "TSLA", "TSM", "BRK.B", "V",
  "JPM", "JNJ", "UNH", "XOM", "WMT", "MA", "PG", "HD", "CVX", "LLY",
  "MRK", "ABBV", "PEP", "KO", "BAC", "COST", "AVGO", "TMO", "CSCO", "MCD",
  "ACN", "ABT", "CRM", "DHR", "NKE", "TXN", "LIN", "NFLX", "AMD", "INTC",
  "DIS", "CMCSA", "VZ", "PM", "ADBE", "HON", "QCOM", "BA", "CAT", "GS",
];

function fmtMktCap(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}T`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
}

export default function ScreenerPage() {
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortAsc, setSortAsc] = useState(false);

  // Filters
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sector, setSector] = useState("All");
  const [minMktCap, setMinMktCap] = useState("All");

  const scan = async () => {
    setLoading(true);
    setScanned(true);
    try {
      const fetched = await Promise.all(
        SCREENER_UNIVERSE.map(async (symbol) => {
          const [qr, pr, mr] = await Promise.allSettled([
            fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`),
            fetch(`/api/company?symbol=${encodeURIComponent(symbol)}`),
            fetch(`/api/metrics?symbol=${encodeURIComponent(symbol)}`),
          ]);
          const parse = async <T,>(r: PromiseSettledResult<Response>): Promise<T | null> => {
            if (r.status === "fulfilled" && r.value.ok) return (await r.value.json()) as T;
            return null;
          };
          return {
            symbol,
            quote: await parse<QuoteData>(qr),
            profile: await parse<ProfileData>(pr),
            metrics: await parse<MetricsData>(mr),
          };
        })
      );
      setResults(fetched.filter((r) => r.quote && r.quote.c > 0));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filtered = results.filter((r) => {
    const price = r.quote?.c ?? 0;
    if (minPrice && price < Number(minPrice)) return false;
    if (maxPrice && price > Number(maxPrice)) return false;
    if (sector !== "All" && r.profile?.finnhubIndustry !== sector) return false;
    const mc = r.profile?.marketCapitalization ?? 0;
    if (minMktCap === "Large" && mc < 10000) return false;
    if (minMktCap === "Mid" && (mc < 2000 || mc >= 10000)) return false;
    if (minMktCap === "Small" && mc >= 2000) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av = 0, bv = 0;
    switch (sortKey) {
      case "symbol": return sortAsc ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      case "price": av = a.quote?.c ?? 0; bv = b.quote?.c ?? 0; break;
      case "change": av = a.quote?.dp ?? 0; bv = b.quote?.dp ?? 0; break;
      case "marketCap": av = a.profile?.marketCapitalization ?? 0; bv = b.profile?.marketCapitalization ?? 0; break;
      case "pe": av = a.metrics?.metric?.peBasicExclExtraTTM ?? 999; bv = b.metrics?.metric?.peBasicExclExtraTTM ?? 999; break;
      case "divYield": av = a.metrics?.metric?.dividendYieldIndicatedAnnual ?? 0; bv = b.metrics?.metric?.dividendYieldIndicatedAnnual ?? 0; break;
      case "beta": av = a.metrics?.metric?.beta ?? 0; bv = b.metrics?.metric?.beta ?? 0; break;
    }
    return sortAsc ? av - bv : bv - av;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />;
  };

  const sectors = Array.from(new Set(results.map((r) => r.profile?.finnhubIndustry).filter(Boolean))) as string[];

  return (
    <Background>
      <Navbar />

      <div className="relative z-10 pt-28 px-4 sm:px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <FiFilter className="text-blue-400 text-2xl" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Screener</h1>
          </div>
          <p className="text-gray-400 text-sm mb-6">Scan and filter the top 50 S&P 500 stocks in real time.</p>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { label: "High Dividend", minP: "", maxP: "", sec: "All", cap: "All", sort: "divYield" as SortKey, filter: (r: ScreenerResult) => (r.metrics?.metric?.dividendYieldIndicatedAnnual ?? 0) > 2 },
              { label: "Tech Giants", minP: "", maxP: "", sec: "Technology", cap: "Large", sort: "marketCap" as SortKey },
              { label: "Value Picks", minP: "", maxP: "100", sec: "All", cap: "All", sort: "pe" as SortKey },
              { label: "Low Beta", minP: "", maxP: "", sec: "All", cap: "All", sort: "beta" as SortKey },
              { label: "Large Cap", minP: "", maxP: "", sec: "All", cap: "Large", sort: "marketCap" as SortKey },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setMinPrice(preset.minP);
                  setMaxPrice(preset.maxP);
                  setSector(preset.sec);
                  setMinMktCap(preset.cap);
                  setSortKey(preset.sort);
                  setSortAsc(preset.sort === "pe" || preset.sort === "beta");
                  if (results.length === 0) scan();
                }}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:border-blue-500/30 hover:text-blue-300 hover:bg-blue-500/5 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 sm:p-6 shadow-2xl mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-1.5">Min Price</label>
                <input type="number" placeholder="$0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-1.5">Max Price</label>
                <input type="number" placeholder="$∞" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-1.5">Sector</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none">
                  <option value="All">All Sectors</option>
                  {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-1.5">Market Cap</label>
                <select value={minMktCap} onChange={(e) => setMinMktCap(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none">
                  <option value="All">All Sizes</option>
                  <option value="Large">Large Cap (10B+)</option>
                  <option value="Mid">Mid Cap (2B-10B)</option>
                  <option value="Small">Small Cap (&lt;2B)</option>
                </select>
              </div>
              <button
                onClick={scan}
                disabled={loading}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white transition-all shadow-lg shadow-blue-600/20"
              >
                {loading ? "Scanning..." : "Scan Market"}
              </button>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 animate-pulse h-16" />
              ))}
            </div>
          ) : sorted.length > 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Table header */}
              <div className="hidden lg:grid grid-cols-[0.6fr_1.2fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr] gap-2 px-6 py-3 border-b border-white/10 bg-white/[0.02]">
                {([
                  ["symbol", "Symbol"],
                  ["symbol", "Company"],
                  ["price", "Price"],
                  ["change", "Change"],
                  ["marketCap", "Mkt Cap"],
                  ["pe", "P/E"],
                  ["divYield", "Div %"],
                  ["beta", "Beta"],
                ] as [SortKey, string][]).map(([key, label], idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleSort(key)}
                    className={`flex items-center gap-1 text-[9px] uppercase tracking-[0.28em] font-bold transition-colors ${
                      sortKey === key ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
                    } ${idx >= 2 ? "justify-end" : ""}`}
                  >
                    {label} <SortIcon col={key} />
                  </button>
                ))}
              </div>

              {sorted.map((r) => {
                const dp = r.quote?.dp ?? 0;
                const isPos = dp >= 0;
                return (
                  <Link
                    key={r.symbol}
                    href={`/?ticker=${encodeURIComponent(r.symbol)}`}
                    className="grid grid-cols-2 lg:grid-cols-[0.6fr_1.2fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr] gap-2 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors items-center"
                  >
                    <p className="text-sm font-black text-white">{r.symbol}</p>
                    <p className="text-xs text-gray-400 truncate hidden lg:block">{r.profile?.name ?? "—"}</p>
                    <p className="text-sm font-bold text-white text-right">${(r.quote?.c ?? 0).toFixed(2)}</p>
                    <p className={`text-sm font-bold text-right ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPos ? "+" : ""}{dp.toFixed(2)}%
                    </p>
                    <p className="text-sm font-bold text-gray-400 text-right hidden lg:block">{fmtMktCap(r.profile?.marketCapitalization)}</p>
                    <p className="text-sm font-bold text-gray-400 text-right hidden lg:block">{r.metrics?.metric?.peBasicExclExtraTTM?.toFixed(1) ?? "—"}</p>
                    <p className="text-sm font-bold text-gray-400 text-right hidden lg:block">{r.metrics?.metric?.dividendYieldIndicatedAnnual?.toFixed(2) ?? "—"}%</p>
                    <p className="text-sm font-bold text-gray-400 text-right hidden lg:block">{r.metrics?.metric?.beta?.toFixed(2) ?? "—"}</p>
                  </Link>
                );
              })}

              <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02]">
                <p className="text-[10px] text-gray-500 font-bold">
                  Showing {sorted.length} of {results.length} results {sector !== "All" && `in ${sector}`}
                </p>
              </div>
            </div>
          ) : scanned ? (
            <div className="text-center py-20">
              <FiSearch className="mx-auto text-4xl text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-gray-400 mb-2">No results match your filters</h2>
              <p className="text-sm text-gray-500">Try adjusting the filters and scanning again.</p>
            </div>
          ) : (
            <div className="text-center py-20">
              <FiBarChart2 className="mx-auto text-4xl text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-gray-400 mb-2">Ready to scan</h2>
              <p className="text-sm text-gray-500 mb-6">Set your filters and hit Scan Market to fetch live data for 50 major stocks.</p>
            </div>
          )}
        </div>
      </div>
    </Background>
  );
}

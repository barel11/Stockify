"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useCurrency } from "@/lib/use-currency";
import Navbar from "@/components/Navbar";
import Background from "@/components/Background";
import Image from "next/image";
import { createChart, ColorType, CrosshairMode, LineSeries } from "lightweight-charts";
import {
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiBarChart2,
  FiTrendingUp,
  FiGlobe,
  FiBriefcase,
  FiActivity,
  FiAward,
  FiMinus,
  FiPlus,
  FiTarget,
  FiShield,
} from "react-icons/fi";

// ── Types ────────────────────────────────────────────────────────────────────

type SuggestionItem = { symbol: string; description: string };

type FinnhubSearchResult = {
  symbol: string;
  description?: string;
  displaySymbol?: string;
  type?: string;
};

type QuoteData = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

type ProfileData = {
  name?: string;
  logo?: string;
  exchange?: string;
  finnhubIndustry?: string;
  marketCapitalization?: number;
  country?: string;
  currency?: string;
};

type RecommendationTrend = {
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
  period: string;
};

type MetricsData = {
  metric?: {
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    "52WeekHighDate"?: string;
    "52WeekLowDate"?: string;
    peBasicExclExtraTTM?: number;
    pbAnnual?: number;
    dividendYieldIndicatedAnnual?: number;
    epsBasicExclExtraItemsTTM?: number;
    roeTTM?: number;
    revenuePerShareTTM?: number;
    "10DayAverageTradingVolume"?: number;
    beta?: number;
  };
};

type PriceTargetData = {
  targetHigh?: number | null;
  targetLow?: number | null;
  targetMean?: number | null;
  targetMedian?: number | null;
};

type EarningsItem = {
  actual?: number | null;
  estimate?: number | null;
  period?: string;
  surprise?: number | null;
  surprisePercent?: number | null;
  symbol?: string;
};

type TickerData = {
  symbol: string;
  quote: QuoteData | null;
  profile: ProfileData | null;
  recommendations: RecommendationTrend[];
  metrics: MetricsData | null;
  priceTarget: PriceTargetData | null;
  earnings: EarningsItem[];
};

// ── Static Data ─────────────────────────────────────────────────────────────

const MARKET_DB: SuggestionItem[] = [
  { symbol: "BINANCE:BTCUSDT", description: "Bitcoin (BTC / USD)" },
  { symbol: "BINANCE:ETHUSDT", description: "Ethereum (ETH / USD)" },
  { symbol: "BINANCE:SOLUSDT", description: "Solana (SOL / USD)" },
  { symbol: "BINANCE:XRPUSDT", description: "XRP (XRP / USD)" },
  { symbol: "OANDA:EUR_USD", description: "Euro / US Dollar (Forex)" },
  { symbol: "OANDA:GBP_USD", description: "British Pound / US Dollar" },
  { symbol: "OANDA:USD_JPY", description: "US Dollar / Japanese Yen" },
  { symbol: "OANDA:XAU_USD", description: "Gold / US Dollar" },
];

const SYMBOL_ALIASES: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
  XRP: "BINANCE:XRPUSDT",
  "EUR/USD": "OANDA:EUR_USD",
  EURUSD: "OANDA:EUR_USD",
  EUR_USD: "OANDA:EUR_USD",
  "GBP/USD": "OANDA:GBP_USD",
  GBPUSD: "OANDA:GBP_USD",
  GBP_USD: "OANDA:GBP_USD",
  USDJPY: "OANDA:USD_JPY",
  USD_JPY: "OANDA:USD_JPY",
  XAUUSD: "OANDA:XAU_USD",
  XAU_USD: "OANDA:XAU_USD",
  GOLD: "OANDA:XAU_USD",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const cleanSymbol = (symbol: string) =>
  symbol.replace("BINANCE:", "").replace("COINBASE:", "").replace("OANDA:", "");

function fmt(value: number | null | undefined, digits = 2, sym = "$", conv?: (n: number) => number): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  const v = conv ? conv(value) : value;
  return `${sym}${v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(digits)}%`;
}

function fmtMarketCap(value: number | null | undefined, sym = "$", conv?: (n: number) => number): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  const v = conv ? conv(value) : value;
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}T`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(2)}B`;
  return `${sym}${v.toFixed(0)}M`;
}

const dedupeSuggestions = (items: SuggestionItem[]) => {
  const map = new Map<string, SuggestionItem>();
  for (const item of items) {
    if (!map.has(item.symbol)) map.set(item.symbol, item);
  }
  return Array.from(map.values());
};

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchTicker(symbol: string): Promise<TickerData> {
  const upper = symbol.trim().toUpperCase();
  const isStock = !upper.includes(":"); // crypto/forex have BINANCE: or OANDA: prefix

  const parse = async <T,>(r: PromiseSettledResult<Response>): Promise<T | null> => {
    if (r.status === "fulfilled" && r.value.ok) return (await r.value.json()) as T;
    return null;
  };

  // Fetch core data first (quote + profile)
  const [quoteRes, profileRes] = await Promise.allSettled([
    fetch(`/api/quote?symbol=${encodeURIComponent(upper)}`),
    fetch(`/api/company?symbol=${encodeURIComponent(upper)}`),
  ]);

  // Only fetch stock-specific data for actual stocks (not crypto/forex)
  let recRes: PromiseSettledResult<Response> | null = null;
  let metricsRes: PromiseSettledResult<Response> | null = null;
  let ptRes: PromiseSettledResult<Response> | null = null;
  let earningsRes: PromiseSettledResult<Response> | null = null;

  if (isStock) {
    // Small delay to avoid rate limiting when fetching both tickers
    await new Promise((r) => setTimeout(r, 300));
    [recRes, metricsRes, ptRes, earningsRes] = await Promise.allSettled([
      fetch(`/api/recommendations?symbol=${encodeURIComponent(upper)}`),
      fetch(`/api/metrics?symbol=${encodeURIComponent(upper)}`),
      fetch(`/api/price-target?symbol=${encodeURIComponent(upper)}`),
      fetch(`/api/earnings?symbol=${encodeURIComponent(upper)}`),
    ]);
  }

  return {
    symbol: upper,
    quote: await parse<QuoteData>(quoteRes),
    profile: await parse<ProfileData>(profileRes),
    recommendations: recRes ? ((await parse<RecommendationTrend[]>(recRes)) ?? []) : [],
    metrics: metricsRes ? await parse<MetricsData>(metricsRes) : null,
    priceTarget: ptRes ? await parse<PriceTargetData>(ptRes) : null,
    earnings: earningsRes ? ((await parse<EarningsItem[]>(earningsRes)) ?? []) : [],
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LogoSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id="cmp-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="#0a0a0a" />
      <rect x="96"  y="280" width="56" height="140" rx="8" fill="url(#cmp-logo-g)" opacity="0.5" />
      <rect x="192" y="200" width="56" height="220" rx="8" fill="url(#cmp-logo-g)" opacity="0.65" />
      <rect x="288" y="140" width="56" height="280" rx="8" fill="url(#cmp-logo-g)" opacity="0.8" />
      <rect x="384" y="80"  width="56" height="340" rx="8" fill="url(#cmp-logo-g)" />
      <line x1="124" y1="270" x2="412" y2="70" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

// Autocomplete dropdown for a ticker input
function SuggestionDropdown({
  suggestions,
  visible,
  onSelect,
}: {
  suggestions: SuggestionItem[];
  visible: boolean;
  onSelect: (symbol: string) => void;
}) {
  if (!visible || suggestions.length === 0) return null;
  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
      {suggestions.map((item) => (
        <div
          key={`${item.symbol}-${item.description}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item.symbol); }}
          className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-blue-900/30 cursor-pointer border-b border-white/5 last:border-0 transition-colors min-w-0"
        >
          <span className="font-bold text-blue-400 tracking-wider text-sm min-w-0 break-all">
            {item.symbol}
          </span>
          <span className="text-gray-400 text-xs text-right min-w-0 break-words">
            {item.description}
          </span>
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl animate-pulse w-full">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-2xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-28 bg-white/10 rounded-full" />
          <div className="h-4 w-40 bg-white/5 rounded-full" />
        </div>
      </div>
      <div className="mb-6 space-y-2">
        <div className="h-10 w-36 bg-white/10 rounded-full" />
        <div className="h-6 w-24 bg-white/5 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <div className="h-3 w-16 bg-white/10 rounded-full mb-2" />
            <div className="h-5 w-24 bg-white/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatRow({
  label,
  a,
  b,
  winnerSide,
}: {
  label: string;
  a: string;
  b: string;
  winnerSide: "left" | "right" | "tie" | null;
}) {
  const leftWin = winnerSide === "left";
  const rightWin = winnerSide === "right";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2.5 border-b border-white/5 last:border-0">
      <span
        className={`text-right text-sm font-bold transition-colors ${
          leftWin ? "text-emerald-400" : "text-white"
        }`}
      >
        {a}
      </span>
      <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold whitespace-nowrap px-2 text-center">
        {label}
      </span>
      <span
        className={`text-left text-sm font-bold transition-colors ${
          rightWin ? "text-emerald-400" : "text-white"
        }`}
      >
        {b}
      </span>
    </div>
  );
}

function TickerCard({
  data,
  isWinner,
}: {
  data: TickerData;
  isWinner: boolean;
}) {
  const { symbol: cSym, convert: cConv } = useCurrency();
  const f = useCallback((v: number | null | undefined, d = 2) => fmt(v, d, cSym, cConv), [cSym, cConv]);
  const fMC = useCallback((v: number | null | undefined) => fmtMarketCap(v, cSym, cConv), [cSym, cConv]);
  const { quote, profile, symbol, recommendations, metrics, priceTarget, earnings } = data;
  const isPositive = (quote?.dp ?? 0) >= 0;
  const initial = (profile?.name ?? symbol).charAt(0).toUpperCase();
  const m = metrics?.metric;
  const latestRec = recommendations.length > 0 ? recommendations[0] : null;
  const latestEarnings = earnings.length > 0 ? earnings[0] : null;

  return (
    <div
      className={`relative rounded-3xl border backdrop-blur-xl p-6 shadow-2xl transition-all duration-300 w-full ${
        isWinner
          ? "border-emerald-500/40 bg-emerald-950/30 shadow-emerald-900/20"
          : "border-white/10 bg-black/60 hover:border-white/20"
      }`}
    >
      {isWinner && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 backdrop-blur-xl px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">
          <FiAward size={12} />
          Winner Today
        </div>
      )}

      {/* Company header */}
      <div className="flex items-center gap-4 mb-6 mt-1">
        <div className="relative shrink-0 h-14 w-14 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
          {profile?.logo ? (
            <Image src={profile.logo} alt={profile.name ?? symbol} fill className="object-contain p-1" unoptimized />
          ) : (
            <span className="text-2xl font-black text-white/80">{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-black tracking-tight text-white leading-none">{symbol}</p>
          {profile?.name && (
            <p className="mt-1 text-xs text-gray-400 truncate max-w-[180px]">{profile.name}</p>
          )}
        </div>
      </div>

      {/* Price + change */}
      {quote && quote.c > 0 ? (
        <div className="mb-6">
          <p className="text-3xl font-black text-white tabular-nums">{f(quote.c)}</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black ${
                isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              }`}
            >
              {isPositive ? <FiArrowUp size={13} /> : <FiArrowDown size={13} />}
              {isPositive ? "+" : ""}{quote.dp.toFixed(2)}%
            </span>
            <span className={`text-sm font-bold ${isPositive ? "text-emerald-400/70" : "text-rose-400/70"}`}>
              {isPositive ? "+" : ""}{f(quote.d)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-2xl font-black text-gray-600">N/A</p>
          <p className="mt-1 text-xs text-gray-600">Price unavailable</p>
        </div>
      )}

      {/* OHLC + fundamentals grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: "Open",        value: f(quote?.o) },
          { label: "Prev Close",  value: f(quote?.pc) },
          { label: "High",        value: quote?.h ? f(quote.h) : "N/A" },
          { label: "Low",         value: quote?.l ? f(quote.l) : "N/A" },
          { label: "52W High",    value: f(m?.["52WeekHigh"]) },
          { label: "52W Low",     value: f(m?.["52WeekLow"]) },
          { label: "P/E Ratio",   value: fmtNum(m?.peBasicExclExtraTTM) },
          { label: "P/B Ratio",   value: fmtNum(m?.pbAnnual) },
          { label: "EPS (TTM)",   value: f(m?.epsBasicExclExtraItemsTTM) },
          { label: "Div Yield",   value: m?.dividendYieldIndicatedAnnual != null ? fmtPct(m.dividendYieldIndicatedAnnual) : "N/A" },
          { label: "ROE",         value: m?.roeTTM != null ? fmtPct(m.roeTTM) : "N/A" },
          { label: "Beta",        value: fmtNum(m?.beta) },
          { label: "Market Cap",  value: fMC(profile?.marketCapitalization) },
          { label: "Exchange",    value: profile?.exchange ?? "N/A" },
          { label: "Industry",    value: profile?.finnhubIndustry ?? "N/A" },
          { label: "Country",     value: profile?.country ?? "N/A" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-all hover:border-white/20 hover:bg-white/[0.06]"
          >
            <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-1">{label}</p>
            <p className="text-sm font-bold text-white leading-tight truncate" title={value}>{value}</p>
          </div>
        ))}
      </div>

      {/* Analyst Recommendations */}
      {latestRec && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-3 flex items-center gap-1.5">
            <FiTarget size={10} /> Analyst Consensus ({latestRec.period.slice(0, 7)})
          </p>
          <div className="flex items-center gap-1.5">
            {[
              { label: "Strong Buy", count: latestRec.strongBuy, color: "bg-emerald-500" },
              { label: "Buy", count: latestRec.buy, color: "bg-emerald-400" },
              { label: "Hold", count: latestRec.hold, color: "bg-yellow-500" },
              { label: "Sell", count: latestRec.sell, color: "bg-rose-400" },
              { label: "Strong Sell", count: latestRec.strongSell, color: "bg-rose-600" },
            ].map((r) => {
              const total = latestRec.strongBuy + latestRec.buy + latestRec.hold + latestRec.sell + latestRec.strongSell;
              const pct = total > 0 ? (r.count / total) * 100 : 0;
              return pct > 0 ? (
                <div
                  key={r.label}
                  className={`${r.color} rounded-full h-3 transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${r.label}: ${r.count} (${pct.toFixed(0)}%)`}
                />
              ) : null;
            })}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
            <span>Buy {latestRec.strongBuy + latestRec.buy}</span>
            <span>Hold {latestRec.hold}</span>
            <span>Sell {latestRec.sell + latestRec.strongSell}</span>
          </div>
        </div>
      )}

      {/* Price Target */}
      {priceTarget && priceTarget.targetMean != null && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-2 flex items-center gap-1.5">
            <FiShield size={10} /> Price Target
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase">Low</p>
              <p className="text-sm font-bold text-rose-400">{f(priceTarget.targetLow)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase">Mean</p>
              <p className="text-sm font-bold text-blue-400">{f(priceTarget.targetMean)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase">High</p>
              <p className="text-sm font-bold text-emerald-400">{f(priceTarget.targetHigh)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Latest Earnings */}
      {latestEarnings && latestEarnings.actual != null && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-2 flex items-center gap-1.5">
            <FiBriefcase size={10} /> Latest Earnings ({latestEarnings.period ?? "N/A"})
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase">Actual</p>
              <p className="text-sm font-bold text-white">{f(latestEarnings.actual)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase">Estimate</p>
              <p className="text-sm font-bold text-gray-400">{f(latestEarnings.estimate)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase">Surprise</p>
              <p className={`text-sm font-bold ${(latestEarnings.surprisePercent ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {latestEarnings.surprisePercent != null ? `${latestEarnings.surprisePercent >= 0 ? "+" : ""}${latestEarnings.surprisePercent.toFixed(2)}%` : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Head-to-head comparison table
function ComparisonTable({ left, right }: { left: TickerData; right: TickerData }) {
  const { symbol: cSym, convert: cConv } = useCurrency();
  const f = useCallback((v: number | null | undefined, d = 2) => fmt(v, d, cSym, cConv), [cSym, cConv]);
  const fMC = useCallback((v: number | null | undefined) => fmtMarketCap(v, cSym, cConv), [cSym, cConv]);
  const lq = left.quote;
  const rq = right.quote;
  const lp = left.profile;
  const rp = right.profile;
  const lm = left.metrics?.metric;
  const rm = right.metrics?.metric;
  const lpt = left.priceTarget;
  const rpt = right.priceTarget;
  const lRec = left.recommendations[0];
  const rRec = right.recommendations[0];

  const winner = (lv: number | null | undefined, rv: number | null | undefined, higherIsBetter = true) => {
    if (lv == null || rv == null || !Number.isFinite(lv) || !Number.isFinite(rv)) return null;
    if (Math.abs(lv - rv) < 1e-9) return "tie" as const;
    const leftWins = higherIsBetter ? lv > rv : lv < rv;
    return leftWins ? "left" : "right";
  };

  const buyPct = (r?: RecommendationTrend) => {
    if (!r) return null;
    const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
    return total > 0 ? ((r.strongBuy + r.buy) / total) * 100 : null;
  };

  type RowDef = {
    label: string;
    a: string;
    b: string;
    winnerSide: "left" | "right" | "tie" | null;
  };

  const sections: { title: string; icon: React.ReactNode; rows: RowDef[] }[] = [
    {
      title: "Price & Performance",
      icon: <FiTrendingUp size={12} />,
      rows: [
        {
          label: "Daily Change %",
          a: lq ? `${lq.dp >= 0 ? "+" : ""}${lq.dp.toFixed(2)}%` : "N/A",
          b: rq ? `${rq.dp >= 0 ? "+" : ""}${rq.dp.toFixed(2)}%` : "N/A",
          winnerSide: winner(lq?.dp, rq?.dp),
        },
        { label: "Current Price", a: f(lq?.c), b: f(rq?.c), winnerSide: null },
        { label: "Day High", a: f(lq?.h), b: f(rq?.h), winnerSide: winner(lq?.h, rq?.h) },
        { label: "Day Low", a: f(lq?.l), b: f(rq?.l), winnerSide: winner(lq?.l, rq?.l, false) },
        { label: "52W High", a: f(lm?.["52WeekHigh"]), b: f(rm?.["52WeekHigh"]), winnerSide: winner(lm?.["52WeekHigh"], rm?.["52WeekHigh"]) },
        { label: "52W Low", a: f(lm?.["52WeekLow"]), b: f(rm?.["52WeekLow"]), winnerSide: winner(lm?.["52WeekLow"], rm?.["52WeekLow"], false) },
      ],
    },
    {
      title: "Fundamentals",
      icon: <FiBriefcase size={12} />,
      rows: [
        { label: "Market Cap", a: fMC(lp?.marketCapitalization), b: fMC(rp?.marketCapitalization), winnerSide: winner(lp?.marketCapitalization, rp?.marketCapitalization) },
        { label: "P/E Ratio", a: fmtNum(lm?.peBasicExclExtraTTM), b: fmtNum(rm?.peBasicExclExtraTTM), winnerSide: winner(lm?.peBasicExclExtraTTM, rm?.peBasicExclExtraTTM, false) },
        { label: "P/B Ratio", a: fmtNum(lm?.pbAnnual), b: fmtNum(rm?.pbAnnual), winnerSide: winner(lm?.pbAnnual, rm?.pbAnnual, false) },
        { label: "EPS (TTM)", a: f(lm?.epsBasicExclExtraItemsTTM), b: f(rm?.epsBasicExclExtraItemsTTM), winnerSide: winner(lm?.epsBasicExclExtraItemsTTM, rm?.epsBasicExclExtraItemsTTM) },
        { label: "Div Yield", a: lm?.dividendYieldIndicatedAnnual != null ? fmtPct(lm.dividendYieldIndicatedAnnual) : "N/A", b: rm?.dividendYieldIndicatedAnnual != null ? fmtPct(rm.dividendYieldIndicatedAnnual) : "N/A", winnerSide: winner(lm?.dividendYieldIndicatedAnnual, rm?.dividendYieldIndicatedAnnual) },
        { label: "ROE", a: lm?.roeTTM != null ? fmtPct(lm.roeTTM) : "N/A", b: rm?.roeTTM != null ? fmtPct(rm.roeTTM) : "N/A", winnerSide: winner(lm?.roeTTM, rm?.roeTTM) },
        { label: "Beta", a: fmtNum(lm?.beta), b: fmtNum(rm?.beta), winnerSide: null },
      ],
    },
    {
      title: "Analyst Ratings",
      icon: <FiTarget size={12} />,
      rows: [
        { label: "Buy %", a: buyPct(lRec) != null ? fmtPct(buyPct(lRec)) : "N/A", b: buyPct(rRec) != null ? fmtPct(buyPct(rRec)) : "N/A", winnerSide: winner(buyPct(lRec), buyPct(rRec)) },
        { label: "Target Mean", a: f(lpt?.targetMean || undefined), b: f(rpt?.targetMean || undefined), winnerSide: null },
        { label: "Target High", a: f(lpt?.targetHigh || undefined), b: f(rpt?.targetHigh || undefined), winnerSide: null },
        { label: "Target Low", a: f(lpt?.targetLow || undefined), b: f(rpt?.targetLow || undefined), winnerSide: null },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const hasData = section.rows.some((r) => r.a !== "N/A" || r.b !== "N/A");
        if (!hasData) return null;
        return (
          <div key={section.title} className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-4">
              {section.icon}
              {section.title}
            </p>
            <div className="flex items-center mb-4">
              <span className="flex-1 text-right text-sm font-black text-white">{left.symbol}</span>
              <span className="mx-4 text-gray-600 font-bold text-xs">VS</span>
              <span className="flex-1 text-left text-sm font-black text-white">{right.symbol}</span>
            </div>
            <div>
              {section.rows.map((row) => (
                <StatRow key={row.label} {...row} />
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-gray-600 text-center">
        Green highlight = better value for that metric
      </p>
    </div>
  );
}

function EmptyPrompt() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
        <FiBarChart2 className="text-3xl text-blue-400" />
      </div>
      <h2 className="text-2xl font-black text-white mb-3">Compare Any Two Tickers</h2>
      <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
        Enter two stock, crypto, or forex symbols above and hit Compare to see a side-by-side
        breakdown of prices, performance, and fundamentals.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {["AAPL vs MSFT", "TSLA vs F", "NVDA vs AMD", "AMZN vs GOOG"].map((pair) => (
          <span
            key={pair}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-gray-400"
          >
            {pair}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Comparison Chart ────────────────────────────────────────────────────────

function ComparisonChart({ symbolA, symbolB }: { symbolA: string; symbolB: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.textContent = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.textContent = JSON.stringify({
      symbols: [
        [symbolA, `${symbolA}|1D`],
        [symbolB, `${symbolB}|1D`],
      ],
      chartOnly: false,
      width: "100%",
      height: 500,
      locale: "en",
      colorTheme: "dark",
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: true,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Percentage",
      fontFamily: "Inter Tight, -apple-system, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridLineColor: "rgba(255, 255, 255, 0.05)",
    });

    containerRef.current.appendChild(script);
  }, [symbolA, symbolB]);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 shadow-2xl overflow-hidden">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-3 px-2">
        <FiTrendingUp size={12} />
        Price Comparison Chart
      </p>
      <div className="tradingview-widget-container" ref={containerRef} style={{ minHeight: 500 }} />
    </div>
  );
}

// ── Historical Performance Comparison ────────────────────────────────────────

function PerformanceCompare({ symbolA, symbolB }: { symbolA: string; symbolB: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y">("3M");
  const [loading, setLoading] = useState(true);

  const rangeDays: Record<string, number> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6b7280",
        fontSize: 11,
        fontFamily: "Inter Tight, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.05)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.05)",
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2, labelBackgroundColor: "#1e3a5f" },
        horzLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2, labelBackgroundColor: "#1e3a5f" },
      },
      handleScroll: { vertTouchDrag: false },
      width: containerRef.current.clientWidth,
      height: 320,
    });
    chartRef.current = chart;

    const fetchBoth = async () => {
      setLoading(true);
      const days = rangeDays[range];
      const to = Math.floor(Date.now() / 1000);
      const from = to - days * 86400;
      const resolution = days <= 30 ? "60" : "D";

      try {
        const typeA = symbolA.includes(":") ? (symbolA.startsWith("OANDA:") ? "forex" : "crypto") : "stock";
        const typeB = symbolB.includes(":") ? (symbolB.startsWith("OANDA:") ? "forex" : "crypto") : "stock";
        const [resA, resB] = await Promise.all([
          fetch(`/api/candles?symbol=${encodeURIComponent(symbolA)}&resolution=${resolution}&from=${from}&to=${to}&type=${typeA}`).then((r) => r.json()),
          fetch(`/api/candles?symbol=${encodeURIComponent(symbolB)}&resolution=${resolution}&from=${from}&to=${to}&type=${typeB}`).then((r) => r.json()),
        ]);

        if (resA.s === "ok" && resA.c?.length > 0) {
          const baseA = resA.c[0];
          const seriesA = chart.addSeries(LineSeries, {
            color: "#3b82f6",
            lineWidth: 2,
            title: cleanSymbol(symbolA),
          });
          seriesA.setData(
            resA.t.map((t: number, i: number) => ({
              time: t,
              value: ((resA.c[i] - baseA) / baseA) * 100,
            }))
          );
        }

        if (resB.s === "ok" && resB.c?.length > 0) {
          const baseB = resB.c[0];
          const seriesB = chart.addSeries(LineSeries, {
            color: "#a855f7",
            lineWidth: 2,
            title: cleanSymbol(symbolB),
          });
          seriesB.setData(
            resB.t.map((t: number, i: number) => ({
              time: t,
              value: ((resB.c[i] - baseB) / baseB) * 100,
            }))
          );
        }

        chart.timeScale().fitContent();
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchBoth();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbolA, symbolB, range]);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold">
          <FiActivity size={12} />
          Normalized % Performance
        </p>
        <div className="flex items-center gap-1">
          {(["1M", "3M", "6M", "1Y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                range === r ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
          <span className="w-3 h-0.5 bg-blue-500 rounded" /> {cleanSymbol(symbolA)}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
          <span className="w-3 h-0.5 bg-purple-500 rounded" /> {cleanSymbol(symbolB)}
        </span>
      </div>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <div ref={containerRef} className={loading ? "opacity-30" : ""} />
      </div>
    </div>
  );
}

// ── Autocomplete Hook ────────────────────────────────────────────────────────

function useTickerAutocomplete() {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRef = useRef(0);

  const fetchSuggestions = useCallback(async (query: string) => {
    const requestId = ++counterRef.current;
    try {
      const localMatches = MARKET_DB.filter(
        (item) =>
          item.symbol.toUpperCase().includes(query) ||
          cleanSymbol(item.symbol).toUpperCase().includes(query) ||
          item.description.toUpperCase().includes(query)
      );

      const searchResults = await safeFetchJson<{ result?: FinnhubSearchResult[] }>(
        `/api/search?q=${encodeURIComponent(query)}`
      );

      if (requestId !== counterRef.current) return;

      const apiMatches: SuggestionItem[] = (searchResults?.result ?? []).slice(0, 5).map((item) => ({
        symbol: item.symbol,
        description: item.description || item.displaySymbol || item.symbol,
      }));

      const aliasMatches = Object.entries(SYMBOL_ALIASES)
        .filter(([alias]) => alias.includes(query))
        .slice(0, 4)
        .map(([alias, symbol]) => ({ symbol, description: `${alias} quick alias` }));

      setSuggestions(dedupeSuggestions([...localMatches, ...aliasMatches, ...apiMatches]).slice(0, 8));
      setShowSuggestions(true);
    } catch {
      if (requestId === counterRef.current) setShowSuggestions(false);
    }
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.toUpperCase();
      setValue(v);
      if (v.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
    },
    [fetchSuggestions]
  );

  const selectSuggestion = useCallback((symbol: string) => {
    setValue(symbol);
    setShowSuggestions(false);
    setSuggestions([]);
  }, []);

  const handleFocus = useCallback(() => {
    if (value.length >= 1 && suggestions.length > 0) setShowSuggestions(true);
  }, [value, suggestions]);

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowSuggestions(false), 150);
  }, []);

  return { value, setValue, suggestions, showSuggestions, handleChange, selectSuggestion, handleFocus, handleBlur };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const inputA = useTickerAutocomplete();
  const inputB = useTickerAutocomplete();
  const inputC = useTickerAutocomplete();
  const inputD = useTickerAutocomplete();
  const [extraCount, setExtraCount] = useState(0); // 0, 1, or 2 extra inputs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TickerData[] | null>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const inputCRef = useRef<HTMLInputElement>(null);
  const inputDRef = useRef<HTMLInputElement>(null);

  const allInputs = [inputA, inputB, ...(extraCount >= 1 ? [inputC] : []), ...(extraCount >= 2 ? [inputD] : [])];

  const handleCompare = async (e?: FormEvent) => {
    e?.preventDefault();
    const tickers = allInputs.map((inp) => inp.value.trim().toUpperCase()).filter(Boolean);
    if (tickers.length < 2) {
      setError("Please enter at least two ticker symbols.");
      return;
    }
    if (new Set(tickers).size !== tickers.length) {
      setError("Please enter unique ticker symbols.");
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);

    try {
      // Fetch sequentially to avoid Finnhub rate limits
      const data: TickerData[] = [];
      for (const t of tickers) {
        data.push(await fetchTicker(t));
      }
      setResults(data);
    } catch {
      setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDownA = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputA.value.trim() && !inputB.value.trim()) {
        inputBRef.current?.focus();
      } else {
        handleCompare();
      }
    }
  };

  const handleKeyDownB = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (extraCount >= 1 && !inputC.value.trim()) inputCRef.current?.focus();
      else handleCompare();
    }
  };

  const handleKeyDownC = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (extraCount >= 2 && !inputD.value.trim()) inputDRef.current?.focus();
      else handleCompare();
    }
  };

  const handleKeyDownD = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCompare();
  };

  const winner: "left" | "right" | "tie" | null = (() => {
    if (!results || results.length !== 2) return null;
    const [a, b] = results;
    const dpA = a.quote?.dp ?? null;
    const dpB = b.quote?.dp ?? null;
    if (dpA == null || dpB == null) return null;
    if (Math.abs(dpA - dpB) < 0.001) return "tie";
    return dpA > dpB ? "left" : "right";
  })();

  return (
    <Background>
      <Navbar />

      {/* Page content */}
      <div className="relative z-10 pt-28 px-4 sm:px-6 pb-32">
        <div className="max-w-6xl mx-auto">

          {/* Page heading */}
          <div className="flex items-center gap-3 mb-2">
            <FiBarChart2 className="text-blue-400 text-2xl shrink-0" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Compare</h1>
          </div>
          <p className="text-gray-400 text-sm mb-10">
            Side-by-side market comparison for up to four tickers.
          </p>

          {/* Search form */}
          <form
            onSubmit={handleCompare}
            className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 sm:p-6 shadow-2xl mb-8"
          >
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Ticker A */}
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Ticker A (e.g. AAPL)"
                  value={inputA.value}
                  onChange={inputA.handleChange}
                  onFocus={inputA.handleFocus}
                  onBlur={inputA.handleBlur}
                  onKeyDown={handleKeyDownA}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-3 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <SuggestionDropdown
                  suggestions={inputA.suggestions}
                  visible={inputA.showSuggestions}
                  onSelect={(sym) => { inputA.selectSuggestion(sym); inputBRef.current?.focus(); }}
                />
              </div>

              {/* VS divider */}
              <div className="flex items-center justify-center shrink-0">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                  VS
                </span>
              </div>

              {/* Ticker B */}
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none z-10" />
                <input
                  ref={inputBRef}
                  type="text"
                  placeholder="Ticker B (e.g. MSFT)"
                  value={inputB.value}
                  onChange={inputB.handleChange}
                  onFocus={inputB.handleFocus}
                  onBlur={inputB.handleBlur}
                  onKeyDown={handleKeyDownB}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-3 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <SuggestionDropdown
                  suggestions={inputB.suggestions}
                  visible={inputB.showSuggestions}
                  onSelect={inputB.selectSuggestion}
                />
              </div>

              {/* Ticker C */}
              {extraCount >= 1 && (
                <>
                  <div className="flex items-center justify-center shrink-0">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">VS</span>
                  </div>
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none z-10" />
                    <input
                      ref={inputCRef}
                      type="text"
                      placeholder="Ticker C (e.g. GOOG)"
                      value={inputC.value}
                      onChange={inputC.handleChange}
                      onFocus={inputC.handleFocus}
                      onBlur={inputC.handleBlur}
                      onKeyDown={handleKeyDownC}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-3 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                      autoCapitalize="characters"
                      spellCheck={false}
                    />
                    <SuggestionDropdown suggestions={inputC.suggestions} visible={inputC.showSuggestions} onSelect={inputC.selectSuggestion} />
                  </div>
                </>
              )}

              {/* Ticker D */}
              {extraCount >= 2 && (
                <>
                  <div className="flex items-center justify-center shrink-0">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">VS</span>
                  </div>
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none z-10" />
                    <input
                      ref={inputDRef}
                      type="text"
                      placeholder="Ticker D (e.g. AMZN)"
                      value={inputD.value}
                      onChange={inputD.handleChange}
                      onFocus={inputD.handleFocus}
                      onBlur={inputD.handleBlur}
                      onKeyDown={handleKeyDownD}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-3 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                      autoCapitalize="characters"
                      spellCheck={false}
                    />
                    <SuggestionDropdown suggestions={inputD.suggestions} visible={inputD.showSuggestions} onSelect={inputD.selectSuggestion} />
                  </div>
                </>
              )}

              {/* Add/Remove ticker buttons + Compare button */}
              {extraCount < 2 && (
                <button
                  type="button"
                  onClick={() => setExtraCount((c) => Math.min(c + 1, 2))}
                  className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-gray-400 hover:text-white hover:border-white/20 transition-all"
                  title="Add another ticker"
                >
                  <FiPlus size={16} />
                </button>
              )}
              {extraCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setExtraCount((c) => Math.max(c - 1, 0)); if (extraCount === 2) inputD.setValue(""); else inputC.setValue(""); }}
                  className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-gray-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                  title="Remove last ticker"
                >
                  <FiMinus size={16} />
                </button>
              )}

              {/* Compare button */}
              <button
                type="submit"
                disabled={loading}
                className="shrink-0 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 text-sm font-black uppercase tracking-wider text-white transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading
                  </span>
                ) : (
                  "Compare"
                )}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <FiMinus size={12} className="shrink-0" />
                {error}
              </p>
            )}
          </form>

          {/* States */}
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SkeletonCard />
                <SkeletonCard />
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl animate-pulse">
                <div className="h-4 w-32 bg-white/10 rounded-full mb-6" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 py-3 border-b border-white/5 last:border-0">
                    <div className="h-4 w-20 bg-white/5 rounded-full ml-auto" />
                    <div className="h-4 w-16 bg-white/10 rounded-full mx-auto" />
                    <div className="h-4 w-20 bg-white/5 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {/* Winner announcement banner */}
              {(() => {
                const sorted = [...results].filter((r) => r.quote?.dp != null).sort((a, b) => (b.quote?.dp ?? 0) - (a.quote?.dp ?? 0));
                const best = sorted[0];
                if (!best || sorted.length < 2) return null;
                const allSame = sorted.every((r) => Math.abs((r.quote?.dp ?? 0) - (best.quote?.dp ?? 0)) < 0.001);
                if (allSame) {
                  return (
                    <div className="rounded-3xl border border-blue-500/20 bg-blue-950/20 backdrop-blur-xl px-6 py-4 flex items-center gap-3">
                      <FiTrendingUp className="text-blue-400 text-xl shrink-0" />
                      <p className="text-sm font-black text-blue-300">All tickers are neck-and-neck today.</p>
                    </div>
                  );
                }
                return (
                  <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-xl px-6 py-4 flex items-center gap-3">
                    <FiAward className="text-emerald-400 text-xl shrink-0" />
                    <div>
                      <p className="text-sm font-black text-emerald-300">{best.symbol} is outperforming today</p>
                      <p className="text-xs text-emerald-400/60 mt-0.5">
                        {sorted.map((r) => `${r.symbol}: ${r.quote?.dp != null ? (r.quote.dp >= 0 ? "+" : "") + r.quote.dp.toFixed(2) + "%" : "N/A"}`).join(" | ")}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Cards grid — adapts to number of results */}
              <div className={`grid grid-cols-1 gap-5 ${results.length === 2 ? "md:grid-cols-2" : results.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
                {results.map((r) => {
                  const bestDp = Math.max(...results.map((t) => t.quote?.dp ?? -Infinity));
                  return <TickerCard key={r.symbol} data={r} isWinner={(r.quote?.dp ?? -Infinity) === bestDp && results.length > 1} />;
                })}
              </div>

              {/* Head-to-head table (only for 2 tickers) */}
              {results.length === 2 && (
                <ComparisonTable left={results[0]} right={results[1]} />
              )}

              {/* Performance chart */}
              {results.length === 2 && (
                <>
                  <ComparisonChart symbolA={results[0].symbol} symbolB={results[1].symbol} />
                  <PerformanceCompare symbolA={results[0].symbol} symbolB={results[1].symbol} />
                </>
              )}

              {/* Quick actions */}
              <div className={`grid grid-cols-1 gap-3 ${results.length <= 2 ? "sm:grid-cols-2" : results.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
                {results.map((ticker) => (
                  <Link
                    key={ticker.symbol}
                    href={`/?ticker=${encodeURIComponent(ticker.symbol)}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] hover:border-blue-500/30 hover:bg-blue-500/5 px-5 py-4 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <FiBarChart2 className="text-blue-400 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                          {ticker.symbol}
                        </p>
                        {ticker.profile?.name && (
                          <p className="text-xs text-gray-500">{ticker.profile.name}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 group-hover:text-blue-400 transition-colors">
                      Full Analysis
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <EmptyPrompt />
          )}
        </div>
      </div>
    </Background>
  );
}

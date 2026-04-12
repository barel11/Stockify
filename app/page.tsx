"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  FiSearch,
  FiTrendingUp,
  FiArrowUp,
  FiArrowDown,
  FiActivity,
  FiBarChart2,
  FiCpu,
  FiTarget,
  FiGlobe,
  FiShield,
  FiZap,
  FiLayers,
  FiBriefcase,
  FiCalendar,
  FiExternalLink,
  FiChevronUp,
} from "react-icons/fi";
import Image from "next/image";

const API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";

type AssetType = "stock" | "crypto" | "forex";
type TabKey = "overview" | "technical" | "fundamentals" | "news";
type AccentTone = "default" | "blue" | "green" | "rose" | "violet" | "amber";

type SuggestionItem = {
  symbol: string;
  description: string;
};

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
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  ipo?: string;
  logo?: string;
  marketCapitalization?: number;
  name?: string;
  shareOutstanding?: number;
  ticker?: string;
  weburl?: string;
};

type CandleData = {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  t: number[];
  v: number[];
  s: string;
};

type RecommendationTrend = {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
};

type BasicFinancialsData = {
  metric?: {
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
    peBasicExclExtraTTM?: number;
    epsBasicExclExtraItemsTTM?: number;
    dividendYieldIndicatedAnnual?: number;
    currentRatioQuarterly?: number;
    totalDebtToEquityQuarterly?: number;
  };
};

type NewsItem = {
  category?: string;
  datetime?: number;
  headline?: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
};

type EarningsItem = {
  actual?: number | null;
  estimate?: number | null;
  period?: string;
  quarter?: number;
  surprise?: number | null;
  surprisePercent?: number | null;
  symbol?: string;
  year?: number;
  revenueActual?: number | null;
  revenueEstimate?: number | null;
};

type PriceTargetData = {
  lastUpdated?: string;
  symbol?: string;
  targetHigh?: number | null;
  targetLow?: number | null;
  targetMean?: number | null;
  targetMedian?: number | null;
};

type SectionCardProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  headerRight?: ReactNode;
  className?: string;
  children: ReactNode;
};

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: AccentTone;
};

type ProgressBarProps = {
  label: string;
  value: number;
  tone?: AccentTone;
};

type EmptyStateProps = {
  title: string;
  description: string;
};


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

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const clamp = (value: number, min = 0, max = 100) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

const toIsoDate = (date: Date) => {
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const cleanSymbol = (symbol: string) =>
  symbol.replace("BINANCE:", "").replace("COINBASE:", "").replace("OANDA:", "");

const getAssetType = (symbol: string): AssetType => {
  if (symbol.startsWith("BINANCE:") || symbol.startsWith("COINBASE:")) return "crypto";
  if (symbol.startsWith("OANDA:")) return "forex";
  return "stock";
};

const getCandleEndpoint = (symbol: string) => {
  const assetType = getAssetType(symbol);
  if (assetType === "crypto") return "crypto/candle";
  if (assetType === "forex") return "forex/candle";
  return "stock/candle";
};

const getPriceDigits = (value: number, assetType: AssetType) => {
  if (assetType === "forex") return 4;
  if (assetType === "crypto") {
    if (value >= 1000) return 2;
    if (value >= 100) return 2;
    if (value >= 1) return 3;
    return 4;
  }
  return 2;
};

const formatPrice = (value?: number | null, assetType: AssetType = "stock") => {
  if (!isNumber(value)) return "N/A";
  return `$${value.toFixed(getPriceDigits(Math.abs(value), assetType))}`;
};

const formatSignedPrice = (value?: number | null, assetType: AssetType = "stock") => {
  if (!isNumber(value)) return "N/A";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(getPriceDigits(Math.abs(value), assetType))}`;
};

const formatPercent = (value?: number | null, digits = 2) =>
  isNumber(value) ? `${value.toFixed(digits)}%` : "N/A";

const formatSignedPercent = (value?: number | null, digits = 2) => {
  if (!isNumber(value)) return "N/A";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
};

const formatNumber = (value?: number | null, digits = 2) =>
  isNumber(value) ? value.toFixed(digits) : "N/A";

const formatCompactNumber = (value?: number | null, prefix = "") => {
  if (!isNumber(value)) return "N/A";
  return `${prefix}${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)}`;
};

const formatDate = (input?: string | number | null) => {
  if (!input) return "N/A";
  const date = typeof input === "number" ? new Date(input * 1000) : new Date(input);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (input?: string | number | null) => {
  if (!input) return "N/A";
  const date = typeof input === "number" ? new Date(input * 1000) : new Date(input);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const truncateText = (value?: string | null, max = 220) => {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}...`;
};

const percentDiffFrom = (current?: number | null, base?: number | null) => {
  if (!isNumber(current) || !isNumber(base) || base === 0) return null;
  return ((current - base) / Math.abs(base)) * 100;
};

const upsideFromPrice = (target?: number | null, current?: number | null) => {
  if (!isNumber(target) || !isNumber(current) || current === 0) return null;
  return ((target - current) / Math.abs(current)) * 100;
};

const calculateSMA = (values: number[], period: number) => {
  if (values.length < period) return null;
  return average(values.slice(-period));
};


const calculateEMAArray = (values: number[], period: number) => {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length < period) return result;

  const multiplier = 2 / (period + 1);
  let ema = average(values.slice(0, period));
  result[period - 1] = ema;

  for (let i = period; i < values.length; i += 1) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
    result[i] = ema;
  }

  return result;
};

const calculateEMA = (values: number[], period: number) => {
  const valuesArray = calculateEMAArray(values, period);
  for (let i = valuesArray.length - 1; i >= 0; i -= 1) {
    if (isNumber(valuesArray[i])) return valuesArray[i];
  }
  return null;
};

const calculateRSI = (values: number[], period = 14) => {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;
  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
};

const calculateATR = (highs: number[], lows: number[], closes: number[], period = 14) => {
  if (highs.length <= period || lows.length <= period || closes.length <= period) return null;

  const trueRanges: number[] = [];

  for (let i = 1; i < highs.length; i += 1) {
    const high = highs[i];
    const low = lows[i];
    const previousClose = closes[i - 1];

    const tr = Math.max(
      high - low,
      Math.abs(high - previousClose),
      Math.abs(low - previousClose)
    );

    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  let atr = average(trueRanges.slice(0, period));

  for (let i = period; i < trueRanges.length; i += 1) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
};

const calculateVolatility = (values: number[], period = 30) => {
  if (values.length <= period) return null;

  const recent = values.slice(-(period + 1));
  const returns = recent
    .slice(1)
    .map((price, index) => {
      const base = recent[index];
      return base ? (price - base) / base : 0;
    })
    .filter((value) => Number.isFinite(value));

  if (!returns.length) return null;

  const mean = average(returns);
  const variance = average(returns.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance) * 100;
};

const calculateMACD = (values: number[]) => {
  if (values.length < 35) return null;

  const ema12 = calculateEMAArray(values, 12);
  const ema26 = calculateEMAArray(values, 26);

  const macdSeries = values.map((_, index) => {
    if (isNumber(ema12[index]) && isNumber(ema26[index])) {
      return (ema12[index] as number) - (ema26[index] as number);
    }
    return null;
  });

  const validMacd = macdSeries.filter((value): value is number => isNumber(value));
  if (validMacd.length < 9) return null;

  const signalSeriesCompact = calculateEMAArray(validMacd, 9);
  const signal =
    [...signalSeriesCompact].reverse().find((value): value is number => isNumber(value)) ?? null;
  const macd = [...validMacd].reverse().find((value): value is number => isNumber(value)) ?? null;

  if (!isNumber(signal) || !isNumber(macd)) return null;

  return {
    macd,
    signal,
    histogram: macd - signal,
  };
};

const getRangePercent = (
  current?: number | null,
  low?: number | null,
  high?: number | null
) => {
  if (!isNumber(current) || !isNumber(low) || !isNumber(high) || high === low) return null;
  return clamp(((current - low) / (high - low)) * 100);
};


const getSignalFromScore = (score: number) => {
  if (score >= 78) {
    return {
      text: "STRONG BUY",
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    };
  }

  if (score >= 62) {
    return {
      text: "BUY",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    };
  }

  if (score >= 45) {
    return {
      text: "HOLD / NEUTRAL",
      color: "text-gray-300",
      bg: "bg-gray-500/10",
      border: "border-gray-500/20",
    };
  }

  if (score >= 28) {
    return {
      text: "SELL",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    };
  }

  return {
    text: "STRONG SELL",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  };
};

const dedupeSuggestions = (items: SuggestionItem[]) => {
  const map = new Map<string, SuggestionItem>();

  for (const item of items) {
    if (!map.has(item.symbol)) {
      map.set(item.symbol, item);
    }
  }

  return Array.from(map.values());
};

const resolveSearchSymbol = (raw: string) => {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return "";

  if (SYMBOL_ALIASES[normalized]) return SYMBOL_ALIASES[normalized];

  const exactLocal = MARKET_DB.find(
    (item) =>
      item.symbol.toUpperCase() === normalized || cleanSymbol(item.symbol).toUpperCase() === normalized
  );

  if (exactLocal) return exactLocal.symbol;

  return raw.trim().toUpperCase();
};

const normalizeNews = (items?: NewsItem[] | null) => {
  if (!Array.isArray(items)) return [];

  const unique = new Map<string, NewsItem>();

  items
    .filter((item) => item && item.headline && item.url)
    .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0))
    .forEach((item) => {
      const key = `${item.headline ?? ""}|${item.source ?? ""}`;
      if (!unique.has(key)) unique.set(key, item);
    });

  return Array.from(unique.values()).slice(0, 10);
};

const normalizeEarnings = (items?: EarningsItem[] | null) => {
  if (!Array.isArray(items)) return [];
  return [...items]
    .sort((a, b) => String(b.period ?? "").localeCompare(String(a.period ?? "")))
    .slice(0, 6);
};

const normalizeRecommendations = (items?: RecommendationTrend[] | null) => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => String(b.period ?? "").localeCompare(String(a.period ?? "")));
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

function SectionCard({
  title,
  subtitle,
  icon,
  headerRight,
  className = "",
  children,
}: SectionCardProps) {
  return (
    <div
      className={`min-w-0 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_40px_rgba(59,130,246,0.06)] ${className}`}
    >
      <div className="flex items-start justify-between gap-4 mb-5 min-w-0">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold">
            {icon}
            <span className="truncate">{title}</span>
          </p>
          {subtitle && <p className="mt-2 text-sm text-gray-400 leading-6">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent = "default",
}: MetricCardProps) {
  const accentMap: Record<AccentTone, string> = {
    default: "text-white",
    blue: "text-blue-400",
    green: "text-emerald-400",
    rose: "text-rose-400",
    violet: "text-violet-400",
    amber: "text-amber-400",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:scale-[1.02]">
      <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">{label}</p>
      <p className={`mt-2 text-xl md:text-2xl font-black break-words leading-tight ${accentMap[accent]}`}>
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-gray-500 leading-5 break-words">{hint}</p>}
    </div>
  );
}

function ProgressBar({ label, value, tone = "blue" }: ProgressBarProps) {
  const toneMap: Record<AccentTone, string> = {
    default: "bg-white/70",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    rose: "bg-rose-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
  };
  
  const safeValue = Number.isFinite(value) ? value : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-xs text-gray-400 font-semibold">
        <span>{label}</span>
        <span>{Math.round(clamp(safeValue))}/100</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/5 border border-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${toneMap[tone]}`}
          style={{ width: `${clamp(safeValue)}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm text-gray-400 leading-6">{description}</p>
    </div>
  );
}

function RangeBar({
  low,
  high,
  current,
  lowLabel = "Low",
  highLabel = "High",
  formatFn,
}: {
  low: number;
  high: number;
  current: number;
  lowLabel?: string;
  highLabel?: string;
  formatFn: (v: number) => string;
}) {
  const pct = high === low ? 50 : clamp(((current - low) / (high - low)) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-[0.2em]">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      <div className="relative h-3 rounded-full bg-gradient-to-r from-rose-500/30 via-gray-500/20 to-emerald-500/30 border border-white/10 overflow-hidden">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] border-2 border-blue-400 transition-all duration-700"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-rose-400">{formatFn(low)}</span>
        <span className="text-xs text-gray-400">
          Current: <span className="font-bold text-white">{formatFn(current)}</span>
        </span>
        <span className="font-bold text-emerald-400">{formatFn(high)}</span>
      </div>
    </div>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/30 transition-all hover:scale-110 active:scale-95 animate-fade-in-up"
      aria-label="Scroll to top"
    >
      <FiChevronUp size={22} />
    </button>
  );
}

function LoadingDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-xl p-8">
        <div className="flex flex-col gap-6">
          <div className="h-6 w-36 rounded-full bg-white/10" />
          <div className="h-12 w-72 max-w-full rounded-2xl bg-white/10" />
          <div className="h-5 w-full max-w-3xl rounded-full bg-white/5" />
          <div className="h-5 w-3/4 max-w-2xl rounded-full bg-white/5" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-black/60 p-6">
          <div className="h-6 w-40 rounded-full bg-white/10 mb-6" />
          <div className="h-[320px] rounded-3xl bg-white/5" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-black/60 p-6 h-[260px]" />
          <div className="rounded-3xl border border-white/10 bg-black/60 p-6 h-[260px]" />
        </div>
      </div>
    </div>
  );
}

const getTradingViewSymbol = (symbol: string): string => {
  if (symbol.startsWith("OANDA:")) return symbol.replace(/_/g, "");
  return symbol;
};

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tvSymbol = getTradingViewSymbol(symbol);

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(0, 0, 0, 1)",
      gridColor: "rgba(255, 255, 255, 0.06)",
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      studies: ["STD;SMA"],
      support_host: "https://www.tradingview.com",
    });

    container.appendChild(widgetDiv);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div
      className="tradingview-widget-container tv-chart-wrapper overflow-hidden rounded-3xl border border-white/10"
      ref={containerRef}
    />
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group block min-w-0 h-full rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl transition-all hover:border-blue-500/30 hover:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gray-400 font-bold">
            <span>{item.source || "News"}</span>
          </div>
          <p className="mt-3 text-xs text-gray-500">{formatDateTime(item.datetime)}</p>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-2 text-gray-400 group-hover:text-blue-300">
          <FiExternalLink />
        </span>
      </div>

      <h3 className="text-lg font-black text-white leading-7 break-words">
        {item.headline || "Untitled headline"}
      </h3>

      <p className="mt-3 text-sm text-gray-400 leading-7 break-words">
        {truncateText(item.summary || item.headline || "", 240)}
      </p>
    </a>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [ticker, setTicker] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [stockData, setStockData] = useState<QuoteData | null>(null);
  const [companyData, setCompanyData] = useState<ProfileData | null>(null);
  const [candlesData, setCandlesData] = useState<CandleData | null>(null);
  const [recommendationData, setRecommendationData] = useState<RecommendationTrend[]>([]);
  const [basicFinancials, setBasicFinancials] = useState<BasicFinancialsData | null>(null);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsItem[]>([]);
  const [priceTargetData, setPriceTargetData] = useState<PriceTargetData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const glowRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCounterRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
    }
  };

  const fetchSuggestions = useCallback(async (value: string) => {
    const requestId = ++searchCounterRef.current;

    try {
      const localMatches = MARKET_DB.filter(
        (item) =>
          item.symbol.toUpperCase().includes(value) ||
          cleanSymbol(item.symbol).toUpperCase().includes(value) ||
          item.description.toUpperCase().includes(value)
      );

      const searchResults = await safeFetchJson<{ result?: FinnhubSearchResult[] }>(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(value)}&token=${API_KEY}`
      );

      if (requestId !== searchCounterRef.current) return;

      const apiMatches: SuggestionItem[] = (searchResults?.result ?? []).slice(0, 5).map((item) => ({
        symbol: item.symbol,
        description: item.description || item.displaySymbol || item.symbol,
      }));

      const aliasMatches = Object.entries(SYMBOL_ALIASES)
        .filter(([alias]) => alias.includes(value))
        .slice(0, 4)
        .map(([alias, symbol]) => ({
          symbol,
          description: `${alias} quick alias`,
        }));

      setSuggestions(dedupeSuggestions([...localMatches, ...aliasMatches, ...apiMatches]).slice(0, 8));
      setShowSuggestions(true);
    } catch (searchError) {
      console.error(searchError);
      if (requestId === searchCounterRef.current) setShowSuggestions(false);
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setTicker(value);

    if (value.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelectSuggestion = (selectedSymbol: string) => {
    setTicker(selectedSymbol);
    setShowSuggestions(false);
    handleSearch(selectedSymbol);
  };

  const handleSearch = async (searchSymbol = ticker) => {
    const resolvedSymbol = resolveSearchSymbol(searchSymbol);
    if (!resolvedSymbol) return;

    setTicker(resolvedSymbol);
    setLoading(true);
    setError("");
    setShowSuggestions(false);

    try {
      const assetType = getAssetType(resolvedSymbol);
      const now = Math.floor(Date.now() / 1000);
      const from = now - 60 * 60 * 24 * 420;
      
      const newsFromDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 21);
      const newsFrom = Number.isNaN(newsFromDate.getTime()) ? "" : newsFromDate.toISOString().slice(0, 10);
      const newsToDate = new Date();
      const newsTo = Number.isNaN(newsToDate.getTime()) ? "" : newsToDate.toISOString().slice(0, 10);
      
      const candleEndpoint = getCandleEndpoint(resolvedSymbol);

      const [
        quoteRes,
        profileRes,
        candleRes,
        recommendationRes,
        metricsRes,
        newsRes,
        earningsRes,
        priceTargetRes,
      ] = await Promise.all([
        safeFetchJson<QuoteData>(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(resolvedSymbol)}&token=${API_KEY}`
        ),
        safeFetchJson<ProfileData>(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(
            resolvedSymbol
          )}&token=${API_KEY}`
        ),
        safeFetchJson<CandleData>(
          `https://finnhub.io/api/v1/${candleEndpoint}?symbol=${encodeURIComponent(
            resolvedSymbol
          )}&resolution=D&from=${from}&to=${now}&token=${API_KEY}`
        ),
        assetType === "stock"
          ? safeFetchJson<RecommendationTrend[]>(
              `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(
                resolvedSymbol
              )}&token=${API_KEY}`
            )
          : Promise.resolve(null),
        assetType === "stock"
          ? safeFetchJson<BasicFinancialsData>(
              `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
                resolvedSymbol
              )}&metric=all&token=${API_KEY}`
            )
          : Promise.resolve(null),
        assetType === "stock"
          ? safeFetchJson<NewsItem[]>(
              `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
                resolvedSymbol
              )}&from=${newsFrom}&to=${newsTo}&token=${API_KEY}`
            )
          : Promise.resolve(null),
        assetType === "stock"
          ? safeFetchJson<EarningsItem[]>(
              `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(
                resolvedSymbol
              )}&token=${API_KEY}`
            )
          : Promise.resolve(null),
        assetType === "stock"
          ? safeFetchJson<PriceTargetData>(
              `https://finnhub.io/api/v1/stock/price-target?symbol=${encodeURIComponent(
                resolvedSymbol
              )}&token=${API_KEY}`
            )
          : Promise.resolve(null),
      ]);

      const candleOk = candleRes?.s === "ok" && Array.isArray(candleRes.c) && candleRes.c.length > 0;
      const lastCandleClose =
        candleOk && candleRes ? candleRes.c[candleRes.c.length - 1] : 0;
      const prevCandleClose =
        candleOk && candleRes && candleRes.c.length > 1 ? candleRes.c[candleRes.c.length - 2] : 0;

      const currentPrice =
        isNumber(quoteRes?.c) && (quoteRes?.c ?? 0) > 0 ? quoteRes.c : lastCandleClose;

      const previousClose =
        isNumber(quoteRes?.pc) && (quoteRes?.pc ?? 0) > 0 ? quoteRes.pc : prevCandleClose;

      const normalizedQuote: QuoteData = {
        c: currentPrice || 0,
        d:
          isNumber(quoteRes?.d) && quoteRes?.d !== undefined
            ? quoteRes.d
            : currentPrice && previousClose
            ? currentPrice - previousClose
            : 0,
        dp:
          isNumber(quoteRes?.dp) && quoteRes?.dp !== undefined
            ? quoteRes.dp
            : currentPrice && previousClose
            ? ((currentPrice - previousClose) / previousClose) * 100
            : 0,
        h:
          isNumber(quoteRes?.h) && quoteRes?.h > 0
            ? quoteRes.h
            : candleOk && candleRes
            ? candleRes.h[candleRes.h.length - 1]
            : 0,
        l:
          isNumber(quoteRes?.l) && quoteRes?.l > 0
            ? quoteRes.l
            : candleOk && candleRes
            ? candleRes.l[candleRes.l.length - 1]
            : 0,
        o:
          isNumber(quoteRes?.o) && quoteRes?.o > 0
            ? quoteRes.o
            : candleOk && candleRes
            ? candleRes.o[candleRes.o.length - 1]
            : 0,
        pc: previousClose || 0,
        t:
          isNumber(quoteRes?.t) && quoteRes?.t > 0
            ? quoteRes.t
            : candleOk && candleRes
            ? candleRes.t[candleRes.t.length - 1]
            : 0,
      };

      if (!normalizedQuote.c) {
        setError(`No data found for ${resolvedSymbol}. Please select a valid ticker from the dropdown.`);
        setStockData(null);
        setCompanyData(null);
        setCandlesData(null);
        setRecommendationData([]);
        setBasicFinancials(null);
        setNewsData([]);
        setEarningsData([]);
        setPriceTargetData(null);
        return;
      }

      setStockData(normalizedQuote);
      setCompanyData(
        profileRes && Object.keys(profileRes).length
          ? profileRes
          : {
              name: cleanSymbol(resolvedSymbol),
              ticker: resolvedSymbol,
            }
      );
      setCandlesData(candleOk && candleRes ? candleRes : null);
      setRecommendationData(normalizeRecommendations(recommendationRes ?? []));
      setBasicFinancials(metricsRes?.metric ? metricsRes : null);
      setNewsData(normalizeNews(newsRes ?? []));
      setEarningsData(normalizeEarnings(earningsRes ?? []));
      setPriceTargetData(priceTargetRes && Object.keys(priceTargetRes).length ? priceTargetRes : null);
      setActiveTab("overview");

      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    } catch (searchError) {
      console.error(searchError);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    if (!stockData) return null;

    const closes = candlesData?.c ?? [];
    const highs = candlesData?.h ?? [];
    const lows = candlesData?.l ?? [];
    const volumes = candlesData?.v ?? [];
    const assetType = getAssetType(ticker);

    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const rsi14 = calculateRSI(closes, 14);
    const atr14 = calculateATR(highs, lows, closes, 14);
    const atrPct = isNumber(atr14) && stockData.c ? (atr14 / stockData.c) * 100 : null;
    const macd = calculateMACD(closes);
    const macdHistogramPct =
      isNumber(macd?.histogram) && stockData.c ? ((macd.histogram ?? 0) / stockData.c) * 100 : null;
    const volatility30d = calculateVolatility(closes, 30);
    const dayRangePos = getRangePercent(stockData.c, stockData.l, stockData.h);

    const week52High = basicFinancials?.metric?.["52WeekHigh"] ?? (highs.length ? Math.max(...highs.slice(-252)) : null);
    const week52Low = basicFinancials?.metric?.["52WeekLow"] ?? (lows.length ? Math.min(...lows.slice(-252)) : null);
    const week52Pos = getRangePercent(stockData.c, week52Low, week52High);

    const latestVolume = volumes.length ? volumes[volumes.length - 1] : null;
    const avg20Volume = volumes.length >= 20 ? average(volumes.slice(-20)) : null;
    const volumeRatio =
      isNumber(latestVolume) && isNumber(avg20Volume) && avg20Volume !== 0
        ? latestVolume / avg20Volume
        : null;

    const recentResistance = highs.length ? Math.max(...highs.slice(-20)) : stockData.h;
    const recentSupport = lows.length ? Math.min(...lows.slice(-20)) : stockData.l;
    const pivot = (stockData.h + stockData.l + stockData.c) / 3;
    const openGapPct = stockData.pc ? ((stockData.o - stockData.pc) / stockData.pc) * 100 : null;

    const latestRec = recommendationData[0] ?? null;
    const totalRec = latestRec
      ? latestRec.strongBuy + latestRec.buy + latestRec.hold + latestRec.sell + latestRec.strongSell
      : 0;

    const bullishPct =
      totalRec && latestRec ? ((latestRec.strongBuy + latestRec.buy) / totalRec) * 100 : null;
    const bearishPct =
      totalRec && latestRec ? ((latestRec.sell + latestRec.strongSell) / totalRec) * 100 : null;

    const priceTargetUpside = upsideFromPrice(priceTargetData?.targetMean, stockData.c);
    const latestEarnings = earningsData[0] ?? null;
    const latestEarningsSurprise = isNumber(latestEarnings?.surprisePercent)
      ? latestEarnings?.surprisePercent ?? null
      : percentDiffFrom(latestEarnings?.actual ?? null, latestEarnings?.estimate ?? null);

    const trendMeter = clamp(
      50 +
        (isNumber(stockData.c) && isNumber(ema20) ? (stockData.c > ema20 ? 15 : -15) : 0) +
        (isNumber(ema20) && isNumber(ema50) ? (ema20 > ema50 ? 18 : -18) : 0) +
        (isNumber(sma50) && isNumber(sma200) ? (sma50 > sma200 ? 15 : -15) : 0)
    );

    const momentumMeter = clamp(
      50 +
        (isNumber(rsi14) ? (rsi14 - 50) * 1.1 : 0) +
        (isNumber(macdHistogramPct) ? clamp(macdHistogramPct * 120, -12, 12) : 0) +
        clamp(stockData.dp * 1.1, -8, 8)
    );

    const sentimentMeter = clamp(
      50 +
        (isNumber(bullishPct) ? (bullishPct - 50) * 0.8 : 0) +
        (isNumber(priceTargetUpside) ? clamp(priceTargetUpside, -15, 15) : 0) +
        (isNumber(volumeRatio) ? clamp((volumeRatio - 1) * 10, -8, 8) : 0)
    );

    const stabilityMeter = clamp(
      70 -
        (isNumber(volatility30d) ? volatility30d * 6 : 0) -
        (isNumber(basicFinancials?.metric?.beta)
          ? Math.max(0, (basicFinancials?.metric?.beta ?? 1) - 1) * 18
          : 0) -
        (isNumber(atrPct) ? atrPct * 4 : 0)
    );

    let compositeScore = clamp(
      trendMeter * 0.35 + momentumMeter * 0.3 + sentimentMeter * 0.2 + stabilityMeter * 0.15
    );
    
    if (!Number.isFinite(compositeScore)) compositeScore = 50;

    const signal = getSignalFromScore(compositeScore);

    const trendBias =
      trendMeter >= 65
        ? "Trending Up"
        : trendMeter <= 35
        ? "Trending Down"
        : "Sideways";

    const riskLevel =
      stabilityMeter >= 68 ? "Controlled" : stabilityMeter >= 48 ? "Balanced" : "Aggressive";

    const summaryParts: string[] = [
      `${cleanSymbol(ticker)} is rated ${signal.text.toLowerCase()} with a score of ${Math.round(
        compositeScore
      )}/100.`,
    ];

    if (isNumber(rsi14)) {
      summaryParts.push(
        rsi14 > 70
          ? `Momentum looks overbought (RSI ${rsi14.toFixed(0)}) — the price may pull back.`
          : rsi14 < 35
          ? `Momentum looks oversold (RSI ${rsi14.toFixed(0)}) — the price could bounce.`
          : `Momentum is healthy (RSI ${rsi14.toFixed(0)}).`
      );
    }

    if (isNumber(ema20) && isNumber(ema50)) {
      summaryParts.push(
        stockData.c > ema20
          ? "Price is trending above its short-term average."
          : "Price is trading below its short-term average."
      );
    }

    if (assetType === "stock" && isNumber(priceTargetUpside)) {
      summaryParts.push(
        `Analysts expect ${formatSignedPercent(priceTargetUpside)} from here on average.`
      );
    }

    const hasCandles = Boolean(candlesData?.c?.length && candlesData.c.length > 0);

    return {
      assetType,
      hasCandles,
      score: compositeScore,
      signal,
      trendBias,
      riskLevel,
      sma20,
      sma50,
      sma200,
      ema20,
      ema50,
      rsi14,
      atr14,
      atrPct,
      macd,
      macdHistogramPct,
      volatility30d,
      dayRangePos,
      week52High,
      week52Low,
      week52Pos,
      latestRec,
      totalRec,
      bullishPct,
      bearishPct,
      recentResistance,
      recentSupport,
      pivot,
      openGapPct,
      volumeRatio,
      latestVolume,
      avg20Volume,
      priceTargetUpside,
      latestEarnings,
      latestEarningsSurprise,
      meters: {
        trend: trendMeter,
        momentum: momentumMeter,
        sentiment: sentimentMeter,
        stability: stabilityMeter,
      },
      summary: summaryParts.join(" "),
    };
  }, [
    basicFinancials,
    candlesData,
    earningsData,
    priceTargetData,
    recommendationData,
    stockData,
    ticker,
  ]);

  const tabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
    { key: "overview", label: "Overview", icon: <FiActivity /> },
    { key: "technical", label: "Technical", icon: <FiBarChart2 /> },
    { key: "fundamentals", label: "Fundamentals", icon: <FiBriefcase /> },
    { key: "news", label: "News", icon: <FiGlobe /> },
  ];

  return (
    <>
      <ScrollToTopButton />
      <div onMouseMove={handleMouseMove} className="bg-[#050505] text-white font-sans relative min-h-screen">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            ref={glowRef}
            className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-[80px] transition-transform duration-75 ease-out"
            style={{ transform: "translate(-500px, -500px)" }}
          />
          <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px] force-animate-blob" />
          <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-indigo-600/30 rounded-full blur-[100px] force-animate-blob force-delay" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
        </div>

        <div className="fixed top-5 left-6 z-50 flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-8 w-8">
            <defs>
              <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="96" fill="#0a0a0a"/>
            <rect x="96" y="280" width="56" height="140" rx="8" fill="url(#logo-g)" opacity="0.5"/>
            <rect x="192" y="200" width="56" height="220" rx="8" fill="url(#logo-g)" opacity="0.65"/>
            <rect x="288" y="140" width="56" height="280" rx="8" fill="url(#logo-g)" opacity="0.8"/>
            <rect x="384" y="80" width="56" height="340" rx="8" fill="url(#logo-g)"/>
            <line x1="124" y1="270" x2="412" y2="70" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" opacity="0.9"/>
          </svg>
          <span className="text-lg font-bold tracking-tight text-white">Stockify</span>
        </div>

        {loading && stockData && (
          <div className="fixed top-5 right-5 z-50 rounded-full border border-blue-500/30 bg-black/80 backdrop-blur-xl px-4 py-2 text-xs uppercase tracking-[0.25em] text-blue-300 font-bold shadow-2xl">
            Refreshing analysis...
          </div>
        )}

        <main className="min-h-screen flex items-center justify-center p-6 relative z-10">
          <div className="max-w-3xl w-full">
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
                <FiTrendingUp /> Real-time Market Intelligence
              </div>

              <h1 className="text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent drop-shadow-2xl">
                STOCKIFY
              </h1>

              <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-8">
                Premium market analysis with structured technicals, fundamentals, company news,
                earnings context, and cleaner execution logic.
              </p>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />

              <div className="relative flex items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl">
                <div className="pl-4 text-gray-500">
                  <FiSearch size={24} />
                </div>

                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search ticker (e.g. AAPL, BTC, ETH, EUR_USD)  —  Press / to focus"
                  value={ticker}
                  onChange={handleInputChange}
                  onFocus={() => ticker.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-transparent px-4 py-4 text-lg md:text-xl outline-none placeholder:text-gray-600 font-medium tracking-wide"
                />

                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-wait text-white px-6 md:px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20 uppercase tracking-widest text-sm"
                >
                  {loading ? "Scanning..." : "Analyze"}
                </button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                  {suggestions.map((item) => (
                    <div
                      key={`${item.symbol}-${item.description}`}
                      onClick={() => handleSelectSuggestion(item.symbol)}
                      className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-blue-900/30 cursor-pointer border-b border-white/5 last:border-0 transition-colors min-w-0"
                    >
                      <span className="font-bold text-blue-400 tracking-wider min-w-0 break-all">
                        {item.symbol}
                      </span>
                      <span className="text-gray-400 text-sm text-right min-w-0 break-words">
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-400 text-center font-medium backdrop-blur-md">
                {error}
              </div>
            )}

            <div className="mt-12 flex flex-wrap justify-center items-center gap-6 md:gap-8 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
                NYSE
              </div>

              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                NASDAQ
              </div>

              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                CRYPTO
              </div>

              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                </span>
                FX
              </div>
            </div>
          </div>
        </main>

        {loading && !stockData && (
          <div className="relative z-10 px-6 pb-24">
            <LoadingDashboardSkeleton />
          </div>
        )}

        {stockData && analysis && (
          <div ref={analysisRef} className="relative z-10 px-6 pb-32">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
                <div className="flex flex-col gap-8 2xl:flex-row 2xl:items-end 2xl:justify-between">
                  <div className="flex items-start gap-5 min-w-0">
                    {companyData?.logo ? (
                      <Image
                        src={companyData.logo}
                        alt={`${companyData.name || "Company"} logo`}
                        width={80}
                        height={80}
                        className="rounded-2xl shadow-xl bg-white p-1 shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-3xl font-bold shadow-xl shrink-0">
                        {cleanSymbol(ticker).charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-bold tracking-[0.28em] uppercase">
                        <FiLayers />
                        {analysis.assetType}
                      </div>

                      <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-white break-words leading-tight">
                        {companyData?.name || cleanSymbol(ticker)}
                      </h2>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400 min-w-0">
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 font-bold tracking-[0.22em] text-blue-300 uppercase break-all">
                          {ticker}
                        </span>

                        {companyData?.exchange && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 break-words">
                            {companyData.exchange}
                          </span>
                        )}

                        {companyData?.country && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 break-words">
                            {companyData.country}
                          </span>
                        )}

                        {companyData?.currency && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 break-words">
                            {companyData.currency}
                          </span>
                        )}

                        {companyData?.finnhubIndustry && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 break-words">
                            {companyData.finnhubIndustry}
                          </span>
                        )}
                        {isNumber(companyData?.marketCapitalization) && companyData!.marketCapitalization! > 0 && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300 font-bold">
                            Mkt Cap {formatCompactNumber(companyData!.marketCapitalization! * 1e6, "$")}
                          </span>
                        )}
                      </div>

                      <p className="mt-5 max-w-3xl text-sm md:text-[15px] text-gray-400 leading-8">
                        {analysis.summary}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full 2xl:w-auto 2xl:min-w-[620px]">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 min-w-0 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                        Price
                      </p>
                      <p className="mt-3 text-4xl md:text-5xl font-black tracking-tight break-all leading-tight animate-price-in">
                        {formatPrice(stockData.c, analysis.assetType)}
                      </p>
                      <div
                        className={`mt-4 flex items-center gap-2 text-sm font-bold ${
                          stockData.d >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {stockData.d >= 0 ? <FiArrowUp /> : <FiArrowDown />}
                        <span>{formatSignedPrice(stockData.d, analysis.assetType)}</span>
                        <span className="rounded-full border border-current/20 bg-current/10 px-2 py-1">
                          {formatSignedPercent(stockData.dp)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`rounded-3xl border p-5 min-w-0 transition-all duration-200 hover:scale-[1.02] ${analysis.signal.bg} ${analysis.signal.border}`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                        Signal
                      </p>
                      <p className={`mt-3 text-2xl md:text-3xl font-black break-words ${analysis.signal.color}`}>
                        {analysis.signal.text}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-gray-400">
                        <span>{Math.round(analysis.score)}/100</span>
                        <span>{analysis.riskLevel} risk</span>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 min-w-0 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                        Trend
                      </p>
                      <p className="mt-3 text-xl md:text-2xl font-black text-white break-words">
                        {analysis.trendBias}
                      </p>
                      <div className="mt-4 space-y-2 text-xs text-gray-400">
                        <div className="flex items-center justify-between gap-4">
                          <span>Day range</span>
                          <span>
                            {analysis.dayRangePos !== null
                              ? `${analysis.dayRangePos.toFixed(0)}%`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Updated</span>
                          <span>{formatDateTime(stockData.t)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-2 flex flex-wrap gap-2">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                            : "bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeTab === "overview" && (
                <>
                  <SectionCard
                    title="Chart"
                    subtitle="Interactive chart powered by TradingView. Use the toolbar to add indicators like RSI, MACD, and moving averages."
                    icon={<FiActivity className="text-blue-500" />}
                    headerRight={
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gray-400 font-bold">
                        {analysis.assetType}
                      </span>
                    }
                  >
                    <TradingViewChart symbol={ticker} />
                  </SectionCard>

                  <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
                    <MetricCard label="Open" value={formatPrice(stockData.o, analysis.assetType)} hint="Today's opening price" accent="blue" />
                    <MetricCard label="Prev Close" value={formatPrice(stockData.pc, analysis.assetType)} hint="Yesterday's closing price" />
                    <MetricCard label="Day Low" value={formatPrice(stockData.l, analysis.assetType)} hint="Lowest price today" accent="rose" />
                    <MetricCard label="Day High" value={formatPrice(stockData.h, analysis.assetType)} hint="Highest price today" accent="green" />
                    <MetricCard label="Open Gap" value={formatSignedPercent(analysis.openGapPct)} hint="Gap from yesterday's close" accent={isNumber(analysis.openGapPct) && (analysis.openGapPct ?? 0) >= 0 ? "green" : "rose"} />
                    <MetricCard label="Support" value={formatPrice(analysis.recentSupport, analysis.assetType)} hint="Price floor level" accent="blue" />
                    <MetricCard label="Pivot" value={formatPrice(analysis.pivot, analysis.assetType)} hint="Key midpoint level" />
                    <MetricCard label="Resistance" value={formatPrice(analysis.recentResistance, analysis.assetType)} hint="Price ceiling level" accent="violet" />
                  </div>

                  {(isNumber(analysis.week52High) && isNumber(analysis.week52Low) && stockData.c > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-5">52-Week Range</p>
                        <RangeBar
                          low={analysis.week52Low!}
                          high={analysis.week52High!}
                          current={stockData.c}
                          lowLabel="52W Low"
                          highLabel="52W High"
                          formatFn={(v) => formatPrice(v, analysis.assetType)}
                        />
                      </div>
                      {stockData.l > 0 && stockData.h > 0 && (
                        <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6">
                          <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-5">Today&apos;s Range</p>
                          <RangeBar
                            low={stockData.l}
                            high={stockData.h}
                            current={stockData.c}
                            lowLabel="Day Low"
                            highLabel="Day High"
                            formatFn={(v) => formatPrice(v, analysis.assetType)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {analysis.hasCandles && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                      <MetricCard
                        label="RSI (14)"
                        value={isNumber(analysis.rsi14) ? analysis.rsi14.toFixed(1) : "—"}
                        hint={
                          isNumber(analysis.rsi14)
                            ? analysis.rsi14 > 70 ? "Overbought — may pull back" : analysis.rsi14 < 35 ? "Oversold — may bounce" : "Healthy momentum"
                            : "Needs more data"
                        }
                        accent="amber"
                      />
                      <MetricCard
                        label="MACD"
                        value={isNumber(analysis.macd?.histogram) ? formatNumber(analysis.macd?.histogram, 3) : "—"}
                        hint={isNumber(analysis.macd?.histogram) ? (analysis.macd?.histogram ?? 0) >= 0 ? "Bullish momentum" : "Bearish momentum" : "Needs more data"}
                        accent={isNumber(analysis.macd?.histogram) && (analysis.macd?.histogram ?? 0) >= 0 ? "green" : "rose"}
                      />
                      <MetricCard label="Volume" value={isNumber(analysis.volumeRatio) ? `${analysis.volumeRatio.toFixed(2)}x` : "—"} hint="vs 20-day average" accent="violet" />
                      <MetricCard label="Volatility" value={formatPercent(analysis.volatility30d)} hint="30-day price swing" accent="blue" />
                      <MetricCard label="ATR" value={isNumber(analysis.atr14) ? formatPrice(analysis.atr14, analysis.assetType) : "—"} hint={isNumber(analysis.atrPct) ? `${analysis.atrPct.toFixed(2)}% daily range` : "Avg daily range"} accent="amber" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <SectionCard
                      title="Score Breakdown"
                      subtitle="How the overall signal is calculated."
                      icon={<FiCpu className="text-violet-400" />}
                    >
                      <div className="space-y-5">
                        <ProgressBar label="Trend" value={analysis.meters.trend} tone="blue" />
                        <ProgressBar label="Momentum" value={analysis.meters.momentum} tone="amber" />
                        <ProgressBar label="Sentiment" value={analysis.meters.sentiment} tone="green" />
                        <ProgressBar label="Stability" value={analysis.meters.stability} tone="violet" />
                      </div>

                      <div className="mt-6 space-y-3">
                        {analysis.hasCandles && isNumber(analysis.rsi14) ? (
                          <>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300 leading-7">
                              Price is{" "}
                              <span className="font-bold text-white">
                                {isNumber(analysis.ema20) && stockData.c > (analysis.ema20 ?? 0) ? "above" : "below"}
                              </span>{" "}
                              the 20-day average
                              {isNumber(analysis.ema20) ? ` by ${formatSignedPercent(percentDiffFrom(stockData.c, analysis.ema20))}.` : "."}
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300 leading-7">
                              RSI is <span className="font-bold text-white">{analysis.rsi14.toFixed(1)}</span>
                              {analysis.rsi14 > 70 ? " — overbought, may pull back soon." : analysis.rsi14 < 35 ? " — oversold, could bounce." : " — balanced momentum."}
                            </div>
                          </>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-gray-400 leading-7">
                            Use the chart toolbar to add indicators like RSI, MACD, and moving averages for deeper analysis.
                          </div>
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Key Levels"
                      subtitle="Important price levels to watch."
                      icon={<FiTarget className="text-cyan-400" />}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-blue-500/30 hover:bg-blue-500/5">
                          <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">Support</span>
                          <span className="text-lg font-black text-blue-400 break-all">{formatPrice(analysis.recentSupport, analysis.assetType)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]">
                          <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">Pivot</span>
                          <span className="text-lg font-black text-white break-all">{formatPrice(analysis.pivot, analysis.assetType)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-violet-500/30 hover:bg-violet-500/5">
                          <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">Resistance</span>
                          <span className="text-lg font-black text-violet-400 break-all">{formatPrice(analysis.recentResistance, analysis.assetType)}</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300 leading-7">
                          Bullish if price holds above {formatPrice(analysis.pivot, analysis.assetType)} and breaks {formatPrice(analysis.recentResistance, analysis.assetType)}.
                        </div>
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300 leading-7">
                          Bearish if price drops below {formatPrice(analysis.recentSupport, analysis.assetType)}.
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Analyst Consensus"
                      subtitle="Wall Street ratings summary."
                      icon={<FiZap className="text-emerald-400" />}
                    >
                      {analysis.assetType === "stock" && analysis.latestRec ? (
                        <>
                          <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-gray-900 flex">
                            <div className="bg-green-400/90" style={{ width: `${analysis.totalRec ? (((analysis.latestRec.strongBuy ?? 0) / analysis.totalRec) * 100) : 0}%` }} />
                            <div className="bg-emerald-500/80" style={{ width: `${analysis.totalRec ? (((analysis.latestRec.buy ?? 0) / analysis.totalRec) * 100) : 0}%` }} />
                            <div className="bg-gray-500/70" style={{ width: `${analysis.totalRec ? (((analysis.latestRec.hold ?? 0) / analysis.totalRec) * 100) : 0}%` }} />
                            <div className="bg-rose-500/80" style={{ width: `${analysis.totalRec ? (((analysis.latestRec.sell ?? 0) / analysis.totalRec) * 100) : 0}%` }} />
                            <div className="bg-red-500/90" style={{ width: `${analysis.totalRec ? (((analysis.latestRec.strongSell ?? 0) / analysis.totalRec) * 100) : 0}%` }} />
                          </div>
                          <div className="grid grid-cols-5 gap-2 mt-4">
                            {[
                              { label: "SB", value: analysis.latestRec.strongBuy ?? 0 },
                              { label: "B", value: analysis.latestRec.buy ?? 0 },
                              { label: "H", value: analysis.latestRec.hold ?? 0 },
                              { label: "S", value: analysis.latestRec.sell ?? 0 },
                              { label: "SS", value: analysis.latestRec.strongSell ?? 0 },
                            ].map((item) => (
                              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-white/20 hover:bg-white/[0.06]">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">{item.label}</p>
                                <p className="text-lg font-black text-white mt-1">{item.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/60 font-bold">Bullish</p>
                              <p className="text-xl font-black text-emerald-400 mt-1">{formatPercent(analysis.bullishPct, 0)}</p>
                            </div>
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-rose-400/60 font-bold">Bearish</p>
                              <p className="text-xl font-black text-rose-400 mt-1">{formatPercent(analysis.bearishPct, 0)}</p>
                            </div>
                          </div>

                          {recommendationData.length > 1 && (
                            <div className="mt-5 pt-5 border-t border-white/10">
                              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-4">Trend (last {Math.min(recommendationData.length, 4)} months)</p>
                              <div className="flex items-end gap-2">
                                {recommendationData.slice(0, 4).reverse().map((rec, i) => {
                                  const total = rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
                                  if (!total) return null;
                                  return (
                                    <div key={`rec-${i}`} className="flex-1 flex flex-col gap-[1px] rounded-lg overflow-hidden" title={rec.period}>
                                      <div className="bg-green-400/90 transition-all" style={{ height: `${Math.max(2, (rec.strongBuy / total) * 80)}px` }} />
                                      <div className="bg-emerald-500/80 transition-all" style={{ height: `${Math.max(2, (rec.buy / total) * 80)}px` }} />
                                      <div className="bg-gray-500/70 transition-all" style={{ height: `${Math.max(2, (rec.hold / total) * 80)}px` }} />
                                      <div className="bg-rose-500/80 transition-all" style={{ height: `${Math.max(2, (rec.sell / total) * 80)}px` }} />
                                      <div className="bg-red-500/90 transition-all" style={{ height: `${Math.max(2, (rec.strongSell / total) * 80)}px` }} />
                                      <p className="text-[9px] text-gray-500 text-center mt-1 truncate">{rec.period?.slice(5) || ""}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <EmptyState
                          title="Not available"
                          description={analysis.assetType === "stock" ? "No analyst data for this stock." : "Analyst ratings are only available for stocks."}
                        />
                      )}
                    </SectionCard>
                  </div>

                  {analysis.assetType === "stock" && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <SectionCard
                        title="Price Targets"
                        subtitle="Where analysts think the price is headed."
                        icon={<FiTarget className="text-amber-400" />}
                      >
                        {priceTargetData ? (
                          <div className="space-y-4">
                            <MetricCard label="Average Target" value={formatPrice(priceTargetData.targetMean ?? null, "stock")} hint={isNumber(analysis.priceTargetUpside) ? `${formatSignedPercent(analysis.priceTargetUpside)} from current price` : "Upside not available"} accent={isNumber(analysis.priceTargetUpside) && (analysis.priceTargetUpside ?? 0) >= 0 ? "green" : "rose"} />
                            <MetricCard label="Target Range" value={`${formatPrice(priceTargetData.targetLow ?? null, "stock")} — ${formatPrice(priceTargetData.targetHigh ?? null, "stock")}`} hint="Lowest to highest analyst target" accent="violet" />
                          </div>
                        ) : (
                          <EmptyState title="No targets available" description="Analyst price targets haven't been published for this stock." />
                        )}
                      </SectionCard>

                      <SectionCard
                        title="Recent Earnings"
                        subtitle="Did the company beat or miss expectations?"
                        icon={<FiCalendar className="text-violet-400" />}
                      >
                        {earningsData.length > 0 ? (
                          <div className="space-y-3">
                            {earningsData.slice(0, 3).map((item, index) => {
                              const surpriseValue = isNumber(item.surprisePercent) ? item.surprisePercent : percentDiffFrom(item.actual ?? null, item.estimate ?? null);
                              return (
                                <div key={`${item.period}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.06]">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">{item.period || "—"}</span>
                                    <span className={`text-sm font-black ${isNumber(surpriseValue) && (surpriseValue ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatSignedPercent(surpriseValue)}</span>
                                  </div>
                                  <div className="mt-3 text-sm text-gray-300">
                                    <span>EPS: <span className="font-bold text-white">{formatNumber(item.actual ?? null, 2)}</span> vs <span className="font-bold text-white">{formatNumber(item.estimate ?? null, 2)}</span> expected</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState title="No earnings data" description="Earnings reports haven't been published for this stock yet." />
                        )}
                      </SectionCard>

                      <SectionCard
                        title="Company Info"
                        subtitle="Basic details about this company."
                        icon={<FiShield className="text-sky-400" />}
                      >
                        <div className="space-y-4">
                          {[
                            { label: "Exchange", value: companyData?.exchange || "—" },
                            { label: "Country", value: companyData?.country || "—" },
                            { label: "Currency", value: companyData?.currency || "—" },
                            { label: "Industry", value: companyData?.finnhubIndustry || "—" },
                            { label: "IPO Date", value: companyData?.ipo || "—" },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.06]">
                              <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">{item.label}</span>
                              <span className="text-sm font-black text-white text-right break-words">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        {companyData?.weburl && (
                          <a href={companyData.weburl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm text-blue-300 hover:text-white transition-colors break-all">
                            <FiExternalLink /> {companyData.weburl}
                          </a>
                        )}
                      </SectionCard>
                    </div>
                  )}
                </>
              )}

              {activeTab === "technical" && (
                <div className="space-y-6">
                  <SectionCard
                    title="Technical Chart"
                    subtitle="Interactive TradingView chart with full technical analysis tools."
                    icon={<FiBarChart2 className="text-blue-500" />}
                  >
                    <TradingViewChart symbol={ticker} />
                  </SectionCard>

                  {analysis.hasCandles ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <MetricCard
                        label="RSI (14)"
                        value={isNumber(analysis.rsi14) ? analysis.rsi14.toFixed(1) : "—"}
                        hint="Computed from daily candles"
                        accent="amber"
                      />
                      <MetricCard
                        label="EMA 20"
                        value={isNumber(analysis.ema20) ? formatPrice(analysis.ema20, analysis.assetType) : "—"}
                        hint={
                          isNumber(analysis.ema20)
                            ? `${formatSignedPercent(percentDiffFrom(stockData.c, analysis.ema20))} vs spot`
                            : "Needs 20+ candles"
                        }
                        accent="blue"
                      />
                      <MetricCard
                        label="EMA 50"
                        value={isNumber(analysis.ema50) ? formatPrice(analysis.ema50, analysis.assetType) : "—"}
                        hint="Medium trend filter"
                        accent="violet"
                      />
                      <MetricCard
                        label="SMA 20"
                        value={isNumber(analysis.sma20) ? formatPrice(analysis.sma20, analysis.assetType) : "—"}
                        hint="Short moving average"
                      />
                      <MetricCard
                        label="SMA 50"
                        value={isNumber(analysis.sma50) ? formatPrice(analysis.sma50, analysis.assetType) : "—"}
                        hint="Intermediate moving average"
                      />
                      <MetricCard
                        label="SMA 200"
                        value={isNumber(analysis.sma200) ? formatPrice(analysis.sma200, analysis.assetType) : "—"}
                        hint="Long-term trend regime"
                        accent="green"
                      />
                      <MetricCard
                        label="MACD"
                        value={isNumber(analysis.macd?.macd) ? formatNumber(analysis.macd?.macd, 3) : "—"}
                        hint="12/26 EMA spread"
                        accent="blue"
                      />
                      <MetricCard
                        label="Signal Line"
                        value={isNumber(analysis.macd?.signal) ? formatNumber(analysis.macd?.signal, 3) : "—"}
                        hint="9-period EMA on MACD"
                      />
                      <MetricCard
                        label="Histogram"
                        value={isNumber(analysis.macd?.histogram) ? formatNumber(analysis.macd?.histogram, 3) : "—"}
                        hint={
                          isNumber(analysis.macd?.histogram)
                            ? (analysis.macd?.histogram ?? 0) >= 0
                              ? "Bullish acceleration"
                              : "Bearish acceleration"
                            : "Needs 35+ candles"
                        }
                        accent={
                          isNumber(analysis.macd?.histogram) && (analysis.macd?.histogram ?? 0) >= 0
                            ? "green"
                            : "rose"
                        }
                      />
                      <MetricCard
                        label="ATR (14)"
                        value={isNumber(analysis.atr14) ? formatPrice(analysis.atr14, analysis.assetType) : "—"}
                        hint={isNumber(analysis.atrPct) ? `${analysis.atrPct.toFixed(2)}% of spot price` : "Average true range"}
                        accent="amber"
                      />
                      <MetricCard
                        label="Day Position"
                        value={analysis.dayRangePos !== null ? `${analysis.dayRangePos.toFixed(1)}%` : "—"}
                        hint="Placement inside today's low/high band"
                        accent="blue"
                      />
                      <MetricCard
                        label="52W Position"
                        value={analysis.week52Pos !== null ? `${analysis.week52Pos.toFixed(1)}%` : "—"}
                        hint="Placement inside annual range"
                        accent="violet"
                      />
                      <MetricCard
                        label="30D Volatility"
                        value={formatPercent(analysis.volatility30d)}
                        hint="Daily realized volatility"
                      />
                      <MetricCard
                        label="Volume Ratio"
                        value={isNumber(analysis.volumeRatio) ? `${analysis.volumeRatio.toFixed(2)}x` : "—"}
                        hint="Latest volume vs 20D average"
                        accent="green"
                      />
                      <MetricCard
                        label="Recent Support"
                        value={formatPrice(analysis.recentSupport, analysis.assetType)}
                        hint="20-session floor"
                        accent="blue"
                      />
                      <MetricCard
                        label="Recent Resistance"
                        value={formatPrice(analysis.recentResistance, analysis.assetType)}
                        hint="20-session ceiling"
                        accent="violet"
                      />
                    </div>
                  ) : (
                    <EmptyState
                      title="Technical indicators are shown on the chart"
                      description="Use the TradingView chart above to add RSI, MACD, moving averages, and other indicators directly. Click the indicators button in the chart toolbar."
                    />
                  )}

                  {analysis.hasCandles && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <SectionCard
                        title="What It Means"
                        icon={<FiCpu className="text-violet-400" />}
                      >
                        <div className="space-y-4 text-sm text-gray-300 leading-7">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.06]">
                            Trend: <span className="font-bold text-white">{analysis.trendBias}</span>.{" "}
                            {isNumber(analysis.sma50) && isNumber(analysis.sma200)
                              ? analysis.sma50 > analysis.sma200
                                ? "The short-term trend is stronger than the long-term — a positive sign."
                                : "The short-term trend is weaker than the long-term — be cautious."
                              : "Not enough data to compare trends yet."}
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.06]">
                            Momentum:{" "}
                            <span className="font-bold text-white">
                              {isNumber(analysis.rsi14) ? `RSI ${analysis.rsi14.toFixed(0)}` : "—"}
                            </span>
                            {isNumber(analysis.rsi14)
                              ? analysis.rsi14 > 70
                                ? " — overbought, the price may pull back."
                                : analysis.rsi14 < 35
                                ? " — oversold, the price could bounce back."
                                : " — balanced, no extreme pressure either way."
                              : " — needs more price history."}
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.06]">
                            Daily movement:{" "}
                            <span className="font-bold text-white">
                              {isNumber(analysis.atr14) ? formatPrice(analysis.atr14, analysis.assetType) : "—"}
                            </span>
                            {isNumber(analysis.atrPct) ? ` on average (${analysis.atrPct.toFixed(2)}% of price).` : "."}
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Score Overview"
                        icon={<FiShield className="text-sky-400" />}
                      >
                        <div className="space-y-5">
                          <ProgressBar label="Stability" value={analysis.meters.stability} tone="violet" />
                          <ProgressBar label="Trend" value={analysis.meters.trend} tone="blue" />
                          <ProgressBar label="Momentum" value={analysis.meters.momentum} tone="amber" />
                          <ProgressBar label="Sentiment" value={analysis.meters.sentiment} tone="green" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                          <MetricCard
                            label="Risk Level"
                            value={analysis.riskLevel}
                            hint="Based on how much the price swings"
                            accent="rose"
                          />
                          <MetricCard
                            label="Overall Score"
                            value={`${Math.round(analysis.score)}/100`}
                            hint="Combined rating from all factors"
                            accent="green"
                          />
                        </div>
                      </SectionCard>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "fundamentals" && (
                analysis.assetType === "stock" ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <SectionCard
                        title="Valuation & Profitability"
                        icon={<FiBriefcase className="text-amber-400" />}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <MetricCard
                            label="P / E"
                            value={formatNumber(basicFinancials?.metric?.peBasicExclExtraTTM ?? null, 2)}
                            hint="Price vs earnings — lower may mean cheaper"
                          />
                          <MetricCard
                            label="EPS"
                            value={formatNumber(
                              basicFinancials?.metric?.epsBasicExclExtraItemsTTM ?? null,
                              2
                            )}
                            hint="Earnings per share over the last year"
                            accent="green"
                          />
                          <MetricCard
                            label="Dividend Yield"
                            value={formatPercent(
                              basicFinancials?.metric?.dividendYieldIndicatedAnnual ?? null
                            )}
                            hint="Annual cash return to shareholders"
                          />
                          <MetricCard
                            label="Beta"
                            value={formatNumber(basicFinancials?.metric?.beta ?? null, 2)}
                            hint="How much the stock moves vs the market"
                            accent="rose"
                          />
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Financial Health"
                        icon={<FiShield className="text-sky-400" />}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <MetricCard
                            label="Current Ratio"
                            value={formatNumber(
                              basicFinancials?.metric?.currentRatioQuarterly ?? null,
                              2
                            )}
                            hint="Can the company pay its short-term bills?"
                            accent="blue"
                          />
                          <MetricCard
                            label="Debt / Equity"
                            value={formatNumber(
                              basicFinancials?.metric?.totalDebtToEquityQuarterly ?? null,
                              2
                            )}
                            hint="How much debt vs equity — lower is safer"
                            accent="rose"
                          />
                          <MetricCard
                            label="52W High"
                            value={formatPrice(analysis.week52High, "stock")}
                            hint="Annual top"
                            accent="violet"
                          />
                          <MetricCard
                            label="52W Low"
                            value={formatPrice(analysis.week52Low, "stock")}
                            hint="Annual floor"
                            accent="blue"
                          />
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Street Targets"
                        icon={<FiTarget className="text-emerald-400" />}
                      >
                        {priceTargetData ? (
                          <div className="space-y-4">
                            <MetricCard
                              label="Mean Target"
                              value={formatPrice(priceTargetData.targetMean ?? null, "stock")}
                              hint={
                                isNumber(analysis.priceTargetUpside)
                                  ? `${formatSignedPercent(analysis.priceTargetUpside)} upside/downside from spot`
                                  : "Upside not returned"
                              }
                              accent={
                                isNumber(analysis.priceTargetUpside) && (analysis.priceTargetUpside ?? 0) >= 0
                                  ? "green"
                                  : "rose"
                              }
                            />
                            <MetricCard
                              label="Median Target"
                              value={formatPrice(priceTargetData.targetMedian ?? null, "stock")}
                              hint={`Updated ${formatDate(priceTargetData.lastUpdated)}`}
                            />
                            <MetricCard
                              label="Target Range"
                              value={`${formatPrice(priceTargetData.targetLow ?? null, "stock")} — ${formatPrice(
                                priceTargetData.targetHigh ?? null,
                                "stock"
                              )}`}
                              hint="Street low / high"
                              accent="violet"
                            />
                          </div>
                        ) : (
                          <EmptyState
                            title="No price target data"
                            description="The target block will appear when Finnhub returns analyst targets for this symbol."
                          />
                        )}
                      </SectionCard>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <SectionCard
                        title="Recent Earnings History"
                        icon={<FiCalendar className="text-violet-400" />}
                        className="xl:col-span-2"
                      >
                        {earningsData.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {earningsData.slice(0, 4).map((item, index) => {
                              const surpriseValue = isNumber(item.surprisePercent)
                                ? item.surprisePercent
                                : percentDiffFrom(item.actual ?? null, item.estimate ?? null);

                              return (
                                <div
                                  key={`${item.period}-${index}`}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 min-w-0"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                                        {item.period || "Period N/A"}
                                      </p>
                                      <p className="mt-2 text-lg font-black text-white break-words">
                                        EPS {formatNumber(item.actual ?? null, 2)}
                                      </p>
                                    </div>

                                    <span
                                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                                        isNumber(surpriseValue) && (surpriseValue ?? 0) >= 0
                                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                          : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                                      }`}
                                    >
                                      {formatSignedPercent(surpriseValue)}
                                    </span>
                                  </div>

                                  <div className="mt-4 space-y-2 text-sm text-gray-400">
                                    <p>
                                      Estimate:{" "}
                                      <span className="font-bold text-white">
                                        {formatNumber(item.estimate ?? null, 2)}
                                      </span>
                                    </p>

                                    <p>
                                      Revenue:{" "}
                                      <span className="font-bold text-white">
                                        {formatCompactNumber(item.revenueActual ?? null, "$")}
                                      </span>
                                      {" / "}
                                      <span className="font-bold text-white">
                                        {formatCompactNumber(item.revenueEstimate ?? null, "$")}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState
                            title="No earnings records returned"
                            description="Earnings history will show here once the API returns company earnings rows."
                          />
                        )}
                      </SectionCard>

                      <SectionCard
                        title="Company Snapshot"
                        icon={<FiGlobe className="text-blue-400" />}
                      >
                        <div className="space-y-4">
                          {[
                            { label: "Company", value: companyData?.name || cleanSymbol(ticker) },
                            { label: "Ticker", value: ticker },
                            { label: "Exchange", value: companyData?.exchange || "N/A" },
                            { label: "Country", value: companyData?.country || "N/A" },
                            { label: "Currency", value: companyData?.currency || "N/A" },
                            { label: "Industry", value: companyData?.finnhubIndustry || "N/A" },
                            { label: "IPO", value: companyData?.ipo || "N/A" },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                            >
                              <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                                {item.label}
                              </span>
                              <span className="text-sm font-black text-white text-right break-words">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    </div>
                  </div>
                ) : (
                  <SectionCard
                    title="Fundamentals"
                    icon={<FiBriefcase className="text-amber-400" />}
                  >
                    <EmptyState
                      title="Stocks only"
                      description="Financial data like P/E ratio, earnings, and balance sheet info is only available for stocks. Use the Overview or Technical tabs for crypto and forex."
                    />
                  </SectionCard>
                )
              )}

              {activeTab === "news" && (
                <SectionCard
                  title="Company News Feed"
                  subtitle="Latest news articles about this company."
                  icon={<FiGlobe className="text-blue-400" />}
                  headerRight={
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gray-400 font-bold">
                      {newsData.length} headlines
                    </span>
                  }
                >
                  {analysis.assetType === "stock" ? (
                    newsData.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {newsData.map((item, index) => (
                          <NewsCard key={`${item.id ?? item.headline}-${index}`} item={item} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="No recent company headlines"
                        description="No news articles were returned for this symbol in the selected recent window."
                      />
                    )
                  ) : (
                    <EmptyState
                      title="News feed is configured for stocks"
                      description="This news view currently focuses on company-specific equity headlines."
                    />
                  )}
                </SectionCard>
              )}
            </div>
          </div>
        )}
        <footer className="relative z-10 border-t border-white/5 mt-0">
          <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                STOCKIFY
              </span>
              <span className="text-xs text-gray-600">Real-time Market Intelligence</span>
            </div>
            <p className="text-xs text-gray-600 text-center">
              Data provided by Finnhub. Charts powered by TradingView. Not financial advice.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
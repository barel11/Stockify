"use client";

import {
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
} from "react-icons/fi";

const API_KEY = "d6t63tpr01qoqoisd0p0d6t63tpr01qoqoisd0pg";

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

type CandlestickChartProps = {
  candles: CandleData | null;
  assetType: AssetType;
  currentPrice?: number | null;
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

// תוקן באג פוטנציאלי לטיפול ב-NaN בערכים ריקים
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

const calculateSMAArray = (values: number[], period: number) =>
  values.map((_, index) =>
    index + 1 < period ? null : average(values.slice(index + 1 - period, index + 1))
  );

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

const getPolylinePoints = (
  values: Array<number | null>,
  minValue: number,
  maxValue: number,
  width: number,
  height: number,
  paddingTop = 20,
  paddingBottom = 20
) => {
  const drawableHeight = height - paddingTop - paddingBottom;
  const lastIndex = Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      if (!isNumber(value)) return null;

      const x = (index / lastIndex) * width;
      const y =
        paddingTop +
        (maxValue === minValue
          ? drawableHeight / 2
          : ((maxValue - value) / (maxValue - minValue)) * drawableHeight);

      return `${x},${y}`;
    })
    .filter((point): point is string => Boolean(point))
    .join(" ");
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
      className={`min-w-0 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl ${className}`}
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
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
          className={`h-full rounded-full ${toneMap[tone]}`}
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

function CandlestickChart({ candles, assetType, currentPrice }: CandlestickChartProps) {
  const chart = useMemo(() => {
    if (!candles?.c?.length || !candles?.o?.length || !candles?.h?.length || !candles?.l?.length) {
      return null;
    }

    const total = Math.min(
      candles.c.length,
      candles.o.length,
      candles.h.length,
      candles.l.length,
      candles.t.length
    );

    if (!total) return null;

    const visibleCount = Math.min(42, total);
    const start = total - visibleCount;

    const visible = Array.from({ length: visibleCount }, (_, index) => ({
      open: candles.o[start + index],
      high: candles.h[start + index],
      low: candles.l[start + index],
      close: candles.c[start + index],
      time: candles.t[start + index],
      volume: candles.v[start + index] ?? 0,
    })).filter(
      (item) =>
        isNumber(item.open) &&
        isNumber(item.high) &&
        isNumber(item.low) &&
        isNumber(item.close) &&
        isNumber(item.time)
    );

    if (!visible.length) return null;

    const fullSma20 = calculateSMAArray(candles.c.slice(0, total), 20).slice(-visible.length);
    const fullSma50 = calculateSMAArray(candles.c.slice(0, total), 50).slice(-visible.length);

    return {
      visible,
      sma20: fullSma20,
      sma50: fullSma50,
    };
  }, [candles]);

  if (!chart) {
    return (
      <EmptyState
        title="Chart data is not available yet"
        description="I could not build the candlestick view for this symbol. Try another ticker or wait for candles to load."
      />
    );
  }

  const width = 920;
  const height = 330;
  const paddingTop = 18;
  const paddingBottom = 28;
  const drawableHeight = height - paddingTop - paddingBottom;

  const highestPrice = Math.max(...chart.visible.map((candle) => candle.high));
  const lowestPrice = Math.min(...chart.visible.map((candle) => candle.low));
  const candleSlot = width / chart.visible.length;
  const bodyWidth = Math.max(4, candleSlot * 0.56);

  const priceToY = (price: number) =>
    paddingTop +
    (highestPrice === lowestPrice
      ? drawableHeight / 2
      : ((highestPrice - price) / (highestPrice - lowestPrice)) * drawableHeight);

  const sma20Points = getPolylinePoints(
    chart.sma20,
    lowestPrice,
    highestPrice,
    width,
    height,
    paddingTop,
    paddingBottom
  );

  const sma50Points = getPolylinePoints(
    chart.sma50,
    lowestPrice,
    highestPrice,
    width,
    height,
    paddingTop,
    paddingBottom
  );

  const firstVisible = chart.visible[0];
  const lastVisible = chart.visible[chart.visible.length - 1];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[720px] h-[320px]">
          {Array.from({ length: 5 }).map((_, index) => {
            const y = paddingTop + (drawableHeight / 4) * index;
            return (
              <line
                key={`grid-${index}`}
                x1={0}
                x2={width}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            );
          })}

          {sma20Points && (
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.4"
              points={sma20Points}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />
          )}

          {sma50Points && (
            <polyline
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.4"
              points={sma50Points}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />
          )}

          {chart.visible.map((candle, index) => {
            const x = index * candleSlot + candleSlot / 2;
            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1.8);
            const bullish = candle.close >= candle.open;
            const bodyFill = bullish ? "rgba(34,197,94,0.95)" : "rgba(244,63,94,0.95)";
            const wickStroke = bullish ? "rgba(74,222,128,0.95)" : "rgba(251,113,133,0.95)";

            return (
              <g key={`${candle.time}-${index}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={highY}
                  y2={lowY}
                  stroke={wickStroke}
                  strokeWidth="1.6"
                  opacity="0.95"
                />
                <rect
                  x={x - bodyWidth / 2}
                  y={bodyTop}
                  width={bodyWidth}
                  height={bodyHeight}
                  rx="2"
                  fill={bodyFill}
                />
              </g>
            );
          })}

          {isNumber(currentPrice) && (
            <line
              x1={0}
              x2={width}
              y1={priceToY(currentPrice)}
              y2={priceToY(currentPrice)}
              stroke="rgba(59,130,246,0.65)"
              strokeDasharray="7 6"
              strokeWidth="1.3"
            />
          )}
        </svg>
      </div>

      <div className="border-t border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-[2px] w-5 bg-amber-400 rounded-full" />
            SMA 20
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-[2px] w-5 bg-violet-500 rounded-full" />
            SMA 50
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
            Bullish candle
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-rose-500" />
            Bearish candle
          </span>
        </div>

        <div className="text-right">
          {formatDate(firstVisible.time)} — {formatDate(lastVisible.time)} · Daily candles ·{" "}
          {formatPrice(lowestPrice, assetType)} / {formatPrice(highestPrice, assetType)}
        </div>
      </div>
    </div>
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

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
    }
  };

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setTicker(value);

    if (value.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

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
      setShowSuggestions(false);
    }
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
    
    // הגנה אחרונה לחישוב הקומפוזיט
    if (!Number.isFinite(compositeScore)) compositeScore = 50;

    const signal = getSignalFromScore(compositeScore);

    const trendBias =
      trendMeter >= 65
        ? "Bullish continuation bias"
        : trendMeter <= 35
        ? "Bearish pressure bias"
        : "Balanced / range bias";

    const riskLevel =
      stabilityMeter >= 68 ? "Controlled" : stabilityMeter >= 48 ? "Balanced" : "Aggressive";

    const summaryParts: string[] = [
      `${cleanSymbol(ticker)} is currently rated ${signal.text.toLowerCase()} with a composite score of ${Math.round(
        compositeScore
      )}/100.`,
    ];

    if (isNumber(rsi14)) {
      summaryParts.push(
        rsi14 > 70
          ? `RSI is ${rsi14.toFixed(1)}, so momentum is extended and hot.`
          : rsi14 < 35
          ? `RSI is ${rsi14.toFixed(1)}, which points to weak or oversold momentum.`
          : `RSI is ${rsi14.toFixed(1)}, which keeps momentum in a healthier zone.`
      );
    }

    if (isNumber(ema20) && isNumber(ema50)) {
      summaryParts.push(
        `Spot is ${stockData.c > ema20 ? "above" : "below"} EMA 20, and the short trend is ${
          ema20 > ema50 ? "still above" : "still below"
        } EMA 50.`
      );
    }

    if (assetType === "stock" && isNumber(priceTargetUpside)) {
      summaryParts.push(
        `Street mean target implies ${formatSignedPercent(priceTargetUpside)} from the current price.`
      );
    }

    return {
      assetType,
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
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes superFloat {
              0% { transform: translate(0px, 0px) scale(1); }
              33% { transform: translate(100px, -100px) scale(1.3); }
              66% { transform: translate(-100px, 100px) scale(0.7); }
              100% { transform: translate(0px, 0px) scale(1); }
            }
            .force-animate-blob {
              animation: superFloat 4.5s infinite alternate ease-in-out;
            }
            .force-delay {
              animation-delay: 2s;
            }
            ::-webkit-scrollbar {
              display: none;
            }
          `,
        }}
      />

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
                  type="text"
                  placeholder="Search ticker (e.g. AAPL, BTC, ETH, EUR_USD)"
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
                      <img
                        src={companyData.logo}
                        alt="logo"
                        className="w-20 h-20 rounded-2xl shadow-xl bg-white p-1 shrink-0"
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
                      </div>

                      <p className="mt-5 max-w-3xl text-sm md:text-[15px] text-gray-400 leading-8">
                        {analysis.summary}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full 2xl:w-auto 2xl:min-w-[620px]">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                        Spot Price
                      </p>
                      <p className="mt-3 text-4xl md:text-5xl font-black tracking-tight break-all leading-tight">
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
                      className={`rounded-3xl border p-5 min-w-0 ${analysis.signal.bg} ${analysis.signal.border}`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                        Composite Signal
                      </p>
                      <p className={`mt-3 text-2xl md:text-3xl font-black break-words ${analysis.signal.color}`}>
                        {analysis.signal.text}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-gray-400">
                        <span>{Math.round(analysis.score)}/100</span>
                        <span>{analysis.riskLevel} risk</span>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                        Live Read
                      </p>
                      <p className="mt-3 text-xl md:text-2xl font-black text-white break-words">
                        {analysis.trendBias}
                      </p>
                      <div className="mt-4 space-y-2 text-xs text-gray-400">
                        <div className="flex items-center justify-between gap-4">
                          <span>Day placement</span>
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
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                      <SectionCard
                        title="Price Action & Structure"
                        subtitle="Daily candlestick view with moving average overlays and cleaner price formatting."
                        icon={<FiActivity className="text-blue-500" />}
                        headerRight={
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gray-400 font-bold">
                            {analysis.assetType}
                          </span>
                        }
                      >
                        <CandlestickChart
                          candles={candlesData}
                          assetType={analysis.assetType}
                          currentPrice={stockData.c}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                          <MetricCard
                            label="Open"
                            value={formatPrice(stockData.o, analysis.assetType)}
                            hint="Current session open"
                            accent="blue"
                          />
                          <MetricCard
                            label="Prev Close"
                            value={formatPrice(stockData.pc, analysis.assetType)}
                            hint="Previous official close"
                          />
                          <MetricCard
                            label="Day Low / High"
                            value={`${formatPrice(stockData.l, analysis.assetType)} — ${formatPrice(
                              stockData.h,
                              analysis.assetType
                            )}`}
                            hint="Intraday price range"
                          />
                          <MetricCard
                            label="Open Gap"
                            value={formatSignedPercent(analysis.openGapPct)}
                            hint="Open vs previous close"
                            accent={
                              isNumber(analysis.openGapPct) && (analysis.openGapPct ?? 0) >= 0
                                ? "green"
                                : "rose"
                            }
                          />
                        </div>
                      </SectionCard>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <MetricCard
                          label="RSI (14)"
                          value={isNumber(analysis.rsi14) ? analysis.rsi14.toFixed(1) : "Insufficient history"}
                          hint={
                            isNumber(analysis.rsi14)
                              ? analysis.rsi14 > 70
                                ? "Momentum is extended"
                                : analysis.rsi14 < 35
                                ? "Momentum is weak / oversold"
                                : "Momentum is balanced"
                              : "Loaded from candles when history is available"
                          }
                          accent="amber"
                        />
                        <MetricCard
                          label="MACD Histogram"
                          value={isNumber(analysis.macd?.histogram) ? formatNumber(analysis.macd?.histogram, 3) : "Insufficient history"}
                          hint="Positive usually supports bullish momentum"
                          accent={
                            isNumber(analysis.macd?.histogram) && (analysis.macd?.histogram ?? 0) >= 0
                              ? "green"
                              : "rose"
                          }
                        />
                        <MetricCard
                          label="Volume Ratio"
                          value={isNumber(analysis.volumeRatio) ? `${analysis.volumeRatio.toFixed(2)}x` : "N/A"}
                          hint="Latest volume vs 20-day average"
                          accent="violet"
                        />
                        <MetricCard
                          label="30D Volatility"
                          value={formatPercent(analysis.volatility30d)}
                          hint="Daily realized volatility"
                          accent="blue"
                        />
                        <MetricCard
                          label="ATR (14)"
                          value={isNumber(analysis.atr14) ? formatPrice(analysis.atr14, analysis.assetType) : "Insufficient history"}
                          hint={isNumber(analysis.atrPct) ? `${analysis.atrPct.toFixed(2)}% of spot price` : "Average true range"}
                          accent="amber"
                        />
                        <MetricCard
                          label="Support"
                          value={formatPrice(analysis.recentSupport, analysis.assetType)}
                          hint="Recent 20-session floor"
                          accent="blue"
                        />
                        <MetricCard
                          label="Pivot"
                          value={formatPrice(analysis.pivot, analysis.assetType)}
                          hint="Intraday tactical midpoint"
                        />
                        <MetricCard
                          label="Resistance"
                          value={formatPrice(analysis.recentResistance, analysis.assetType)}
                          hint="Recent 20-session ceiling"
                          accent="violet"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <SectionCard
                        title="Composite Breakdown"
                        subtitle="Signal decomposition so the dashboard feels explainable instead of just decorative."
                        icon={<FiCpu className="text-violet-400" />}
                      >
                        <div className="space-y-5">
                          <ProgressBar label="Trend" value={analysis.meters.trend} tone="blue" />
                          <ProgressBar label="Momentum" value={analysis.meters.momentum} tone="amber" />
                          <ProgressBar label="Sentiment" value={analysis.meters.sentiment} tone="green" />
                          <ProgressBar label="Stability" value={analysis.meters.stability} tone="violet" />
                        </div>

                        <div className="mt-6 space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300 leading-7">
                            Spot is{" "}
                            <span className="font-bold text-white">
                              {isNumber(analysis.ema20) && stockData.c > (analysis.ema20 ?? 0)
                                ? "above"
                                : isNumber(analysis.ema20)
                                ? "below"
                                : "not yet compared with"}
                            </span>{" "}
                            EMA 20{" "}
                            {isNumber(analysis.ema20)
                              ? `by ${formatSignedPercent(percentDiffFrom(stockData.c, analysis.ema20))}.`
                              : "because more candle history is needed."}
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300 leading-7">
                            RSI is{" "}
                            <span className="font-bold text-white">
                              {isNumber(analysis.rsi14) ? analysis.rsi14.toFixed(1) : "not available yet"}
                            </span>
                            {isNumber(analysis.rsi14)
                              ? analysis.rsi14 > 70
                                ? ", which is overheated."
                                : analysis.rsi14 < 35
                                ? ", which is soft / oversold."
                                : ", which is balanced."
                              : " because the chart history is still insufficient."}
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300 leading-7">
                            MACD histogram is{" "}
                            <span className="font-bold text-white">
                              {isNumber(analysis.macd?.histogram)
                                ? formatNumber(analysis.macd?.histogram, 3)
                                : "not ready"}
                            </span>
                            {isNumber(analysis.macd?.histogram)
                              ? (analysis.macd?.histogram ?? 0) >= 0
                                ? ", supporting bullish acceleration."
                                : ", showing fading momentum."
                              : " until more candles are processed."}
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Tactical Map"
                        subtitle="Clean execution levels for continuation, rejection, and invalidation."
                        icon={<FiTarget className="text-cyan-400" />}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                              Support
                            </span>
                            <span className="text-lg font-black text-blue-400 break-all">
                              {formatPrice(analysis.recentSupport, analysis.assetType)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                              Pivot
                            </span>
                            <span className="text-lg font-black text-white break-all">
                              {formatPrice(analysis.pivot, analysis.assetType)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                              Resistance
                            </span>
                            <span className="text-lg font-black text-violet-400 break-all">
                              {formatPrice(analysis.recentResistance, analysis.assetType)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300 leading-7">
                            Bull case: hold above {formatPrice(analysis.pivot, analysis.assetType)} and clear{" "}
                            {formatPrice(analysis.recentResistance, analysis.assetType)} with expanding volume.
                          </div>

                          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300 leading-7">
                            Weakness trigger: lose {formatPrice(analysis.recentSupport, analysis.assetType)} and fail to reclaim the pivot.
                          </div>
                        </div>
                      </SectionCard>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    <SectionCard
                      title="Market Snapshot"
                      icon={<FiShield className="text-sky-400" />}
                      className="xl:col-span-1"
                    >
                      <div className="space-y-4">
                        {[
                          { label: "Exchange", value: companyData?.exchange || "N/A" },
                          { label: "Country", value: companyData?.country || "N/A" },
                          { label: "Currency", value: companyData?.currency || "N/A" },
                          { label: "Industry", value: companyData?.finnhubIndustry || "N/A" },
                          { label: "IPO", value: companyData?.ipo || "N/A" },
                          { label: "Updated", value: formatDateTime(stockData.t) },
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

                      {companyData?.weburl && (
                        <a
                          href={companyData.weburl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex items-center gap-2 text-sm text-blue-300 hover:text-white transition-colors break-all"
                        >
                          <FiExternalLink />
                          {companyData.weburl}
                        </a>
                      )}
                    </SectionCard>

                    <SectionCard
                      title="Street Target"
                      icon={<FiTarget className="text-amber-400" />}
                      className="xl:col-span-1"
                    >
                      {analysis.assetType === "stock" ? (
                        priceTargetData ? (
                          <div className="space-y-4">
                            <MetricCard
                              label="Mean Target"
                              value={formatPrice(priceTargetData.targetMean ?? null, "stock")}
                              hint={
                                isNumber(analysis.priceTargetUpside)
                                  ? `${formatSignedPercent(analysis.priceTargetUpside)} vs current spot`
                                  : "Upside not available"
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
                              hint={`Last updated ${formatDate(priceTargetData.lastUpdated)}`}
                              accent="blue"
                            />
                            <MetricCard
                              label="High / Low"
                              value={`${formatPrice(priceTargetData.targetLow ?? null, "stock")} — ${formatPrice(
                                priceTargetData.targetHigh ?? null,
                                "stock"
                              )}`}
                              hint="Street target range"
                              accent="violet"
                            />
                          </div>
                        ) : (
                          <EmptyState
                            title="No price target available"
                            description="Price target data is not available for this stock right now."
                          />
                        )
                      ) : (
                        <EmptyState
                          title="Targets are stock-only here"
                          description="This price target block is only displayed for equities."
                        />
                      )}
                    </SectionCard>

                    <SectionCard
                      title="Analyst Consensus"
                      icon={<FiZap className="text-emerald-400" />}
                      className="xl:col-span-1"
                    >
                      {analysis.assetType === "stock" && analysis.latestRec ? (
                        <>
                          <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-gray-900 flex">
                            <div
                              className="bg-green-400/90"
                              style={{
                                width: `${
                                  analysis.totalRec
                                    ? (((analysis.latestRec.strongBuy ?? 0) / analysis.totalRec) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                            <div
                              className="bg-emerald-500/80"
                              style={{
                                width: `${
                                  analysis.totalRec
                                    ? (((analysis.latestRec.buy ?? 0) / analysis.totalRec) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                            <div
                              className="bg-gray-500/70"
                              style={{
                                width: `${
                                  analysis.totalRec
                                    ? (((analysis.latestRec.hold ?? 0) / analysis.totalRec) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                            <div
                              className="bg-rose-500/80"
                              style={{
                                width: `${
                                  analysis.totalRec
                                    ? (((analysis.latestRec.sell ?? 0) / analysis.totalRec) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                            <div
                              className="bg-red-500/90"
                              style={{
                                width: `${
                                  analysis.totalRec
                                    ? (((analysis.latestRec.strongSell ?? 0) / analysis.totalRec) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-5 gap-2 mt-4">
                            {[
                              { label: "SB", value: analysis.latestRec.strongBuy ?? 0 },
                              { label: "B", value: analysis.latestRec.buy ?? 0 },
                              { label: "H", value: analysis.latestRec.hold ?? 0 },
                              { label: "S", value: analysis.latestRec.sell ?? 0 },
                              { label: "SS", value: analysis.latestRec.strongSell ?? 0 },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center"
                              >
                                <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                                  {item.label}
                                </p>
                                <p className="text-lg font-black text-white mt-1">{item.value}</p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 space-y-2 text-sm text-gray-300">
                            <p>
                              Period: <span className="font-bold text-white">{analysis.latestRec.period}</span>
                            </p>
                            <p>
                              Bullish share:{" "}
                              <span className="font-bold text-emerald-400">
                                {formatPercent(analysis.bullishPct)}
                              </span>
                            </p>
                            <p>
                              Bearish share:{" "}
                              <span className="font-bold text-rose-400">
                                {formatPercent(analysis.bearishPct)}
                              </span>
                            </p>
                          </div>
                        </>
                      ) : (
                        <EmptyState
                          title="No analyst panel yet"
                          description="Analyst consensus is unavailable for this asset or ticker at the moment."
                        />
                      )}
                    </SectionCard>

                    <SectionCard
                      title="Recent Earnings"
                      icon={<FiCalendar className="text-violet-400" />}
                      className="xl:col-span-1"
                    >
                      {analysis.assetType === "stock" ? (
                        earningsData.length > 0 ? (
                          <div className="space-y-3">
                            {earningsData.slice(0, 3).map((item, index) => {
                              const surpriseValue = isNumber(item.surprisePercent)
                                ? item.surprisePercent
                                : percentDiffFrom(item.actual ?? null, item.estimate ?? null);

                              return (
                                <div
                                  key={`${item.period}-${index}`}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                                      {item.period || "Period N/A"}
                                    </span>
                                    <span
                                      className={`text-sm font-black ${
                                        isNumber(surpriseValue) && (surpriseValue ?? 0) >= 0
                                          ? "text-emerald-400"
                                          : "text-rose-400"
                                      }`}
                                    >
                                      {formatSignedPercent(surpriseValue)}
                                    </span>
                                  </div>

                                  <div className="mt-3 space-y-2 text-sm text-gray-300">
                                    <p>
                                      EPS actual:{" "}
                                      <span className="font-bold text-white">
                                        {formatNumber(item.actual ?? null, 2)}
                                      </span>
                                    </p>
                                    <p>
                                      EPS estimate:{" "}
                                      <span className="font-bold text-white">
                                        {formatNumber(item.estimate ?? null, 2)}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState
                            title="No recent earnings rows"
                            description="Recent earnings surprises were not returned for this ticker."
                          />
                        )
                      ) : (
                        <EmptyState
                          title="Earnings are stock-specific"
                          description="Crypto and FX symbols do not use the same company earnings block."
                        />
                      )}
                    </SectionCard>
                  </div>
                </>
              )}

              {activeTab === "technical" && (
                <div className="space-y-6">
                  <SectionCard
                    title="Technical Chart"
                    subtitle="Candles and moving averages, with most technical indicators computed locally from the candle history so you do not keep seeing dashes."
                    icon={<FiBarChart2 className="text-blue-500" />}
                  >
                    <CandlestickChart
                      candles={candlesData}
                      assetType={analysis.assetType}
                      currentPrice={stockData.c}
                    />
                  </SectionCard>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <MetricCard
                      label="RSI (14)"
                      value={isNumber(analysis.rsi14) ? analysis.rsi14.toFixed(1) : "Insufficient history"}
                      hint="Computed from daily candles"
                      accent="amber"
                    />
                    <MetricCard
                      label="EMA 20"
                      value={isNumber(analysis.ema20) ? formatPrice(analysis.ema20, analysis.assetType) : "Insufficient history"}
                      hint={
                        isNumber(analysis.ema20)
                          ? `${formatSignedPercent(percentDiffFrom(stockData.c, analysis.ema20))} vs spot`
                          : "Needs more candles"
                      }
                      accent="blue"
                    />
                    <MetricCard
                      label="EMA 50"
                      value={isNumber(analysis.ema50) ? formatPrice(analysis.ema50, analysis.assetType) : "Insufficient history"}
                      hint="Medium trend filter"
                      accent="violet"
                    />
                    <MetricCard
                      label="SMA 20"
                      value={isNumber(analysis.sma20) ? formatPrice(analysis.sma20, analysis.assetType) : "Insufficient history"}
                      hint="Short moving average"
                    />
                    <MetricCard
                      label="SMA 50"
                      value={isNumber(analysis.sma50) ? formatPrice(analysis.sma50, analysis.assetType) : "Insufficient history"}
                      hint="Intermediate moving average"
                    />
                    <MetricCard
                      label="SMA 200"
                      value={isNumber(analysis.sma200) ? formatPrice(analysis.sma200, analysis.assetType) : "Insufficient history"}
                      hint="Long-term trend regime"
                      accent="green"
                    />
                    <MetricCard
                      label="MACD"
                      value={isNumber(analysis.macd?.macd) ? formatNumber(analysis.macd?.macd, 3) : "Insufficient history"}
                      hint="12/26 EMA spread"
                      accent="blue"
                    />
                    <MetricCard
                      label="Signal Line"
                      value={isNumber(analysis.macd?.signal) ? formatNumber(analysis.macd?.signal, 3) : "Insufficient history"}
                      hint="9-period EMA on MACD"
                    />
                    <MetricCard
                      label="Histogram"
                      value={isNumber(analysis.macd?.histogram) ? formatNumber(analysis.macd?.histogram, 3) : "Insufficient history"}
                      hint={
                        isNumber(analysis.macd?.histogram)
                          ? (analysis.macd?.histogram ?? 0) >= 0
                            ? "Bullish acceleration"
                            : "Bearish acceleration"
                          : "Needs more candles"
                      }
                      accent={
                        isNumber(analysis.macd?.histogram) && (analysis.macd?.histogram ?? 0) >= 0
                          ? "green"
                          : "rose"
                      }
                    />
                    <MetricCard
                      label="ATR (14)"
                      value={isNumber(analysis.atr14) ? formatPrice(analysis.atr14, analysis.assetType) : "Insufficient history"}
                      hint={isNumber(analysis.atrPct) ? `${analysis.atrPct.toFixed(2)}% of spot price` : "Average true range"}
                      accent="amber"
                    />
                    <MetricCard
                      label="Day Position"
                      value={analysis.dayRangePos !== null ? `${analysis.dayRangePos.toFixed(1)}%` : "N/A"}
                      hint="Placement inside today's low/high band"
                      accent="blue"
                    />
                    <MetricCard
                      label="52W Position"
                      value={analysis.week52Pos !== null ? `${analysis.week52Pos.toFixed(1)}%` : "N/A"}
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
                      value={isNumber(analysis.volumeRatio) ? `${analysis.volumeRatio.toFixed(2)}x` : "N/A"}
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

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <SectionCard
                      title="Indicator Interpretation"
                      icon={<FiCpu className="text-violet-400" />}
                    >
                      <div className="space-y-4 text-sm text-gray-300 leading-7">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          Trend regime:{" "}
                          <span className="font-bold text-white">{analysis.trendBias}</span>.{" "}
                          {isNumber(analysis.sma50) && isNumber(analysis.sma200)
                            ? analysis.sma50 > analysis.sma200
                              ? "The 50-day average is above the 200-day average, which usually supports a healthier primary trend."
                              : "The 50-day average is below the 200-day average, which usually points to a weaker long-term regime."
                            : "Longer moving averages need more loaded history."}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          Momentum read:{" "}
                          <span className="font-bold text-white">
                            {isNumber(analysis.rsi14) ? analysis.rsi14.toFixed(1) : "N/A"}
                          </span>
                          {isNumber(analysis.rsi14)
                            ? analysis.rsi14 > 70
                              ? " indicates an overheated move."
                              : analysis.rsi14 < 35
                              ? " indicates oversold pressure."
                              : " indicates a more balanced momentum band."
                            : " will appear once there are enough candles."}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          Volatility / range: ATR is{" "}
                          <span className="font-bold text-white">
                            {isNumber(analysis.atr14)
                              ? formatPrice(analysis.atr14, analysis.assetType)
                              : "N/A"}
                          </span>
                          {isNumber(analysis.atrPct)
                            ? `, roughly ${analysis.atrPct.toFixed(2)}% of the spot price.`
                            : "."}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Risk & Positioning"
                      icon={<FiShield className="text-sky-400" />}
                    >
                      <div className="space-y-5">
                        <ProgressBar label="Stability" value={analysis.meters.stability} tone="violet" />
                        <ProgressBar label="Trend alignment" value={analysis.meters.trend} tone="blue" />
                        <ProgressBar label="Momentum quality" value={analysis.meters.momentum} tone="amber" />
                        <ProgressBar label="Sentiment support" value={analysis.meters.sentiment} tone="green" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        <MetricCard
                          label="Risk Profile"
                          value={analysis.riskLevel}
                          hint="Derived from volatility, ATR and beta when available"
                          accent="rose"
                        />
                        <MetricCard
                          label="Composite Score"
                          value={`${Math.round(analysis.score)}/100`}
                          hint="Weighted blend of trend, momentum, sentiment and stability"
                          accent="green"
                        />
                      </div>
                    </SectionCard>
                  </div>
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
                            hint="Trailing basic P/E"
                          />
                          <MetricCard
                            label="EPS"
                            value={formatNumber(
                              basicFinancials?.metric?.epsBasicExclExtraItemsTTM ?? null,
                              2
                            )}
                            hint="Trailing EPS"
                            accent="green"
                          />
                          <MetricCard
                            label="Dividend Yield"
                            value={formatPercent(
                              basicFinancials?.metric?.dividendYieldIndicatedAnnual ?? null
                            )}
                            hint="Indicated annual yield"
                          />
                          <MetricCard
                            label="Beta"
                            value={formatNumber(basicFinancials?.metric?.beta ?? null, 2)}
                            hint="Relative market sensitivity"
                            accent="rose"
                          />
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Balance Sheet & Resilience"
                        icon={<FiShield className="text-sky-400" />}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <MetricCard
                            label="Current Ratio"
                            value={formatNumber(
                              basicFinancials?.metric?.currentRatioQuarterly ?? null,
                              2
                            )}
                            hint="Short-term liquidity"
                            accent="blue"
                          />
                          <MetricCard
                            label="Debt / Equity"
                            value={formatNumber(
                              basicFinancials?.metric?.totalDebtToEquityQuarterly ?? null,
                              2
                            )}
                            hint="Leverage pressure"
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
                      title="Fundamentals are equity-focused here"
                      description="This tab is designed for company fundamentals like valuation, balance sheet, earnings and street targets. For crypto or forex, the strongest view remains the technical and market-structure tabs."
                    />
                  </SectionCard>
                )
              )}

              {activeTab === "news" && (
                <SectionCard
                  title="Company News Feed"
                  subtitle="Recent headlines for equity symbols, displayed in a cleaner card layout."
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
      </div>
    </>
  );
}
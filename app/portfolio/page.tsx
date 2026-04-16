"use client";

import { useEffect, useState, useCallback, useRef, type ChangeEvent } from "react";
import { useUser } from "@clerk/nextjs";
import {
  FiBriefcase,
  FiArrowUp,
  FiArrowDown,
  FiTrash2,
  FiSearch,
  FiPlus,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiPieChart,
  FiX,
  FiUpload,
} from "react-icons/fi";
import Link from "next/link";
import { useCurrency } from "@/lib/use-currency";
import Navbar from "@/components/Navbar";
import Background from "@/components/Background";
import PortfolioBenchmark from "@/components/PortfolioBenchmark";

type SuggestionItem = { symbol: string; description: string };
type FinnhubSearchResult = { symbol: string; description?: string; displaySymbol?: string };

type PortfolioItem = {
  id: string;
  symbol: string;
  shares: number;
  buy_price: number;
  company_name: string;
  created_at: string;
};

type QuoteData = { c: number; d: number; dp: number };

type HoldingData = PortfolioItem & { quote: QuoteData | null };

const MARKET_DB: SuggestionItem[] = [
  { symbol: "BINANCE:BTCUSDT", description: "Bitcoin (BTC / USD)" },
  { symbol: "BINANCE:ETHUSDT", description: "Ethereum (ETH / USD)" },
  { symbol: "BINANCE:SOLUSDT", description: "Solana (SOL / USD)" },
  { symbol: "OANDA:EUR_USD", description: "Euro / US Dollar (Forex)" },
];

export default function PortfolioPage() {
  const { isSignedIn } = useUser();
  const { symbol: cSym, convert: cConv } = useCurrency();
  const [holdings, setHoldings] = useState<HoldingData[]>([]);
  const [loading, setLoading] = useState(true);

  // Add holding form
  const [showForm, setShowForm] = useState(false);
  const [formSymbol, setFormSymbol] = useState("");
  const [formShares, setFormShares] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRef = useRef(0);

  const fetchSuggestions = useCallback(async (query: string) => {
    const requestId = ++counterRef.current;
    try {
      const localMatches = MARKET_DB.filter(
        (item) => item.symbol.toUpperCase().includes(query) || item.description.toUpperCase().includes(query)
      );
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (requestId !== counterRef.current) return;
      const data = res.ok ? ((await res.json()) as { result?: FinnhubSearchResult[] }) : null;
      const apiMatches: SuggestionItem[] = (data?.result ?? []).slice(0, 5).map((item) => ({
        symbol: item.symbol,
        description: item.description || item.displaySymbol || item.symbol,
      }));
      const merged = new Map<string, SuggestionItem>();
      for (const item of [...localMatches, ...apiMatches]) {
        if (!merged.has(item.symbol)) merged.set(item.symbol, item);
      }
      setSuggestions(Array.from(merged.values()).slice(0, 6));
      setShowSuggestions(true);
    } catch {
      if (requestId === counterRef.current) setShowSuggestions(false);
    }
  }, []);

  const handleSymbolChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    setFormSymbol(v);
    if (v.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  useEffect(() => {
    if (!isSignedIn) return;
    async function load() {
      try {
        const res = await fetch("/api/portfolio");
        const items: PortfolioItem[] = await res.json();
        const withQuotes = await Promise.all(
          items.map(async (item) => {
            const qr = await fetch(`/api/quote?symbol=${encodeURIComponent(item.symbol)}`);
            const quote = qr.ok ? ((await qr.json()) as QuoteData) : null;
            return { ...item, quote };
          })
        );
        setHoldings(withQuotes);
      } catch {
        setHoldings([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isSignedIn]);

  const handleAdd = async () => {
    if (!formSymbol || !formShares || !formPrice) return;
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: formSymbol, shares: formShares, buyPrice: formPrice, companyName: "" }),
      });
      if (res.ok) {
        const item: PortfolioItem = await res.json();
        const qr = await fetch(`/api/quote?symbol=${encodeURIComponent(item.symbol)}`);
        const quote = qr.ok ? ((await qr.json()) as QuoteData) : null;
        setHoldings((prev) => [{ ...item, quote }, ...prev]);
        setFormSymbol("");
        setFormShares("");
        setFormPrice("");
        setShowForm(false);
      }
    } catch {
      // ignore
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
    try {
      await fetch("/api/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      window.location.reload();
    }
  };

  const handleCsvImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      // Expect header: symbol,shares,buy_price (flexible order)
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const symbolIdx = header.findIndex((h) => h.includes("symbol") || h.includes("ticker"));
      const sharesIdx = header.findIndex((h) => h.includes("share") || h.includes("quantity") || h.includes("qty"));
      const priceIdx = header.findIndex((h) => h.includes("price") || h.includes("cost") || h.includes("avg"));

      if (symbolIdx === -1 || sharesIdx === -1 || priceIdx === -1) {
        alert("CSV must have columns: symbol/ticker, shares/quantity, price/cost");
        return;
      }

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
        const sym = cols[symbolIdx]?.toUpperCase();
        const shares = parseFloat(cols[sharesIdx]);
        const price = parseFloat(cols[priceIdx]);
        if (!sym || !Number.isFinite(shares) || !Number.isFinite(price) || shares <= 0 || price <= 0) continue;

        await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: sym, shares, buyPrice: price, companyName: sym }),
        });
        imported++;
      }

      if (imported > 0) window.location.reload();
      else alert("No valid rows found in CSV");
    } catch {
      alert("Failed to parse CSV file");
    } finally {
      setCsvImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // Portfolio calculations
  const withPrice = holdings.filter((h) => h.quote && h.quote.c > 0);
  const totalInvested = withPrice.reduce((sum, h) => sum + h.buy_price * h.shares, 0);
  const totalCurrent = withPrice.reduce((sum, h) => sum + (h.quote?.c ?? 0) * h.shares, 0);
  const totalPL = totalCurrent - totalInvested;
  const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const bestHolding = withPrice.length > 0 ? withPrice.reduce((a, b) => {
    const aPL = ((a.quote?.c ?? 0) - a.buy_price) / a.buy_price;
    const bPL = ((b.quote?.c ?? 0) - b.buy_price) / b.buy_price;
    return aPL > bPL ? a : b;
  }) : null;
  const worstHolding = withPrice.length > 1 ? withPrice.reduce((a, b) => {
    const aPL = ((a.quote?.c ?? 0) - a.buy_price) / a.buy_price;
    const bPL = ((b.quote?.c ?? 0) - b.buy_price) / b.buy_price;
    return aPL < bPL ? a : b;
  }) : null;

  return (
    <Background>
      <Navbar />

      <div className="relative z-10 pt-24 px-4 sm:px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FiBriefcase className="text-blue-400 text-2xl" />
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">Portfolio</h1>
            </div>
            <div className="flex items-center gap-2">
              <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
              <button
                onClick={() => csvInputRef.current?.click()}
                disabled={csvImporting}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
              >
                <FiUpload size={12} />
                {csvImporting ? "Importing..." : "Import CSV"}
              </button>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-blue-300 hover:bg-blue-500/20 transition-all"
              >
                {showForm ? <FiX /> : <FiPlus />}
                {showForm ? "Cancel" : "Add Holding"}
              </button>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-8">Track your investments with live P&L.</p>

          {/* Add holding form */}
          {showForm && (
            <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl mb-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-4 flex items-center gap-2">
                <FiPlus size={12} /> New Holding
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Symbol (e.g. AAPL)"
                    value={formSymbol}
                    onChange={handleSymbolChange}
                    onFocus={() => formSymbol.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                    spellCheck={false}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                      {suggestions.map((item) => (
                        <div
                          key={item.symbol}
                          onMouseDown={(e) => { e.preventDefault(); setFormSymbol(item.symbol); setShowSuggestions(false); }}
                          className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-blue-900/30 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                        >
                          <span className="font-bold text-blue-400 text-xs">{item.symbol}</span>
                          <span className="text-gray-500 text-[10px] text-right truncate">{item.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="Shares"
                  value={formShares}
                  onChange={(e) => setFormShares(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  min="0"
                  step="any"
                />
                <input
                  type="number"
                  placeholder="Buy Price ($)"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  min="0"
                  step="any"
                />
                <button
                  onClick={handleAdd}
                  disabled={formSubmitting || !formSymbol || !formShares || !formPrice}
                  className="rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-sm font-black uppercase tracking-wider text-white transition-all shadow-lg shadow-blue-600/20"
                >
                  {formSubmitting ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          )}

          {/* Stats cards */}
          {!loading && holdings.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5"><FiPieChart size={12} /> Portfolio Value</p>
                <p className="mt-2 text-2xl font-black text-white">{cSym}{cConv(totalCurrent).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5"><FiDollarSign size={12} /> Total P&L</p>
                <p className={`mt-2 text-2xl font-black ${totalPL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {totalPL >= 0 ? "+" : ""}{cSym}{Math.abs(cConv(totalPL)).toLocaleString(undefined, { maximumFractionDigits: 2 })} ({totalPLPct >= 0 ? "+" : ""}{totalPLPct.toFixed(2)}%)
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5"><FiTrendingUp size={12} /> Best</p>
                <p className="mt-2 text-lg font-black text-emerald-400">{bestHolding?.symbol ?? "—"}</p>
                {bestHolding && (
                  <p className="text-xs text-emerald-400/70">+{(((bestHolding.quote?.c ?? 0) - bestHolding.buy_price) / bestHolding.buy_price * 100).toFixed(2)}%</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5"><FiTrendingDown size={12} /> Worst</p>
                <p className="mt-2 text-lg font-black text-rose-400">{worstHolding?.symbol ?? "—"}</p>
                {worstHolding && (
                  <p className="text-xs text-rose-400/70">{(((worstHolding.quote?.c ?? 0) - worstHolding.buy_price) / worstHolding.buy_price * 100).toFixed(2)}%</p>
                )}
              </div>
            </div>
          )}

          {/* Portfolio vs S&P 500 */}
          {!loading && withPrice.length > 0 && (
            <PortfolioBenchmark
              holdings={withPrice
                .filter((h) => !h.symbol.includes(":"))
                .map((h) => ({ symbol: h.symbol, shares: h.shares, buy_price: h.buy_price }))}
            />
          )}

          {/* Performance Charts */}
          {!loading && withPrice.length > 0 && (() => {
            const holdingPLs = withPrice.map((h) => {
              const pl = ((h.quote?.c ?? 0) - h.buy_price) / h.buy_price * 100;
              const value = (h.quote?.c ?? 0) * h.shares;
              return { symbol: h.symbol, pl, value };
            }).sort((a, b) => b.pl - a.pl);

            const maxAbsPL = Math.max(...holdingPLs.map((h) => Math.abs(h.pl)), 1);

            // Allocation
            const totalVal = holdingPLs.reduce((s, h) => s + h.value, 0);
            const allocations = holdingPLs
              .map((h) => ({ symbol: h.symbol, pct: totalVal > 0 ? (h.value / totalVal) * 100 : 0 }))
              .sort((a, b) => b.pct - a.pct);

            const ALLOC_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                {/* P&L by Holding */}
                <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-4 flex items-center gap-1.5">
                    <FiTrendingUp size={12} /> P&L by Holding
                  </p>
                  <div className="space-y-3">
                    {holdingPLs.map((h) => (
                      <div key={h.symbol} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white w-16 shrink-0">{h.symbol}</span>
                        <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden relative">
                          <div
                            className={`h-full rounded-lg transition-all ${h.pl >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40"}`}
                            style={{ width: `${Math.min(Math.abs(h.pl) / maxAbsPL * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-black w-16 text-right shrink-0 ${h.pl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {h.pl >= 0 ? "+" : ""}{h.pl.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Portfolio Allocation */}
                <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-4 flex items-center gap-1.5">
                    <FiPieChart size={12} /> Allocation
                  </p>
                  {/* Stacked bar */}
                  <div className="h-8 rounded-full overflow-hidden flex mb-4">
                    {allocations.map((a, i) => (
                      <div
                        key={a.symbol}
                        className="h-full transition-all hover:opacity-80"
                        style={{
                          width: `${a.pct}%`,
                          backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length],
                          minWidth: a.pct > 0 ? "4px" : "0",
                        }}
                        title={`${a.symbol}: ${a.pct.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {allocations.map((a, i) => (
                      <div key={a.symbol} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                        />
                        <span className="text-xs font-bold text-white">{a.symbol}</span>
                        <span className="text-[10px] text-gray-500 ml-auto">{a.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Loading state */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative overflow-hidden rounded h-5 w-20 bg-white/[0.06]"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" /></div>
                    <div className="relative overflow-hidden rounded h-4 w-32 bg-white/[0.06]"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" /></div>
                    <div className="flex-1" />
                    <div className="relative overflow-hidden rounded h-6 w-24 bg-white/[0.06]"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-20">
              <FiBriefcase className="mx-auto text-4xl text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-gray-400 mb-2">No holdings yet</h2>
              <p className="text-sm text-gray-500 mb-6">Add your first holding to start tracking your portfolio performance.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-bold uppercase tracking-wider text-blue-300 hover:bg-blue-500/20 transition-all"
              >
                <FiPlus /> Add Holding
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-2 text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                <span>Symbol</span>
                <span className="text-right">Shares</span>
                <span className="text-right">Buy Price</span>
                <span className="text-right">Current</span>
                <span className="text-right">P&L</span>
                <span />
              </div>

              {holdings.map((h) => {
                const currentPrice = h.quote?.c ?? 0;
                const pl = (currentPrice - h.buy_price) * h.shares;
                const plPct = h.buy_price > 0 ? ((currentPrice - h.buy_price) / h.buy_price) * 100 : 0;
                const isPos = pl >= 0;

                return (
                  <div
                    key={h.id}
                    className="group rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 sm:p-6 shadow-2xl transition-all hover:border-white/20"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.5fr] gap-3 sm:gap-4 items-center">
                      <Link href={`/?ticker=${encodeURIComponent(h.symbol)}`} className="min-w-0">
                        <p className="text-lg font-black tracking-tight text-white group-hover:text-blue-300 transition-colors">{h.symbol}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{h.company_name || h.symbol}</p>
                      </Link>
                      <p className="text-right text-sm font-bold text-white">{h.shares}</p>
                      <p className="text-right text-sm font-bold text-gray-400">{cSym}{cConv(h.buy_price).toFixed(2)}</p>
                      <p className="text-right text-sm font-bold text-white">
                        {currentPrice > 0 ? `${cSym}${cConv(currentPrice).toFixed(2)}` : "N/A"}
                      </p>
                      <div className="text-right">
                        {currentPrice > 0 ? (
                          <>
                            <p className={`text-sm font-black ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                              {isPos ? "+" : ""}{cSym}{Math.abs(cConv(pl)).toFixed(2)}
                            </p>
                            <p className={`text-[10px] font-bold ${isPos ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                              {isPos ? "+" : ""}{plPct.toFixed(2)}%
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-600">—</p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleRemove(h.id)}
                          className="rounded-full p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Remove holding"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Background>
  );
}

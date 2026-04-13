"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FiStar, FiArrowUp, FiArrowDown, FiTrash2, FiSearch, FiTrendingUp, FiTrendingDown, FiBarChart2, FiWifi } from "react-icons/fi";
import Link from "next/link";
import { useLivePrices } from "@/lib/use-live-prices";

type WatchlistItem = {
  id: string;
  symbol: string;
  company_name: string;
  added_at: string;
};

type QuoteData = {
  c: number;
  d: number;
  dp: number;
};

type WatchlistCardData = WatchlistItem & {
  quote: QuoteData | null;
};

export default function WatchlistPage() {
  const { isSignedIn } = useUser();
  const [items, setItems] = useState<WatchlistCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsToken, setWsToken] = useState("");

  // Fetch WebSocket token
  useEffect(() => {
    fetch("/api/ws-token").then((r) => r.json()).then((d) => setWsToken(d.token ?? "")).catch(() => {});
  }, []);

  const liveSymbols = items.map((i) => i.symbol);
  const { prices: livePrices, connected } = useLivePrices(liveSymbols, wsToken);

  useEffect(() => {
    if (!isSignedIn) return;

    async function load() {
      try {
        const res = await fetch("/api/watchlist");
        const watchlist: WatchlistItem[] = await res.json();

        const withQuotes = await Promise.all(
          watchlist.map(async (item) => {
            const quoteRes = await fetch(`/api/quote?symbol=${encodeURIComponent(item.symbol)}`);
            const quote = quoteRes.ok ? ((await quoteRes.json()) as QuoteData) : null;
            return { ...item, quote };
          })
        );

        setItems(withQuotes);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isSignedIn]);

  const handleRemove = async (symbol: string) => {
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));

    try {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="bg-[#050505] text-white font-sans min-h-screen">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-indigo-600/30 rounded-full blur-[100px] animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      <div className="fixed top-5 left-6 right-6 z-50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
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
        </Link>
        <Link
          href="/"
          className="rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl px-4 py-2 text-xs font-bold tracking-wider uppercase text-gray-300 hover:border-blue-500/30 hover:text-white transition-all"
        >
          Search
        </Link>
      </div>

      <div className="relative z-10 pt-24 px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <FiStar className="text-amber-400 text-2xl" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Watchlist</h1>
          </div>
          <div className="flex items-center gap-3 mb-10">
            <p className="text-gray-400 text-sm">Your saved tickers with live market data.</p>
            {connected && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-bold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Live
              </span>
            )}
          </div>

          {!loading && items.length > 0 && (() => {
            const withPrice = items.filter((i) => i.quote && i.quote.c > 0);
            const totalValue = withPrice.reduce((sum, i) => sum + (i.quote?.c ?? 0), 0);
            const avgChange = withPrice.length > 0 ? withPrice.reduce((sum, i) => sum + (i.quote?.dp ?? 0), 0) / withPrice.length : 0;
            const best = withPrice.length > 0 ? withPrice.reduce((a, b) => (a.quote?.dp ?? 0) > (b.quote?.dp ?? 0) ? a : b) : null;
            const worst = withPrice.length > 0 ? withPrice.reduce((a, b) => (a.quote?.dp ?? 0) < (b.quote?.dp ?? 0) ? a : b) : null;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5"><FiBarChart2 size={12} /> Tickers</p>
                  <p className="mt-2 text-2xl font-black text-white">{items.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">Avg Change</p>
                  <p className={`mt-2 text-2xl font-black ${avgChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}%
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5"><FiTrendingUp size={12} /> Best</p>
                  <p className="mt-2 text-lg font-black text-emerald-400">{best?.symbol ?? "—"}</p>
                  <p className="text-xs text-emerald-400/70">{best ? `+${(best.quote?.dp ?? 0).toFixed(2)}%` : ""}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5"><FiTrendingDown size={12} /> Worst</p>
                  <p className="mt-2 text-lg font-black text-rose-400">{worst?.symbol ?? "—"}</p>
                  <p className="text-xs text-rose-400/70">{worst ? `${(worst.quote?.dp ?? 0).toFixed(2)}%` : ""}</p>
                </div>
              </div>
            );
          })()}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 animate-pulse">
                  <div className="h-5 w-24 bg-white/10 rounded mb-3" />
                  <div className="h-4 w-40 bg-white/5 rounded mb-4" />
                  <div className="h-8 w-28 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <FiSearch className="mx-auto text-4xl text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-gray-400 mb-2">No tickers saved yet</h2>
              <p className="text-sm text-gray-500 mb-6">Search for a stock, crypto, or forex pair and add it to your watchlist.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-bold uppercase tracking-wider text-blue-300 hover:bg-blue-500/20 transition-all"
              >
                <FiSearch /> Search Tickers
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const livePrice = livePrices.get(item.symbol);
                const price = livePrice?.price ?? item.quote?.c ?? 0;
                const change = item.quote?.dp ?? 0;
                const isPositive = change >= 0;

                return (
                  <div
                    key={item.id}
                    className="group rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl transition-all hover:border-blue-500/30 hover:bg-black/70"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <Link href={`/?ticker=${encodeURIComponent(item.symbol)}`} className="min-w-0">
                        <p className="text-lg font-black tracking-tight text-white group-hover:text-blue-300 transition-colors">
                          {item.symbol}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {item.company_name || item.symbol}
                        </p>
                      </Link>
                      <button
                        onClick={() => handleRemove(item.symbol)}
                        className="rounded-full p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Remove from watchlist"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>

                    {price > 0 ? (
                      <div>
                        <p className="text-2xl font-black text-white">
                          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {isPositive ? <FiArrowUp /> : <FiArrowDown />}
                          {isPositive ? "+" : ""}{change.toFixed(2)}%
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Price unavailable</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

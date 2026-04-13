"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { FiStar, FiArrowUp, FiArrowDown, FiTrash2, FiSearch, FiTrendingUp, FiTrendingDown, FiBarChart2, FiMove } from "react-icons/fi";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useLivePrices } from "@/lib/use-live-prices";
import Navbar from "@/components/Navbar";
import Background from "@/components/Background";

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

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    setItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  }, []);

  return (
    <Background>
      <Navbar />

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
                <div key={i} className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-6">
                  <div className="relative overflow-hidden rounded h-5 w-24 bg-white/[0.06] mb-3"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" /></div>
                  <div className="relative overflow-hidden rounded h-3 w-40 bg-white/[0.06] mb-4"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" /></div>
                  <div className="relative overflow-hidden rounded h-8 w-28 bg-white/[0.06]"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" /></div>
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
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="watchlist" direction="horizontal">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {items.map((item, index) => {
                      const livePrice = livePrices.get(item.symbol);
                      const price = livePrice?.price ?? item.quote?.c ?? 0;
                      const change = item.quote?.dp ?? 0;
                      const isPositive = change >= 0;

                      return (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`group rounded-3xl border bg-black/60 backdrop-blur-xl p-6 shadow-2xl transition-all ${
                                snapshot.isDragging
                                  ? "border-blue-500/50 bg-black/80 shadow-blue-500/10 scale-[1.02] rotate-1"
                                  : "border-white/10 hover:border-blue-500/30 hover:bg-black/70"
                              }`}
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
                                <div className="flex items-center gap-1">
                                  <div
                                    {...dragProvided.dragHandleProps}
                                    className="rounded-full p-2 text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all cursor-grab active:cursor-grabbing"
                                    title="Drag to reorder"
                                  >
                                    <FiMove className="text-sm" />
                                  </div>
                                  <button
                                    onClick={() => handleRemove(item.symbol)}
                                    className="rounded-full p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                    title="Remove from watchlist"
                                  >
                                    <FiTrash2 className="text-sm" />
                                  </button>
                                </div>
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
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>
    </Background>
  );
}

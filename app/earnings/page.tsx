"use client";

import { useEffect, useState } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiSun, FiMoon, FiClock } from "react-icons/fi";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Background from "@/components/Background";

type EarningsEntry = {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
};

function getWeekRange(offset: number): { from: string; to: string; label: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const labelFmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    from: fmt(monday),
    to: fmt(friday),
    label: `${labelFmt(monday)} – ${labelFmt(friday)}${offset === 0 ? " (This Week)" : ""}`,
  };
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function getHourIcon(hour: string) {
  if (hour === "bmo") return <FiSun className="text-amber-400" size={12} />;
  if (hour === "amc") return <FiMoon className="text-indigo-400" size={12} />;
  return <FiClock className="text-gray-500" size={12} />;
}

function getHourLabel(hour: string) {
  if (hour === "bmo") return "Before Open";
  if (hour === "amc") return "After Close";
  return "TBD";
}

export default function EarningsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const week = getWeekRange(weekOffset);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/earnings-calendar?from=${week.from}&to=${week.to}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.earningsCalendar ?? []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [week.from, week.to]);

  // Group by date
  const byDate = new Map<string, EarningsEntry[]>();
  for (const e of entries) {
    const existing = byDate.get(e.date) ?? [];
    existing.push(e);
    byDate.set(e.date, existing);
  }

  // Build week days from Monday to Friday
  const weekDays: { date: string; dayName: string; entries: EarningsEntry[] }[] = [];
  const monday = new Date(week.from + "T00:00:00");
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    weekDays.push({
      date: dateStr,
      dayName: WEEKDAYS[i],
      entries: (byDate.get(dateStr) ?? []).sort((a, b) => {
        const order: Record<string, number> = { bmo: 0, dmh: 1, amc: 2 };
        return (order[a.hour] ?? 1) - (order[b.hour] ?? 1);
      }),
    });
  }

  return (
    <Background>
      <Navbar />

      <div className="relative z-10 pt-24 px-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <FiCalendar className="text-violet-400 text-2xl" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Earnings Calendar</h1>
          </div>
          <p className="text-gray-400 text-sm mb-8">Upcoming earnings reports for the week.</p>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <FiChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-lg font-black text-white">{week.label}</p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold mt-1">
                {entries.length} earnings report{entries.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <FiChevronRight size={18} />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 animate-pulse">
                  <div className="h-4 w-20 bg-white/10 rounded mb-4" />
                  <div className="space-y-3">
                    <div className="h-10 bg-white/5 rounded-xl" />
                    <div className="h-10 bg-white/5 rounded-xl" />
                    <div className="h-10 bg-white/5 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {weekDays.map((day) => {
                const isToday = day.date === new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={day.date}
                    className={`rounded-2xl border backdrop-blur-xl p-5 transition-all ${
                      isToday
                        ? "border-blue-500/30 bg-blue-500/5"
                        : "border-white/10 bg-black/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className={`text-xs font-black uppercase tracking-wider ${isToday ? "text-blue-400" : "text-gray-400"}`}>
                          {day.dayName}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      {day.entries.length > 0 && (
                        <span className="text-[10px] font-bold text-gray-500 bg-white/5 rounded-full px-2 py-0.5">
                          {day.entries.length}
                        </span>
                      )}
                    </div>

                    {day.entries.length === 0 ? (
                      <p className="text-xs text-gray-600 text-center py-4">No earnings</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {day.entries.map((e, i) => (
                          <Link
                            key={`${e.symbol}-${i}`}
                            href={`/?ticker=${encodeURIComponent(e.symbol)}`}
                            className="block rounded-xl border border-white/5 bg-white/[0.03] p-3 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                                {e.symbol}
                              </span>
                              <div className="flex items-center gap-1">
                                {getHourIcon(e.hour)}
                                <span className="text-[9px] text-gray-500">{getHourLabel(e.hour)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px]">
                              <div>
                                <span className="text-gray-500">EPS Est: </span>
                                <span className="font-bold text-gray-300">
                                  {e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : "—"}
                                </span>
                              </div>
                              {e.revenueEstimate != null && (
                                <div>
                                  <span className="text-gray-500">Rev: </span>
                                  <span className="font-bold text-gray-300">
                                    {e.revenueEstimate >= 1e9
                                      ? `$${(e.revenueEstimate / 1e9).toFixed(1)}B`
                                      : `$${(e.revenueEstimate / 1e6).toFixed(0)}M`}
                                  </span>
                                </div>
                              )}
                            </div>
                            {e.epsActual != null && (
                              <div className="mt-1.5 text-[10px]">
                                <span className="text-gray-500">Actual: </span>
                                <span className={`font-bold ${
                                  e.epsEstimate != null && e.epsActual > e.epsEstimate
                                    ? "text-emerald-400"
                                    : e.epsEstimate != null && e.epsActual < e.epsEstimate
                                    ? "text-rose-400"
                                    : "text-gray-300"
                                }`}>
                                  ${e.epsActual.toFixed(2)}
                                  {e.epsEstimate != null && (
                                    <span className="ml-1">
                                      ({e.epsActual >= e.epsEstimate ? "+" : ""}
                                      {((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate) * 100).toFixed(1)}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
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

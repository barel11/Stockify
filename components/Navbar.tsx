"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  FiSearch,
  FiBarChart2,
  FiStar,
  FiBriefcase,
  FiFilter,
  FiGrid,
  FiCalendar,
  FiDollarSign,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { CURRENCIES, getSavedCurrency, saveCurrency, type Currency } from "@/lib/currency";
import { useTheme } from "@/lib/use-theme";

const NAV_LINKS = [
  { href: "/", label: "Search", icon: FiSearch },
  { href: "/compare", label: "Compare", icon: FiBarChart2 },
  { href: "/watchlist", label: "Watchlist", icon: FiStar },
  { href: "/portfolio", label: "Portfolio", icon: FiBriefcase },
  { href: "/screener", label: "Screener", icon: FiFilter },
  { href: "/heatmap", label: "Heatmap", icon: FiGrid },
  { href: "/earnings", label: "Earnings", icon: FiCalendar },
];

function LogoSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id="nav-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="#0a0a0a" />
      <rect x="96" y="280" width="56" height="140" rx="8" fill="url(#nav-logo-g)" opacity="0.5" />
      <rect x="192" y="200" width="56" height="220" rx="8" fill="url(#nav-logo-g)" opacity="0.65" />
      <rect x="288" y="140" width="56" height="280" rx="8" fill="url(#nav-logo-g)" opacity="0.8" />
      <rect x="384" y="80" width="56" height="340" rx="8" fill="url(#nav-logo-g)" />
      <line x1="124" y1="270" x2="412" y2="70" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [currency, setCurrency] = useState<Currency>("USD");
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  useEffect(() => {
    setCurrency(getSavedCurrency());
  }, []);

  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    saveCurrency(c);
    setShowCurrencyMenu(false);
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent("currency-change", { detail: c }));
  };

  return (
    <>
      {/* Top bar — desktop & mobile */}
      <div className="fixed top-5 left-4 right-4 sm:left-6 sm:right-6 z-50 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <LogoSVG />
          <span className="text-lg font-bold tracking-tight text-white hidden sm:inline">Stockify</span>
        </Link>

        {/* Desktop nav pill */}
        <nav className={`hidden lg:flex items-center rounded-full border p-1 gap-0.5 shadow-2xl backdrop-blur-2xl ${
          isDark ? "border-white/10 bg-black/50" : "border-gray-200 bg-white/80"
        }`}>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-all ${
                  active
                    ? isDark ? "bg-white/10 text-white" : "bg-blue-500/10 text-blue-600"
                    : isDark ? "text-gray-400 hover:text-white hover:bg-white/[0.06]" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon size={13} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth + Currency */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-full border border-white/10 bg-white/[0.05] dark:bg-white/[0.05] backdrop-blur-xl p-2.5 text-gray-400 hover:text-white hover:border-white/20 transition-all hidden sm:block"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>

          {/* Currency selector */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowCurrencyMenu((v) => !v)}
              className="rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              {CURRENCIES.find((c) => c.code === currency)?.symbol} {currency}
            </button>
            {showCurrencyMenu && (
              <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[140px]">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleCurrencyChange(c.code)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors border-b border-white/5 last:border-0 ${
                      currency === c.code
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{c.symbol}</span>
                    <span>{c.code}</span>
                    <span className="text-gray-600 ml-auto text-[10px]">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-xl px-4 py-2 text-xs font-bold tracking-wider uppercase text-blue-300 hover:bg-blue-500/20 transition-all">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t backdrop-blur-2xl safe-area-bottom ${
        isDark ? "border-white/10 bg-black/80" : "border-gray-200 bg-white/90"
      }`}>
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  active
                    ? "text-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={18} />
                <span className="text-[9px] font-bold tracking-wide">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

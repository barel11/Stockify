"use client";

import { useState } from "react";
import { FiSearch, FiTrendingUp } from "react-icons/fi";

export default function Home() {
  const [ticker, setTicker] = useState("");

  const handleSearch = () => {
    if (!ticker) return;
    alert(`Searching for ${ticker} in the global markets...`);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* --- BACKGROUND ANIMATIONS --- */}
      {/* העיגולים המקוריים שקוראים עכשיו למחלקות מקובץ ה-CSS הגלובלי */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none animate-blob animation-delay-2000"></div>

      <div className="max-w-2xl w-full z-10">
        <div className="text-center space-y-4 mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase">
            <FiTrendingUp /> Real-time Market Data
          </div>
          
          <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            STOCKIFY
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Track your favorite stocks with minimalist, precision-driven data.
          </p>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          
          <div className="relative flex items-center bg-[#111] border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl">
            <div className="pl-4 text-gray-500">
              <FiSearch size={24} />
            </div>
            
            <input
              type="text"
              placeholder="Search Ticker (e.g. AAPL, TSLA)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-full bg-transparent px-4 py-4 text-xl outline-none placeholder:text-gray-600 font-medium"
            />
            
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              Analyze
            </button>
          </div>
        </div>

        {/* --- QUICK LINKS --- */}
        <div className="mt-8 flex justify-center gap-6 text-xs font-medium text-gray-500 uppercase tracking-widest">
          <span className="hover:text-white cursor-pointer transition-colors">Nasdaq</span>
          <span className="hover:text-white cursor-pointer transition-colors">S&P 500</span>
          <span className="hover:text-white cursor-pointer transition-colors">Crypto</span>
        </div>
      </div>
    </main>
  );
}
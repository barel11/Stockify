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
    <>
      {/* הזרקת CSS ישירה שעוקפת את כל ההגדרות של Tailwind 
        בכוונה הגדלתי את התנועה וקיצרתי את הזמן כדי שזה יבלוט!
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes superFloat {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(100px, -100px) scale(1.3); }
          66% { transform: translate(-100px, 100px) scale(0.7); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .force-animate-blob {
          animation: superFloat 4s infinite alternate ease-in-out;
        }
        .force-delay {
          animation-delay: 2s;
        }
      `}} />

      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
        
        {/* --- BACKGROUND ANIMATIONS --- */}
        {/* חיזקתי את הצבע (40%) והקטנתי טשטוש שיהיה ברור */}
        <div className="absolute top-[5%] left-[10%] w-[300px] h-[300px] bg-blue-600/40 rounded-full blur-[80px] pointer-events-none force-animate-blob"></div>
        <div className="absolute bottom-[5%] right-[10%] w-[300px] h-[300px] bg-indigo-600/40 rounded-full blur-[80px] pointer-events-none force-animate-blob force-delay"></div>

        <div className="max-w-2xl w-full z-10">
          <div className="text-center space-y-4 mb-12">
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

          <div className="mt-8 flex justify-center gap-6 text-xs font-medium text-gray-500 uppercase tracking-widest">
            <span className="hover:text-white cursor-pointer transition-colors">Nasdaq</span>
            <span className="hover:text-white cursor-pointer transition-colors">S&P 500</span>
            <span className="hover:text-white cursor-pointer transition-colors">Crypto</span>
          </div>
        </div>
      </main>
    </>
  );
}
"use client";

import { useState, useRef } from "react";
import { FiSearch, FiTrendingUp } from "react-icons/fi";

export default function Home() {
  const [ticker, setTicker] = useState("");
  
  // הרפרנס לעיגול שעוקב
  const glowRef = useRef<HTMLDivElement>(null);

  // הפונקציה שנקראת בכל פעם שהעכבר זז על המסך
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (glowRef.current) {
      // מזיז את העיגול בצורה הכי חלקה שיש בלי לרענן את האתר
      glowRef.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
    }
  };

  const handleSearch = () => {
    if (!ticker) return;
    alert(`Searching for ${ticker} in the global markets...`);
  };

  return (
    <>
      {/* אנימציות הרקע עוקפות הכל */}
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

      {/* הוספנו פה onMouseMove שמקשיב לעכבר */}
      <main 
        onMouseMove={handleMouseMove}
        className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans"
      >
        
        {/* --- CURSOR FOLLOW EFFECT --- */}
        {/* העיגול שזז עם העכבר. הוא מתחיל מחוץ למסך (-300px) כדי שלא יקפוץ פתאום */}
        <div
          ref={glowRef}
          className="pointer-events-none fixed top-0 left-0 z-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-blue-600/30 to-indigo-600/30 blur-[80px] transition-transform duration-75 ease-out"
          style={{ transform: 'translate(-300px, -300px)' }}
        ></div>

        {/* --- BACKGROUND ANIMATIONS --- */}
        <div className="absolute top-[5%] left-[10%] z-0 w-[300px] h-[300px] bg-blue-600/40 rounded-full blur-[80px] pointer-events-none force-animate-blob"></div>
        <div className="absolute bottom-[5%] right-[10%] z-0 w-[300px] h-[300px] bg-indigo-600/40 rounded-full blur-[80px] pointer-events-none force-animate-blob force-delay"></div>

        {/* --- MAIN CONTENT --- */}
        {/* z-10 מבטיח שכל התוכן יהיה תמיד מעל האפקטים ולא ייחסם */}
        <div className="max-w-2xl w-full z-10 relative">
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
            
            <div className="relative flex items-center bg-[#111] border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl hover:border-white/20">
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
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20 z-20 relative cursor-pointer"
              >
                Analyze
              </button>
            </div>
          </div>

          {/* --- FOOTER STATS WITH ANIMATED DOTS --- */}
          <div className="mt-12 flex justify-center items-center gap-8 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
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
          </div>
        </div>
      </main>
    </>
  );
}
"use client";

import { useState, useRef } from "react";
import { FiSearch, FiTrendingUp, FiArrowUp, FiArrowDown, FiActivity, FiGlobe } from "react-icons/fi";

const API_KEY = "d6t63tpr01qoqoisd0p0d6t63tpr01qoqoisd0pg";

export default function Home() {
  const [ticker, setTicker] = useState("");
  
  // States חדשים עבור ההשלמה האוטומטית והניתוח
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [stockData, setStockData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Refs לאנימציות ולגלילה האוטומטית
  const glowRef = useRef<HTMLDivElement>(null);
  const trail1Ref = useRef<HTMLDivElement>(null);
  const trail2Ref = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const x = e.clientX;
    const y = e.clientY;
    if (glowRef.current) glowRef.current.style.transform = `translate(${x - 150}px, ${y - 150}px)`;
    if (trail1Ref.current) trail1Ref.current.style.transform = `translate(${x - 60}px, ${y - 60}px)`;
    if (trail2Ref.current) trail2Ref.current.style.transform = `translate(${x - 30}px, ${y - 30}px)`;
  };

  // פונקציה שמופעלת בכל הקלדה ומביאה רשימת הצעות
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setTicker(val);
    
    if (val.length >= 2) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/search?q=${val}&token=${API_KEY}`);
        const data = await res.json();
        if (data.result) {
          // לוקחים רק את 5 התוצאות הראשונות כדי לא להציף
          setSuggestions(data.result.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // פונקציה שמופעלת כשלוחצים על הצעה מהרשימה
  const handleSelectSuggestion = (selectedSymbol: string) => {
    setTicker(selectedSymbol);
    setShowSuggestions(false);
    handleSearch(selectedSymbol);
  };

  const handleSearch = async (searchSymbol = ticker) => {
    if (!searchSymbol) return;
    
    setLoading(true);
    setError("");
    setShowSuggestions(false);

    try {
      // 1. מביאים את המחיר הנוכחי
      const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${searchSymbol}&token=${API_KEY}`);
      const quoteData = await quoteRes.json();

      // 2. מביאים את פרופיל החברה (שם, תעשייה, לוגו)
      const profileRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${searchSymbol}&token=${API_KEY}`);
      const profileData = await profileRes.json();

      if (quoteData.c === 0) {
        setError(`No data found for ${searchSymbol}. Try selecting from the dropdown.`);
      } else {
        setStockData(quoteData);
        setCompanyData(profileData);
        
        // קסם הגלילה! מחכים רגע שהנתונים ייטענו ואז מחליקים למטה
        setTimeout(() => {
          analysisRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
        /* מסתיר את פס הגלילה המכוער אבל משאיר את היכולת לגלול */
        ::-webkit-scrollbar { display: none; }
      `}} />

      <div onMouseMove={handleMouseMove} className="bg-[#050505] text-white font-sans">
        
        {/* --- CURSOR TRAIL EFFECT --- */}
        <div ref={glowRef} className="pointer-events-none fixed top-0 left-0 z-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-[80px] transition-transform duration-75 ease-out" style={{ transform: 'translate(-500px, -500px)' }}></div>
        <div ref={trail1Ref} className="pointer-events-none fixed top-0 left-0 z-0 h-[120px] w-[120px] rounded-full bg-blue-500/30 blur-[50px] transition-transform duration-300 ease-out" style={{ transform: 'translate(-500px, -500px)' }}></div>
        <div ref={trail2Ref} className="pointer-events-none fixed top-0 left-0 z-0 h-[60px] w-[60px] rounded-full bg-indigo-500/40 blur-[30px] transition-transform duration-500 ease-out" style={{ transform: 'translate(-500px, -500px)' }}></div>

        {/* =========================================
            SECTION 1: HERO & SEARCH (מסך מלא ראשון)
            ========================================= */}
        <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
          
          <div className="absolute top-[5%] left-[10%] z-0 w-[300px] h-[300px] bg-blue-600/40 rounded-full blur-[80px] pointer-events-none force-animate-blob"></div>
          <div className="absolute bottom-[5%] right-[10%] z-0 w-[300px] h-[300px] bg-indigo-600/40 rounded-full blur-[80px] pointer-events-none force-animate-blob force-delay"></div>

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

            {/* תיבת החיפוש עם ההשלמה האוטומטית */}
            <div className="relative group z-50">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              
              <div className="relative flex items-center bg-[#111] border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl">
                <div className="pl-4 text-gray-500">
                  <FiSearch size={24} />
                </div>
                
                <input
                  type="text"
                  placeholder="Search Ticker or Company (e.g. AAPL, Tesla)"
                  value={ticker}
                  onChange={handleInputChange}
                  onFocus={() => ticker.length >= 2 && setShowSuggestions(true)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-transparent px-4 py-4 text-xl outline-none placeholder:text-gray-600 font-medium"
                />
                
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-wait text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  {loading ? "Analyzing..." : "Analyze"}
                </button>
              </div>

              {/* תפריט ההשלמה האוטומטית שיורד למטה */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                  {suggestions.map((item, index) => (
                    <div 
                      key={index}
                      onClick={() => handleSelectSuggestion(item.symbol)}
                      className="flex items-center justify-between px-6 py-4 hover:bg-blue-600/20 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                    >
                      <span className="font-bold text-blue-400">{item.symbol}</span>
                      <span className="text-gray-400 text-sm truncate max-w-[200px]">{item.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center font-medium relative z-10">
                {error}
              </div>
            )}
          </div>
        </main>

        {/* =========================================
            SECTION 2: ANALYSIS DASHBOARD (מוסתר למטה)
            ========================================= */}
        {stockData && (
          <div ref={analysisRef} className="min-h-screen flex flex-col items-center justify-center p-6 relative border-t border-white/5 bg-gradient-to-b from-transparent to-blue-900/10">
            
            <div className="max-w-4xl w-full">
              {/* כותרת החברה */}
              <div className="flex items-center gap-6 mb-12">
                {companyData?.logo ? (
                  <img src={companyData.logo} alt="logo" className="w-20 h-20 rounded-2xl shadow-xl bg-white p-1" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-bold shadow-xl">
                    {ticker.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-5xl font-black tracking-tight">{companyData?.name || ticker}</h2>
                  <div className="flex gap-4 mt-2 text-gray-400 font-medium text-sm">
                    <span className="uppercase tracking-widest text-blue-400">{ticker}</span>
                    {companyData?.finnhubIndustry && (
                      <span className="flex items-center gap-1"><FiActivity /> {companyData.finnhubIndustry}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* כרטיסיות נתונים */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* כרטיסיית מחיר ראשית */}
                <div className="md:col-span-2 bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none"></div>
                  <p className="text-gray-500 font-bold tracking-widest text-xs uppercase mb-4">Current Price</p>
                  <div className="flex items-end gap-4">
                    <span className="text-7xl font-black">${stockData.c.toFixed(2)}</span>
                    <div className={`flex items-center text-2xl font-bold mb-2 ${stockData.d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stockData.d >= 0 ? <FiArrowUp /> : <FiArrowDown />}
                      <span className="ml-1">${Math.abs(stockData.d).toFixed(2)}</span>
                      <span className="ml-2 opacity-80">({Math.abs(stockData.dp).toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>

                {/* כרטיסיית נתונים ירומיים */}
                <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col justify-center gap-6">
                  <div>
                    <p className="text-gray-500 font-bold tracking-widest text-xs uppercase mb-1">Day High</p>
                    <p className="text-2xl font-bold text-gray-200">${stockData.h.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-bold tracking-widest text-xs uppercase mb-1">Day Low</p>
                    <p className="text-2xl font-bold text-gray-200">${stockData.l.toFixed(2)}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
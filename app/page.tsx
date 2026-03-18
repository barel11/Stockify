"use client";

import { useState, useRef } from "react";
import { FiSearch, FiTrendingUp, FiArrowUp, FiArrowDown, FiActivity, FiBarChart2, FiCpu, FiTarget, FiGlobe } from "react-icons/fi";

const API_KEY = "d6t63tpr01qoqoisd0p0d6t63tpr01qoqoisd0pg";

// המאגר החכם שלנו - עכשיו כולל גם מט"ח (Forex)
const MARKET_DB = [
  { symbol: "BINANCE:BTCUSDT", description: "Bitcoin (BTC / USD)" },
  { symbol: "BINANCE:ETHUSDT", description: "Ethereum (ETH / USD)" },
  { symbol: "BINANCE:SOLUSDT", description: "Solana (SOL / USD)" },
  { symbol: "OANDA:EUR_USD", description: "Euro / US Dollar (Forex)" },
  { symbol: "OANDA:GBP_USD", description: "British Pound / US Dollar" },
];

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [stockData, setStockData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const glowRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (glowRef.current) glowRef.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setTicker(val);
    
    if (val.length >= 1) {
      try {
        const localMatches = MARKET_DB.filter(c => 
          c.symbol.includes(val) || c.description.toUpperCase().includes(val)
        );

        const res = await fetch(`https://finnhub.io/api/v1/search?q=${val}&token=${API_KEY}`);
        const data = await res.json();
        const apiResults = data.result ? data.result.slice(0, 5) : [];

        setSuggestions([...localMatches, ...apiResults].slice(0, 6));
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

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
      const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${searchSymbol}&token=${API_KEY}`);
      const quoteData = await quoteRes.json();

      const profileRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${searchSymbol}&token=${API_KEY}`);
      const profileData = await profileRes.json();

      if (quoteData.c === 0) {
        setError(`No data found for ${searchSymbol}. Please select a valid ticker from the dropdown.`);
      } else {
        setStockData(quoteData);
        setCompanyData(profileData);
        
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

  // --- פונקציות לניתוח חכם (Smart Analysis) ---
  
  // חישוב המלצת קנייה/מכירה טכנית (Mock Logic for UI)
  const getTechnicalAction = (percentChange: number) => {
    if (percentChange > 2) return { text: "STRONG BUY", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" };
    if (percentChange > 0.5) return { text: "BUY", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (percentChange < -2) return { text: "STRONG SELL", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
    if (percentChange < -0.5) return { text: "SELL", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
    return { text: "NEUTRAL / HOLD", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20" };
  };

  // חישוב מיקום המחיר בתוך הטווח היומי (באחוזים 0-100) בשביל ה-Progress Bar
  const getDayRangePercent = (current: number, low: number, high: number) => {
    if (high === low) return 50; // מניעת חלוקה באפס
    return Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  };

  // יצירת טקסט סיכום אוטומטי
  const generateSummary = (symbol: string, change: number, percent: number) => {
    const cleanSymbol = symbol.replace("BINANCE:", "").replace("OANDA:", "");
    if (percent > 2) return `${cleanSymbol} is showing strong bullish momentum today, significantly outperforming average daily moves. Breakout potential is high.`;
    if (percent > 0) return `${cleanSymbol} is experiencing mild positive action. Buyers are maintaining control, establishing higher support levels.`;
    if (percent < -2) return `Heavy selling pressure on ${cleanSymbol}. The asset has broken key intraday supports, showing strong bearish sentiment.`;
    return `${cleanSymbol} is facing minor headwinds today. Price action is consolidating as the market seeks clear direction.`;
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
        ::-webkit-scrollbar { display: none; }
      `}} />

      <div onMouseMove={handleMouseMove} className="bg-[#050505] text-white font-sans relative">
        
        {/* --- FIXED BACKGROUND & CURSOR --- */}
        {/* הכל פה הוגדר כ-fixed כדי שיישאר גם כשגוללים למטה! */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div ref={glowRef} className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-[80px] transition-transform duration-75 ease-out" style={{ transform: 'translate(-500px, -500px)' }}></div>
          <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px] force-animate-blob"></div>
          <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-indigo-600/30 rounded-full blur-[100px] force-animate-blob force-delay"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>

        {/* =========================================
            SECTION 1: HERO & SEARCH 
            ========================================= */}
        <main className="min-h-screen flex items-center justify-center p-6 relative z-10">
          <div className="max-w-2xl w-full">
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
                <FiTrendingUp /> Institutional Grade Terminal
              </div>
              <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent drop-shadow-2xl">
                STOCKIFY
              </h1>
              <p className="text-gray-400 text-lg max-w-md mx-auto">
                Advanced market dynamics and real-time algorithmic analysis.
              </p>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              
              <div className="relative flex items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl">
                <div className="pl-4 text-gray-500">
                  <FiSearch size={24} />
                </div>
                
                <input
                  type="text"
                  placeholder="Search Ticker (e.g. AAPL, BTC, EUR_USD)"
                  value={ticker}
                  onChange={handleInputChange}
                  onFocus={() => ticker.length >= 1 && setShowSuggestions(true)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-transparent px-4 py-4 text-xl outline-none placeholder:text-gray-600 font-medium tracking-wide"
                />
                
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-wait text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20 uppercase tracking-widest text-sm"
                >
                  {loading ? "Scanning..." : "Analyze"}
                </button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                  {suggestions.map((item, index) => (
                    <div 
                      key={index}
                      onClick={() => handleSelectSuggestion(item.symbol)}
                      className="flex items-center justify-between px-6 py-4 hover:bg-blue-900/40 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                    >
                      <span className="font-bold text-blue-400 tracking-wider">{item.symbol}</span>
                      <span className="text-gray-400 text-sm truncate max-w-[200px]">{item.description}</span>
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
          </div>
        </main>

        {/* =========================================
            SECTION 2: PRO ANALYSIS DASHBOARD
            ========================================= */}
        {stockData && (
          <div ref={analysisRef} className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10 pt-20 pb-32">
            
            {/* קו מפריד יוקרתי */}
            <div className="absolute top-0 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="max-w-5xl w-full space-y-8">
              
              {/* כותרת החברה ותגית המלצה */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-black/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                  {companyData?.logo ? (
                    <img src={companyData.logo} alt="logo" className="w-20 h-20 rounded-2xl shadow-xl bg-white p-1" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-3xl font-bold shadow-xl">
                      {ticker.replace("BINANCE:", "").replace("OANDA:", "").charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                      {companyData?.name || ticker.replace("BINANCE:", "").replace("OANDA:", "")}
                    </h2>
                    <div className="flex gap-4 mt-2 text-gray-400 font-medium text-sm">
                      <span className="uppercase tracking-widest text-blue-400 font-bold">{ticker}</span>
                      {companyData?.finnhubIndustry && (
                        <span className="flex items-center gap-1"><FiGlobe /> {companyData.finnhubIndustry}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* תגית המלצה טכנית דינמית */}
                <div className={`px-6 py-3 rounded-2xl border backdrop-blur-md flex flex-col items-center justify-center ${getTechnicalAction(stockData.dp).bg} ${getTechnicalAction(stockData.dp).border}`}>
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">AI Action Signal</span>
                  <span className={`text-xl font-black tracking-wider ${getTechnicalAction(stockData.dp).color}`}>
                    {getTechnicalAction(stockData.dp).text}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* כרטיסיית מחיר ראשית */}
                <div className="lg:col-span-2 bg-gradient-to-br from-black/80 to-[#0a0a0a] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start mb-8">
                    <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase">
                      <FiActivity className="text-blue-500" /> Spot Price
                    </p>
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end gap-6 mb-10">
                    <span className="text-7xl md:text-8xl font-black tracking-tighter">${stockData.c.toFixed(2)}</span>
                    <div className={`flex items-center text-3xl font-bold mb-3 ${stockData.d >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                      {stockData.d >= 0 ? <FiArrowUp strokeWidth={3} /> : <FiArrowDown strokeWidth={3} />}
                      <span className="ml-1">${Math.abs(stockData.d).toFixed(2)}</span>
                      <span className="ml-3 px-3 py-1 rounded-lg bg-current/10 text-xl backdrop-blur-sm">
                        {Math.abs(stockData.dp).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* מדד טווח יומי (Day Range) מטורף */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <span>Day Low: ${stockData.l.toFixed(2)}</span>
                      <span>Day High: ${stockData.h.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/5 relative">
                      <div 
                        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${getDayRangePercent(stockData.c, stockData.l, stockData.h)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* עמודת סטטיסטיקות שוק */}
                <div className="space-y-6">
                  {/* סיכום שוק חכם */}
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase mb-4">
                      <FiCpu className="text-purple-500" /> Market Summary
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed font-medium">
                      {generateSummary(ticker, stockData.d, stockData.dp)}
                    </p>
                  </div>

                  {/* נתוני מסחר בסיסיים */}
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mb-1">Open</p>
                      <p className="text-xl font-bold text-white">${stockData.o.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mb-1">Prev Close</p>
                      <p className="text-xl font-bold text-white">${stockData.pc.toFixed(2)}</p>
                    </div>
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
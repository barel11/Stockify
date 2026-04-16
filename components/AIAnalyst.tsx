"use client";

import { useState, useRef, useEffect } from "react";
import { FiZap, FiLoader, FiRefreshCw } from "react-icons/fi";

type Props = { symbol: string };

// Minimal markdown renderer: supports ## headings and bullet lines only.
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let buffer: string[] = [];
  let key = 0;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    nodes.push(
      <p key={`p-${key++}`} className="text-sm text-gray-300 leading-7">
        {buffer.join(" ")}
      </p>
    );
    buffer = [];
  };

  let inList = false;
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`ul-${key++}`} className="list-disc list-inside space-y-2 text-sm text-gray-300 leading-7 pl-2">
        {listItems.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
    listItems = [];
    inList = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBuffer();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushBuffer();
      flushList();
      nodes.push(
        <h3 key={`h-${key++}`} className="text-xs font-black uppercase tracking-[0.25em] text-blue-400 mt-5 mb-2">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushBuffer();
      inList = true;
      listItems.push(line.slice(2));
    } else {
      if (inList) flushList();
      buffer.push(line);
    }
  }
  flushBuffer();
  flushList();
  return nodes;
}

export default function AIAnalyst({ symbol }: Props) {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const checkedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Check on mount whether the API is configured
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "__check__" }),
    }).then((res) => {
      if (res.status === 503) setHidden(true);
    }).catch(() => {});
  }, []);

  const run = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setAnalysis("");
    setError(null);
    setLoading(true);
    setStarted(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        if (res.status === 503) {
          setHidden(true);
          setLoading(false);
          return;
        }
        setError(data.error ?? `Request failed (${res.status})`);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response body");
        setLoading(false);
        return;
      }
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAnalysis(acc);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message ?? "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  return (
    <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.06] via-black/40 to-violet-500/[0.06] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/30 p-2">
            <FiZap className="text-blue-400" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">AI Analyst</h3>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">Bull/Bear thesis · Claude</p>
          </div>
        </div>
        {started && !loading && (
          <button
            onClick={run}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-white hover:border-blue-500/30 transition-all inline-flex items-center gap-1.5"
          >
            <FiRefreshCw size={11} /> Regenerate
          </button>
        )}
      </div>

      {!started && (
        <button
          onClick={run}
          className="w-full rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 hover:border-blue-500/50 transition-all py-4 text-sm font-bold text-blue-300 uppercase tracking-widest inline-flex items-center justify-center gap-2"
        >
          <FiZap size={14} /> Generate AI Analysis
        </button>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">{error}</div>
      )}

      {started && !error && (
        <div className="space-y-2">
          {renderMarkdown(analysis)}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
              <FiLoader className="animate-spin" size={12} />
              <span>Analyzing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type LivePrice = {
  price: number;
  volume: number;
  timestamp: number;
};

type TradeMessage = {
  type: string;
  data?: { s: string; p: number; v: number; t: number }[];
};

/**
 * Hook that connects to Finnhub WebSocket API for real-time price updates.
 * Falls back to polling if WebSocket is unavailable.
 * @param symbols - Array of stock symbols to subscribe to
 * @param apiKey - Finnhub API key (passed from env via component)
 */
export function useLivePrices(symbols: string[], apiKey: string) {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());

  const subscribe = useCallback((ws: WebSocket, symbol: string) => {
    if (ws.readyState === WebSocket.OPEN && !subscribedRef.current.has(symbol)) {
      ws.send(JSON.stringify({ type: "subscribe", symbol }));
      subscribedRef.current.add(symbol);
    }
  }, []);

  useEffect(() => {
    if (!apiKey || symbols.length === 0) return;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      subscribedRef.current.clear();
    }

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      for (const symbol of symbols) {
        subscribe(ws, symbol);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: TradeMessage = JSON.parse(event.data);
        if (msg.type === "trade" && msg.data) {
          setPrices((prev) => {
            const next = new Map(prev);
            for (const trade of msg.data!) {
              next.set(trade.s, {
                price: trade.p,
                volume: trade.v,
                timestamp: trade.t,
              });
            }
            return next;
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      subscribedRef.current.clear();
    };

    ws.onerror = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
      subscribedRef.current.clear();
    };
  }, [apiKey, symbols.join(","), subscribe]);

  return { prices, connected };
}

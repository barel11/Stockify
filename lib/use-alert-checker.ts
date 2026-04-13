"use client";

import { useEffect, useRef, useCallback } from "react";

type AlertItem = {
  id: string;
  symbol: string;
  target_price: number;
  direction: "above" | "below";
  triggered: boolean;
};

/**
 * Polls current prices against user's alerts every 60 seconds.
 * Sends a browser notification when an alert triggers.
 */
export function useAlertChecker(alerts: AlertItem[], isSignedIn: boolean) {
  const notifiedRef = useRef<Set<string>>(new Set());

  const requestNotificationPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  useEffect(() => {
    if (!isSignedIn || alerts.length === 0) return;

    const activeAlerts = alerts.filter((a) => !a.triggered && !notifiedRef.current.has(a.id));
    if (activeAlerts.length === 0) return;

    const check = async () => {
      const symbols = Array.from(new Set(activeAlerts.map((a) => a.symbol)));

      for (const symbol of symbols) {
        try {
          const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
          if (!res.ok) continue;
          const quote = (await res.json()) as { c: number };
          if (!quote || !quote.c) continue;

          const symbolAlerts = activeAlerts.filter((a) => a.symbol === symbol);
          for (const alert of symbolAlerts) {
            const triggered =
              (alert.direction === "above" && quote.c >= alert.target_price) ||
              (alert.direction === "below" && quote.c <= alert.target_price);

            if (triggered && !notifiedRef.current.has(alert.id)) {
              notifiedRef.current.add(alert.id);

              // Send browser notification
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`Stockify Alert: ${alert.symbol}`, {
                  body: `${alert.symbol} is now $${quote.c.toFixed(2)} — ${alert.direction === "above" ? "above" : "below"} your target of $${alert.target_price.toFixed(2)}`,
                  icon: "/icons/icon-192.png",
                  tag: `alert-${alert.id}`,
                  requireInteraction: true,
                });
              }

              // Play alert sound
              try {
                const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIS5wr+DRozgiHTyS1+a1ZTocHlyq8NqPPRAYS5DR6qljJBYtervk0n9GFiZQlOXTdj4TL3m24s1/Pw0oWqft0GkuCRw+lOTYdzUJG0Cb7Nt/MwMPJ1uo7NFgIwAXQJ");
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch {}

              // Mark as triggered in API
              fetch("/api/alerts", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: alert.id }),
              }).catch(() => {});
            }
          }
        } catch {
          // ignore fetch errors for individual symbols
        }
      }
    };

    // Check immediately
    check();

    // Poll every 60 seconds
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [isSignedIn, alerts]);
}

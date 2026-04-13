import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "styles/globals.css";
import { ServiceWorkerRegistrar } from "./sw-registrar";

export const metadata: Metadata = {
  title: "Stockify",
  description: "Premium stock, crypto, and forex analysis with technicals, fundamentals, and news.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stockify",
  },
  openGraph: {
    title: "Stockify — Real-time Market Intelligence",
    description: "Search any stock, crypto, or forex pair. Get instant technical analysis, analyst ratings, earnings data, and interactive charts.",
    type: "website",
    siteName: "Stockify",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stockify — Real-time Market Intelligence",
    description: "Search any stock, crypto, or forex pair. Get instant technical analysis, analyst ratings, earnings data, and interactive charts.",
  },
  keywords: ["stock analysis", "crypto", "forex", "technical analysis", "market intelligence", "TradingView", "RSI", "MACD"],
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en">
        <head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="bg-black min-h-screen">
            {children}
            <ServiceWorkerRegistrar />
        </body>
      </html>
    </ClerkProvider>
  );
}

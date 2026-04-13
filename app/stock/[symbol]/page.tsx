import { redirect } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ symbol: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  return {
    title: `${sym} Stock Analysis | Stockify`,
    description: `Real-time analysis, technicals, fundamentals, and news for ${sym} on Stockify.`,
    openGraph: {
      title: `${sym} on Stockify`,
      description: `Live market data and analysis for ${sym}`,
    },
  };
}

export default async function StockDetailPage({ params }: Props) {
  const { symbol } = await params;
  redirect(`/?ticker=${encodeURIComponent(symbol.toUpperCase())}`);
}

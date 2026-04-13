import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ExportData = {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  marketCap?: string;
  exchange?: string;
  industry?: string;
  pe?: string;
  eps?: string;
  week52High?: string;
  week52Low?: string;
  recommendations?: { buy: number; hold: number; sell: number };
  priceTarget?: { low?: string; mean?: string; high?: string };
};

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(59, 130, 246);
  doc.text("Stockify", 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated ${now}`, 14, 27);

  // Company title
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(`${data.symbol} — ${data.companyName}`, 14, 40);

  // Price section
  const sign = data.change >= 0 ? "+" : "";
  doc.setFontSize(24);
  doc.setTextColor(30, 30, 30);
  doc.text(`$${data.price.toFixed(2)}`, 14, 55);
  doc.setFontSize(12);
  doc.setTextColor(data.change >= 0 ? 16 : 220, data.change >= 0 ? 185 : 38, data.change >= 0 ? 129 : 38);
  doc.text(`${sign}$${data.change.toFixed(2)} (${sign}${data.changePercent.toFixed(2)}%)`, 75, 55);

  // Price data table
  autoTable(doc, {
    startY: 65,
    head: [["Metric", "Value"]],
    body: [
      ["Open", `$${data.open.toFixed(2)}`],
      ["Day High", `$${data.high.toFixed(2)}`],
      ["Day Low", `$${data.low.toFixed(2)}`],
      ["Previous Close", `$${data.prevClose.toFixed(2)}`],
      ...(data.marketCap ? [["Market Cap", data.marketCap]] : []),
      ...(data.exchange ? [["Exchange", data.exchange]] : []),
      ...(data.industry ? [["Industry", data.industry]] : []),
      ...(data.pe ? [["P/E Ratio", data.pe]] : []),
      ...(data.eps ? [["EPS (TTM)", data.eps]] : []),
      ...(data.week52High ? [["52-Week High", data.week52High]] : []),
      ...(data.week52Low ? [["52-Week Low", data.week52Low]] : []),
    ],
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 },
  });

  // Recommendations
  if (data.recommendations) {
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Analyst Recommendations", 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Rating", "Count"]],
      body: [
        ["Buy", String(data.recommendations.buy)],
        ["Hold", String(data.recommendations.hold)],
        ["Sell", String(data.recommendations.sell)],
      ],
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
    });
  }

  // Price targets
  if (data.priceTarget) {
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Price Targets", 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Target", "Price"]],
      body: [
        ...(data.priceTarget.low ? [["Low", data.priceTarget.low]] : []),
        ...(data.priceTarget.mean ? [["Mean", data.priceTarget.mean]] : []),
        ...(data.priceTarget.high ? [["High", data.priceTarget.high]] : []),
      ],
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Powered by Stockify — stockify.app", 14, pageHeight - 10);

  doc.save(`${data.symbol}-analysis.pdf`);
}

export function exportToCSV(data: ExportData) {
  const sign = data.change >= 0 ? "+" : "";
  const rows = [
    ["Symbol", data.symbol],
    ["Company", data.companyName],
    ["Price", `$${data.price.toFixed(2)}`],
    ["Change", `${sign}$${data.change.toFixed(2)}`],
    ["Change %", `${sign}${data.changePercent.toFixed(2)}%`],
    ["Open", `$${data.open.toFixed(2)}`],
    ["High", `$${data.high.toFixed(2)}`],
    ["Low", `$${data.low.toFixed(2)}`],
    ["Prev Close", `$${data.prevClose.toFixed(2)}`],
    ...(data.marketCap ? [["Market Cap", data.marketCap]] : []),
    ...(data.exchange ? [["Exchange", data.exchange]] : []),
    ...(data.industry ? [["Industry", data.industry]] : []),
    ...(data.pe ? [["P/E Ratio", data.pe]] : []),
    ...(data.eps ? [["EPS (TTM)", data.eps]] : []),
    ...(data.week52High ? [["52-Week High", data.week52High]] : []),
    ...(data.week52Low ? [["52-Week Low", data.week52Low]] : []),
  ];

  if (data.recommendations) {
    rows.push(
      ["", ""],
      ["Analyst Buy", String(data.recommendations.buy)],
      ["Analyst Hold", String(data.recommendations.hold)],
      ["Analyst Sell", String(data.recommendations.sell)]
    );
  }

  if (data.priceTarget) {
    rows.push(["", ""]);
    if (data.priceTarget.low) rows.push(["Target Low", data.priceTarget.low]);
    if (data.priceTarget.mean) rows.push(["Target Mean", data.priceTarget.mean]);
    if (data.priceTarget.high) rows.push(["Target High", data.priceTarget.high]);
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.symbol}-analysis.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

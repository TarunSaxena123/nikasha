// Trades CSV (feature 02 design §1.6; REQ-RPT-20, 21): RFC 4180, UTF-8 with BOM, built in the browser.
import type { MetaResponse, Report } from "@/api/types";
import { csvLegalPreamble } from "@/legal/downloads";
import { slug, yyyymmdd } from "@/lib/format";

export const CSV_COLUMNS = [
  "Trade #", "Side", "Legs", "Strike(s)", "Expiry", "Signal time", "Entry time", "Exit time", "Spot at entry",
  "Entry premium(s)", "Exit premium(s)", "Quantity", "Gross P&L (₹)", "Costs (₹)", "Net P&L (₹)", "Exit reason",
  "India VIX at entry", "VIX band", "Market trend", "Expiry day",
];

const SIDE = { CE: "Call", PE: "Put", MULTI: "Multi-leg" } as const;
const TREND = { TRENDING: "Trending", MIXED: "Mixed", SIDEWAYS: "Sideways", UNKNOWN: "Not enough history" } as const;

export function cell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) || s.startsWith("#") || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

const ts = (t: string | undefined) => (t ? t.replace("T", " ") : "");

export function tradesCsv(report: Report, meta: MetaResponse | null): string {
  const su = report.settings_used;
  const preamble = csvLegalPreamble(meta, report.period, [
    `Strategy settings: ${su.quantity_text}; ${su.holding_text}; ${su.timeframe_text}; ${su.expiry_text}`,
    `Engine version ${report.engine_version}, generated ${report.generated_at.replace("T", " ")}`,
  ]);
  const rows = report.trades.map((t) => [
    t.n, SIDE[t.side], t.legs.map((l) => `${l.action === "BUY" ? "Buy" : "Sell"} ${l.option_type}`).join(" / "),
    t.legs.map((l) => l.strike).join(" / "), t.legs[0]?.expiry ?? "", ts(t.signal_time), ts(t.entry_time), ts(t.exit_time),
    t.spot_at_entry ?? "", t.legs.map((l) => l.entry_premium.toFixed(2)).join(" / "), t.legs.map((l) => l.exit_premium.toFixed(2)).join(" / "),
    t.quantity, t.gross_pnl.toFixed(2), t.costs.toFixed(2), t.net_pnl.toFixed(2), t.exit_reason_text, t.vol_at_entry.toFixed(2),
    t.vol_band, TREND[t.regime], t.expiry_day ? "Yes" : "No",
  ]);
  const lines = [...preamble, CSV_COLUMNS.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function csvFileName(name: string, now = new Date()): string {
  return `nikasha-trades-${slug(name)}-${yyyymmdd(now)}.csv`;
}

export function pdfFileName(name: string, now = new Date()): string {
  return `nikasha-report-${slug(name)}-${yyyymmdd(now)}.pdf`;
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

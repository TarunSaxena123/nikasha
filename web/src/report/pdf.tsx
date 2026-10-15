"use client";
// PDF report built in the browser (feature 02 design §1.6; REQ-RPT-19; feature 07 legal blocks).
// Nothing is uploaded. jsPDF's built-in fonts can't draw "₹" or "−", so PDF text uses "Rs" and "-".
import type { MetaResponse, Report } from "@/api/types";
import { pdfLegalBlocks } from "@/legal/downloads";
import { count, day, pct, period, rupees } from "@/lib/format";
import type { LeftOutRule } from "@/strategy/draft";
import { treeLines, type RuleLine } from "@/strategy/describe";

export function pdfText(s: string): string {
  return s
    .replace(/−₹/g, "-Rs ")
    .replace(/₹/g, "Rs ")
    .replace(/[−–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/×/g, "x")
    .replace(/→/g, "->")
    .replace(/[✓▲▼⚠•]/g, "")
    .replace(/[^\x20-\x7E\n -ÿ]/g, "");
}

const money = (v: number | null | undefined) => (v === null || v === undefined ? "-" : rupees(v, 0, "always"));

export async function buildPdf(args: {
  report: Report;
  meta: MetaResponse | null;
  strategyName: string;
  rules: RuleLine[];
  leftOut: LeftOutRule[];
  renderCharts?: () => Promise<SVGSVGElement[]>;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  await import("svg2pdf.js");
  const { report, meta, strategyName, rules, leftOut } = args;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  const legal = pdfLegalBlocks(meta, report.period);
  let y = 0;
  const T = (s: string) => pdfText(s);

  const ensure = (h: number) => {
    if (y + h > 270) {
      doc.addPage();
      y = 18;
    }
  };
  const heading = (s: string) => {
    ensure(14);
    doc.setFont("helvetica", "bold").setFontSize(13).text(T(s), M, y);
    y += 7;
  };
  const para = (s: string, size = 10) => {
    doc.setFont("helvetica", "normal").setFontSize(size);
    const lines = doc.splitTextToSize(T(s), W - 2 * M) as string[];
    for (const line of lines) {
      ensure(5);
      doc.text(line, M, y);
      y += size * 0.45;
    }
    y += 2;
  };
  const table = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y,
      head: [head.map(T)],
      body: body.map((r) => r.map((c) => T(String(c)))),
      margin: { left: M, right: M, bottom: 28 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [43, 47, 54] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  };

  // 1. Title, period, badge, disclaimer, summary, risk and result tiles
  y = 18;
  doc.setFont("helvetica", "bold").setFontSize(18).text("Nikasha report", M, y);
  y += 8;
  doc.setFontSize(13).text(T(strategyName), M, y);
  y += 7;
  para(`${legal.period} (${count(report.period.trading_days, "trading day")})`);
  para("Premiums modelled, not actual.", 10);
  para(legal.disclaimer, 8);
  heading("Summary");
  for (const p of report.summary) para(p);
  const m = report.metrics;
  heading("Risk");
  table(["Max drawdown", "Worst losing streak", "Largest loss"], [[rupees(-m.max_drawdown) + (m.max_drawdown_pct != null ? ` (${pct(m.max_drawdown_pct)})` : ""), count(m.worst_losing_streak, "trade"), money(m.largest_loss)]]);
  heading("Result");
  table(["Net P&L", "Win rate", "Average win / loss", "Expectancy", "Trades"].concat(m.return_pct != null ? ["Return"] : []),
    [[money(m.net_pnl), m.win_rate_pct === null ? "-" : pct(m.win_rate_pct), `${money(m.avg_win)} / ${money(m.avg_loss)}`, money(m.expectancy), m.trades].concat(m.return_pct != null ? [pct(m.return_pct, 2)] : [])]);

  // 2. Strategy rules
  heading("Strategy rules");
  table(["Rule", "Setting", "What it means"], rules.map((r) => [r.rule, [r.setting, ...treeLines(r.tree ?? [])].join("\n"), r.meaning]));
  if (leftOut.length) {
    heading("Left out (can't be tested)");
    table(["From your document", "Why"], leftOut.map((l) => [`"${l.quote}"`, l.reason]));
  }

  // 3. Charts
  if (report.trades.length && args.renderCharts) {
    const svgs = await args.renderCharts();
    heading("Equity and drawdown");
    for (const svg of svgs) {
      const w = Number(svg.getAttribute("width")) || 760;
      const h = Number(svg.getAttribute("height")) || 240;
      const pw = W - 2 * M;
      const ph = (pw * h) / w;
      ensure(ph + 4);
      await (doc as unknown as { svg: (el: Element, o: object) => Promise<unknown> }).svg(svg, { x: M, y, width: pw, height: ph });
      y += ph + 4;
    }
  }

  // 4. Breakdowns
  const bd: [keyof Report["breakdowns"], string][] = [["by_year", "By year"], ["by_month", "By month"], ["by_vol_band", "By India VIX"], ["by_regime", "By market trend"], ["by_weekday", "By weekday"], ["by_expiry_day", "Expiry day"], ["by_side", "Call / put"]];
  for (const [k, title] of bd) {
    if (!report.breakdowns[k].length) continue;
    heading(title);
    table(["Group", "Trades", "Win rate", "Net P&L", "Expectancy"], report.breakdowns[k].map((r) => [r.label + (r.trades < 10 ? " (few trades)" : ""), r.trades, r.win_rate_pct === null ? "-" : pct(r.win_rate_pct), money(r.net_pnl), money(r.expectancy)]));
  }

  // 5. Overfitting and sensitivity
  heading("Overfitting check");
  para(report.overfit.status_text);
  const parts = [report.overfit.in_sample && ["Tuning period", report.overfit.in_sample] as const, report.overfit.out_of_sample && ["Unseen period", report.overfit.out_of_sample] as const].filter(Boolean) as (readonly [string, { period: { start: string; end: string }; metrics: Report["metrics"] }])[];
  if (parts.length) table(["Part", "Period", "Trades", "Win rate", "Expectancy", "Max drawdown"], parts.map(([n, p]) => [n, period(p.period.start, p.period.end), p.metrics.trades, p.metrics.win_rate_pct === null ? "-" : pct(p.metrics.win_rate_pct), money(p.metrics.expectancy), rupees(-p.metrics.max_drawdown)]));
  heading("Volatility sensitivity");
  const cols: [string, Report["metrics"]][] = [["VIX -2", report.sensitivity[0]!.metrics], ["As tested", m], ["VIX +2", report.sensitivity[1]!.metrics]];
  table(["", ...cols.map((c) => c[0])], [
    ["Net P&L", ...cols.map((c) => money(c[1].net_pnl))],
    ["Win rate", ...cols.map((c) => (c[1].win_rate_pct === null ? "-" : pct(c[1].win_rate_pct)))],
    ["Expectancy", ...cols.map((c) => money(c[1].expectancy))],
    ["Max drawdown", ...cols.map((c) => rupees(-c[1].max_drawdown))],
  ]);

  // 6. Trade summary
  heading("Trades");
  if (!report.trades.length) {
    para("No trades.");
  } else {
    const reasons = new Map<string, number>();
    report.trades.forEach((t) => reasons.set(t.exit_reason_text, (reasons.get(t.exit_reason_text) ?? 0) + 1));
    para(`${count(report.trades.length, "trade")}, from ${day(report.trades[0]!.entry_time)} to ${day(report.trades[report.trades.length - 1]!.entry_time)}. The full list is in the trades CSV.`);
    table(["Exit reason", "Trades"], [...reasons.entries()]);
    const partials = report.trades.filter((t) => t.partial_exit).length;
    if (partials) para(`${count(partials, "trade")} closed part of the lots early (partial exit); the CSV lists the time, quantity and premium of each.`);
  }

  // 7. Settings, simulation, data
  const su = report.settings_used;
  heading("Settings used");
  table(["Setting", "Value"], [["Size", su.quantity_text], ["Holding", su.holding_text], ["Chart", su.timeframe_text], ["Expiry", su.expiry_text], ["Period", su.period_text], ["Risk-free rate", `${su.risk_free_rate_pct}%`], ["Capital", su.capital_text]]);
  table(["Cost", "Value", "Source"], su.costs.map((c) => [c.label, c.value_text, c.source]));
  table(["Advanced option", "Setting"], su.advanced.map((a) => [a.label, a.value_text]));
  if (su.no_effect_rules.length) table(["Rule with no effect", "Trades affected"], su.no_effect_rules.map((r) => [r.text, r.trades_affected]));
  heading("Signals that didn't become trades");
  if (report.skipped.signals.length) table(["Reason", "Signals"], report.skipped.signals.map((s) => [s.reason_text, s.count]));
  else para("None.");
  heading("How this was simulated");
  for (const n of report.simulation_notes) para(`- ${n}`, 9);
  para(report.disclosures.modelled_premiums_text, 9);
  para(report.disclosures.volatility_limitation_text, 9);
  para(report.disclosures.costs_note_text, 9);
  heading("Data source and data gaps");
  para(legal.dataSource, 9);
  para(`In this period: ${count(report.skipped.data_minutes.missing_underlying, "minute")} of index data and ${count(report.skipped.data_minutes.missing_volatility, "minute")} of India VIX data were missing and skipped.`, 9);
  for (const d of report.skipped.data_days) para(`${day(d.date)}: skipped, ${d.reason_text}`, 9);

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(91, 98, 112);
    const lines = doc.splitTextToSize(T(legal.disclaimer), W - 2 * M) as string[];
    doc.text(lines, M, 280);
    doc.text(T(`Page ${i} of ${pages} · Engine version ${report.engine_version} · Generated ${report.generated_at.replace("T", " ")}`), M, 292);
    doc.setTextColor(0, 0, 0);
  }
  return doc.output("blob");
}

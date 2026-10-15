"use client";
// Equity curve with the drawdown chart directly below (feature 02 design §1.5): two charts on one
// time axis (never two y-axes), chart tokens, animations off, synced crosshair.
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Report } from "@/api/types";
import { day, monthLabel, rupees } from "@/lib/format";
import { ChartFrame } from "./ChartFrame";

export function compactRupees(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}₹${+(a / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${sign}₹${+(a / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${sign}₹${+(a / 1e3).toFixed(0)}K`;
  return `${sign}₹${a.toFixed(0)}`;
}

export function chartData(report: Report) {
  return report.equity_curve.map((p, i) => ({ i: i + 1, t: p.t, equity: p.equity, drawdown: -p.drawdown, net: report.trades[i]?.net_pnl ?? 0 }));
}

function CurveTable({ rows }: { rows: ReturnType<typeof chartData> }) {
  const [page, setPage] = useState(0);
  const per = 50;
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const slice = rows.slice(page * per, page * per + per);
  return (
    <div className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" tabIndex={0}>
      <table className="num w-full text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase text-ink-muted"><th>Date</th><th>Trade #</th><th className="text-right">Equity</th><th className="text-right">Drawdown</th></tr></thead>
        <tbody>
          {slice.map((r) => (
            <tr key={r.i} className="border-b border-line"><td>{day(r.t)}</td><td>{r.i}</td><td className="text-right">{rupees(r.equity, 0, "always")}</td><td className="text-right">{rupees(r.drawdown)}</td></tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="mt-2 flex items-center gap-3 text-sm">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="underline disabled:opacity-40">Previous</button>
          <span>Page {page + 1} of {pages}</span>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="underline disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

function TipBox({ active, payload }: { active?: boolean; payload?: { payload: ReturnType<typeof chartData>[number] }[] }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-surface p-2 text-xs shadow">
      <p>{day(d.t)} · trade #{d.i}</p>
      <p>Equity {rupees(d.equity, 0, "always")}</p>
      <p>This trade {rupees(d.net, 0, "always")}</p>
    </div>
  );
}

export const CSS_PALETTE = { line: "var(--chart-line)", negative: "var(--chart-negative)", grid: "var(--chart-grid)", axis: "var(--chart-axis)", ink: "var(--ink)" };
/** Resolved token values for the PDF (svg2pdf can't read CSS variables). Same values as globals.css. */
export const HEX_PALETTE = { line: "#2a78d6", negative: "#b42318", grid: "#e3e5e8", axis: "#8a8f98", ink: "#1c1f24" };

export function EquityAndDrawdown({ report, width, height = 240, interactive = true, palette = CSS_PALETTE }: { report: Report; width?: number; height?: number; interactive?: boolean; palette?: typeof CSS_PALETTE }) {
  const data = useMemo(() => chartData(report), [report]);
  const deepest = data.reduce((m, d) => (d.drawdown < m.drawdown ? d : m), data[0] ?? { drawdown: 0, t: "", i: 0, equity: 0, net: 0 });
  const tick = (t: string) => monthLabel(t.slice(0, 7));
  const axis = { stroke: palette.axis, fontSize: 12, tickLine: false };
  const equityChart = (
    <LineChart data={data} syncId="nikasha" width={width} height={height} margin={{ top: 8, right: 64, bottom: 0, left: 8 }}>
      <CartesianGrid vertical={false} stroke={palette.grid} />
      <XAxis dataKey="t" tickFormatter={tick} minTickGap={48} {...axis} />
      <YAxis tickFormatter={compactRupees} width={64} {...axis} />
      <ReferenceLine y={0} stroke={palette.axis} />
      {interactive && <Tooltip content={<TipBox />} />}
      <Line type="linear" dataKey="equity" stroke={palette.line} strokeWidth={2} dot={false} isAnimationActive={false}
        label={(p: { index?: number; x?: number; y?: number }) =>
          p.index === data.length - 1 ? <text x={(p.x ?? 0) + 6} y={p.y} fontSize={12} fill={palette.ink} dominantBaseline="middle">{compactRupees(data[data.length - 1]!.equity)}</text> : <g />} />
    </LineChart>
  );
  const ddChart = (
    <AreaChart data={data} syncId="nikasha" width={width} height={Math.round(height * 0.6)} margin={{ top: 8, right: 64, bottom: 0, left: 8 }}>
      <CartesianGrid vertical={false} stroke={palette.grid} />
      <XAxis dataKey="t" tickFormatter={tick} minTickGap={48} {...axis} />
      <YAxis tickFormatter={compactRupees} width={64} {...axis} />
      {interactive && <Tooltip content={<TipBox />} />}
      <Area type="linear" dataKey="drawdown" stroke={palette.negative} strokeWidth={2} fill={palette.negative} fillOpacity={0.1} isAnimationActive={false} />
      {deepest && deepest.drawdown < 0 && (
        <ReferenceLine x={deepest.t} stroke="transparent" label={{ value: `Max drawdown ${rupees(deepest.drawdown)}, ${day(deepest.t)}`, position: "insideBottomLeft", fontSize: 11, fill: palette.ink }} />
      )}
    </AreaChart>
  );
  if (width) {
    return <div data-export-charts>{equityChart}{ddChart}</div>;
  }
  return (
    <ChartFrame
      title="Equity and drawdown"
      caption="Top: running profit and loss after costs, at each trade's exit. Bottom: how far it was below its previous peak."
      chart={
        <div>
          <ResponsiveContainer width="100%" height={height}>{equityChart}</ResponsiveContainer>
          <ResponsiveContainer width="100%" height={Math.round(height * 0.6)}>{ddChart}</ResponsiveContainer>
        </div>
      }
      table={<CurveTable rows={data} />}
    />
  );
}

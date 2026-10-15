"use client";
import * as Tabs from "@radix-ui/react-tabs";
import { useState } from "react";
import type { BreakdownRow, Metrics, Report } from "@/api/types";
import { Callout } from "@/components/ui/Card";
import { RichText } from "@/components/ui/Glossary";
import { count, dateTime, day, monthLabel, pct, period, points, rupees } from "@/lib/format";

export const FEW_TRADES = 10;

const TABS: { key: keyof Report["breakdowns"]; label: string }[] = [
  { key: "by_year", label: "Year" },
  { key: "by_month", label: "Month" },
  { key: "by_vol_band", label: "India VIX" },
  { key: "by_regime", label: "Market trend" },
  { key: "by_weekday", label: "Weekday" },
  { key: "by_expiry_day", label: "Expiry day" },
  { key: "by_side", label: "Call/Put" },
];

function Bar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.min(50, (Math.abs(value) / max) * 50) : 0;
  return (
    <div aria-hidden className="relative h-3 w-40">
      <div className="absolute left-1/2 top-0 h-3 w-px bg-[var(--chart-axis)]" />
      {value !== 0 && (
        <div className="absolute top-0 h-3" style={{
          width: `${w}%`,
          left: value > 0 ? "50%" : `${50 - w}%`,
          background: value > 0 ? "var(--chart-positive)" : "var(--chart-negative)",
          borderRadius: value > 0 ? "0 4px 4px 0" : "4px 0 0 4px",
        }} />
      )}
    </div>
  );
}

export function BreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  const max = Math.max(0, ...rows.map((r) => Math.abs(r.net_pnl)));
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-[560px] text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase text-ink-muted"><th>Group</th><th className="text-right">Trades</th><th className="text-right">Win rate</th><th className="text-right">Net P&amp;L</th><th><span className="sr-only">Bar</span></th><th className="text-right">Expectancy</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-line hover:bg-bg">
              <td className="py-1.5">{r.label}{r.trades < FEW_TRADES && <span className="ml-2 text-xs text-ink-muted">(few trades)</span>}</td>
              <td className="text-right">{r.trades}</td>
              <td className="text-right">{r.win_rate_pct === null ? "—" : pct(r.win_rate_pct)}</td>
              <td className="text-right">{rupees(r.net_pnl, 0, "always")}</td>
              <td className="px-3"><Bar value={r.net_pnl} max={max} /></td>
              <td className="text-right">{r.expectancy === null ? "—" : rupees(r.expectancy, 0, "always")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthGrid({ rows }: { rows: BreakdownRow[] }) {
  const years = [...new Set(rows.map((r) => r.key.slice(0, 4)))].sort();
  const best = rows.reduce<BreakdownRow | null>((b, r) => (!b || r.net_pnl > b.net_pnl ? r : b), null);
  const worst = rows.reduce<BreakdownRow | null>((b, r) => (!b || r.net_pnl < b.net_pnl ? r : b), null);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-[720px] text-xs">
        <thead><tr className="border-b border-line text-ink-muted"><th className="text-left">Year</th>{months.map((m) => <th key={m} className="text-right">{monthLabel(`2000-${m}`).slice(0, 3)}</th>)}</tr></thead>
        <tbody>
          {years.map((y) => (
            <tr key={y} className="border-b border-line">
              <th className="py-1 text-left font-medium">{y}</th>
              {months.map((m) => {
                const r = byKey[`${y}-${m}`];
                const mark = r && (r === best ? "best" : r === worst ? "worst" : null);
                return (
                  <td key={m} className={`py-1 text-right ${mark ? "outline outline-1 outline-ink" : ""}`} title={r ? `${r.label}: ${count(r.trades, "trade")}` : undefined}>
                    {r ? rupees(r.net_pnl, 0, "always") : ""}
                    {mark && <span className="block text-[10px] text-ink-muted">{mark === "best" ? "best month" : "worst month"}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Breakdowns({ report }: { report: Report }) {
  return (
    <section aria-labelledby="bd">
      <h2 id="bd" className="text-lg font-semibold">When it worked</h2>
      <Tabs.Root defaultValue="by_year" className="mt-3 rounded-lg border border-line bg-surface p-4">
        <Tabs.List aria-label="Breakdowns" className="flex flex-wrap gap-2 border-b border-line pb-2">
          {TABS.map((t) => (
            <Tabs.Trigger key={t.key} value={t.key} className="rounded-md px-3 py-1 text-sm data-[state=active]:bg-brand data-[state=active]:text-white">{t.label}</Tabs.Trigger>
          ))}
        </Tabs.List>
        {TABS.map((t) => (
          <Tabs.Content key={t.key} value={t.key} className="mt-3">
            {report.breakdowns[t.key].length === 0 ? <p className="text-sm text-ink-muted">No trades.</p> : t.key === "by_month" ? <MonthGrid rows={report.breakdowns.by_month} /> : <BreakdownTable rows={report.breakdowns[t.key]} />}
          </Tabs.Content>
        ))}
        <p className="mt-2 text-xs text-ink-muted">Bars: blue above zero, red below; every value also carries its sign. Groups with fewer than {FEW_TRADES} trades are marked &ldquo;few trades&rdquo;.</p>
      </Tabs.Root>
    </section>
  );
}

function MiniTiles({ m }: { m: Metrics }) {
  return (
    <dl className="num grid grid-cols-2 gap-2 text-sm">
      <div><dt className="text-ink-muted">Expectancy</dt><dd className="font-semibold">{m.expectancy === null ? "—" : rupees(m.expectancy, 0, "always")}</dd></div>
      <div><dt className="text-ink-muted">Win rate</dt><dd className="font-semibold">{m.win_rate_pct === null ? "—" : pct(m.win_rate_pct)}</dd></div>
      <div><dt className="text-ink-muted">Trades</dt><dd className="font-semibold">{m.trades}</dd></div>
      <div><dt className="text-ink-muted">Max drawdown</dt><dd className="font-semibold">{rupees(-m.max_drawdown)}</dd></div>
    </dl>
  );
}

export function OverfitPanel({ report }: { report: Report }) {
  const o = report.overfit;
  return (
    <section aria-labelledby="of" data-testid="overfit">
      <h2 id="of" className="text-lg font-semibold"><RichText text="[[overfitting|Overfitting]] check" /></h2>
      <div className="mt-3 space-y-3">
        {o.status === "POSSIBLY_OVERFIT" ? (
          <Callout tone="caution" title="Possibly overfit.">{o.status_text.replace(/^Possibly overfit: /, "")}</Callout>
        ) : (
          <p className="rounded-md border border-line bg-surface p-3 text-sm">
            {o.status === "OK" ? "✓ " : ""}{o.status === "TOO_FEW_TRADES" ? "Too few trades to judge. " : o.status === "NOT_APPLICABLE" ? "Can't be checked for this period. " : ""}{o.status_text}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {o.in_sample && (
            <div className="rounded-lg border border-line bg-surface p-4">
              <p className="mb-2 font-medium">Tuning period · {period(o.in_sample.period.start, o.in_sample.period.end)}</p>
              <MiniTiles m={o.in_sample.metrics} />
            </div>
          )}
          {o.out_of_sample && (
            <div className="rounded-lg border border-line bg-surface p-4">
              <p className="mb-2 font-medium">Unseen period · {period(o.out_of_sample.period.start, o.out_of_sample.period.end)}</p>
              <MiniTiles m={o.out_of_sample.metrics} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function Sensitivity({ report }: { report: Report }) {
  const minus = report.sensitivity[0]!;
  const plus = report.sensitivity[1]!;
  const cols: [string, Metrics][] = [[`VIX ${points(minus.vol_shift_pts)}`.replace("VIX -", "VIX −"), minus.metrics], ["As tested", report.metrics], [`VIX +${points(plus.vol_shift_pts)}`, plus.metrics]];
  const rows: [string, (m: Metrics) => string][] = [
    ["Net P&L", (m) => rupees(m.net_pnl, 0, "always")],
    ["Win rate", (m) => (m.win_rate_pct === null ? "—" : pct(m.win_rate_pct))],
    ["Expectancy", (m) => (m.expectancy === null ? "—" : rupees(m.expectancy, 0, "always"))],
    ["Max drawdown", (m) => rupees(-m.max_drawdown)],
  ];
  return (
    <section aria-labelledby="sens" data-testid="sensitivity">
      <h2 id="sens" className="text-lg font-semibold">Volatility sensitivity</h2>
      <p className="mt-1 text-sm text-ink-muted">The same test with India VIX a little lower and higher, because option prices are modelled from it.</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface p-4">
        <table className="num w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-ink-muted"><th />{cols.map(([c]) => <th key={c} className="text-right">{c}</th>)}</tr></thead>
          <tbody>{rows.map(([label, f]) => <tr key={label} className="border-t border-line"><th className="py-1.5 text-left font-medium">{label}</th>{cols.map(([c, m]) => <td key={c} className="text-right">{f(m)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

export function TradesTable({ report }: { report: Report }) {
  const [page, setPage] = useState(0);
  const per = 50;
  const pages = Math.max(1, Math.ceil(report.trades.length / per));
  const slice = report.trades.slice(page * per, page * per + per);
  return (
    <section aria-labelledby="tr" data-testid="trades">
      <h2 id="tr" className="text-lg font-semibold">Trades</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="num w-full min-w-[900px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs uppercase text-ink-muted">
            <th className="p-2">#</th><th>Option</th><th>Entry time</th><th>Exit time</th><th className="text-right">Entry premium</th><th className="text-right">Exit premium</th><th className="text-right">Quantity</th><th className="text-right">Net P&amp;L</th><th className="pl-3">Exit reason</th>
          </tr></thead>
          <tbody>
            {slice.map((t) => (
              <tr key={t.n} className="border-b border-line">
                <td className="p-2">{t.n}</td>
                <td>{t.legs.map((l) => `${l.action === "BUY" ? "Buy" : "Sell"} ${l.strike} ${l.option_type}`).join(" + ")}</td>
                <td>{dateTime(t.entry_time)}</td>
                <td>{dateTime(t.exit_time)}</td>
                <td className="text-right">{t.legs.map((l) => l.entry_premium.toFixed(2)).join(" / ")}</td>
                <td className="text-right">{t.legs.map((l) => l.exit_premium.toFixed(2)).join(" / ")}</td>
                <td className="text-right">{t.quantity}</td>
                <td className="text-right">{rupees(t.net_pnl, 2, "always")}</td>
                <td className="pl-3">{t.exit_reason_text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Trade pages" className="mt-2 flex items-center gap-3 text-sm">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="underline disabled:opacity-40">Previous</button>
          <span data-testid="trade-page">Page {page + 1} of {pages}</span>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="underline disabled:opacity-40">Next</button>
        </nav>
      )}
    </section>
  );
}

export function SettingsAndNotes({ report }: { report: Report }) {
  const su = report.settings_used;
  return (
    <section className="space-y-3" aria-label="Settings, simulation and data">
      <details open className="rounded-lg border border-line bg-surface p-4">
        <summary className="cursor-pointer font-semibold">Settings used</summary>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="text-ink-muted">Size</dt><dd>{su.quantity_text}</dd>
          <dt className="text-ink-muted">Holding</dt><dd>{su.holding_text}</dd>
          <dt className="text-ink-muted">Chart</dt><dd>{su.timeframe_text}</dd>
          <dt className="text-ink-muted">Expiry</dt><dd>{su.expiry_text}</dd>
          <dt className="text-ink-muted">Period</dt><dd>{su.period_text}</dd>
          <dt className="text-ink-muted">Risk-free rate</dt><dd>{su.risk_free_rate_pct}%</dd>
          <dt className="text-ink-muted">Capital</dt><dd>{su.capital_text}</dd>
        </dl>
        <h3 className="mt-4 font-medium">Costs</h3>
        <ul className="mt-1 space-y-0.5 text-sm">{su.costs.map((c) => <li key={c.label}>{c.label}: {c.value_text} <span className="text-ink-muted">({c.source})</span></li>)}</ul>
        <h3 className="mt-4 font-medium">Advanced options</h3>
        <ul className="mt-1 space-y-0.5 text-sm">{su.advanced.map((a) => <li key={a.label}>{a.label}: <span className={a.used ? "" : "text-ink-muted"}>{a.value_text}</span></li>)}</ul>
        {su.no_effect_rules.length > 0 && (
          <>
            <h3 className="mt-4 font-medium">Rules that had no effect</h3>
            <ul className="mt-1 text-sm">{su.no_effect_rules.map((r) => <li key={r.text}>{r.text} ({count(r.trades_affected, "trade")})</li>)}</ul>
          </>
        )}
        <h3 className="mt-4 font-medium">Signals that didn&apos;t become trades</h3>
        {report.skipped.signals.length === 0 ? <p className="text-sm text-ink-muted">None.</p> : (
          <ul className="mt-1 text-sm">{report.skipped.signals.map((s) => <li key={s.reason}>{s.reason_text}: {count(s.count, "signal")}</li>)}</ul>
        )}
      </details>
      <details open className="rounded-lg border border-line bg-surface p-4">
        <summary className="cursor-pointer font-semibold">How this was simulated</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{report.simulation_notes.map((n) => <li key={n}>{n}</li>)}</ul>
        <div className="mt-3 space-y-2 text-sm">
          <p>{report.disclosures.modelled_premiums_text}</p>
          <p>{report.disclosures.volatility_limitation_text}</p>
          <p>{report.disclosures.costs_note_text}</p>
        </div>
      </details>
      <details open className="rounded-lg border border-line bg-surface p-4">
        <summary className="cursor-pointer font-semibold">Data source and data gaps</summary>
        <p className="mt-2 text-sm">{report.data_source.name} ({day(report.data_source.first)} – {day(report.data_source.last)}). {report.data_source.note}</p>
        <p className="mt-2 text-sm">In this period: {count(report.skipped.data_minutes.missing_underlying, "minute")} of index data and {count(report.skipped.data_minutes.missing_volatility, "minute")} of India VIX data were missing and skipped.</p>
        {report.skipped.data_days.length > 0 && (
          <ul className="mt-1 text-sm" data-testid="data-days">{report.skipped.data_days.map((d) => <li key={d.date}>{day(d.date)}: skipped, {d.reason_text}</li>)}</ul>
        )}
      </details>
    </section>
  );
}

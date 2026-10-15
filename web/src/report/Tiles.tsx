"use client";
import type { Metrics } from "@/api/types";
import { InfoTip } from "@/components/ui/Glossary";
import { METRIC_LABELS, METRIC_TOOLTIPS, type ReportMetricKey } from "@/copy/tooltips";
import { count, pct, rupees } from "@/lib/format";

/** Values in primary ink; ▲/▼ carries direction so colour is never the only signal (REQ-RPT-16). */
function Direction({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined || v === 0) return null;
  return <span aria-hidden className="mr-1 text-xs">{v > 0 ? "▲" : "▼"}</span>;
}

export function MetricTile({ k, value, explanation, risk, signed }: { k: ReportMetricKey; value: string; explanation: string; risk?: boolean; signed?: number | null }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4" data-metric={k}>
      <p className="flex items-center text-sm text-ink-muted">
        {risk && <span aria-hidden className="mr-1 text-risk">⚠</span>}
        {METRIC_LABELS[k]}
        <InfoTip label={METRIC_LABELS[k]} text={METRIC_TOOLTIPS[k]} />
      </p>
      <p className="mt-1 text-xl font-semibold"><Direction v={signed} />{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{explanation}</p>
    </div>
  );
}

const money = (v: number | null | undefined) => (v === null || v === undefined ? "—" : rupees(v, 0, "always"));

export function RiskTiles({ m }: { m: Metrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="risk-tiles">
      <MetricTile k="max_drawdown" risk value={m.max_drawdown ? rupees(-m.max_drawdown) : "₹0"} explanation={m.max_drawdown_pct != null ? `${pct(m.max_drawdown_pct)} of capital at the worst point` : "Largest fall from a peak"} />
      <MetricTile k="worst_losing_streak" risk value={count(m.worst_losing_streak, "trade")} explanation="Most losing trades in a row" />
      <MetricTile k="largest_loss" risk value={money(m.largest_loss)} explanation="The single worst trade" signed={m.largest_loss} />
    </div>
  );
}

export function ResultTiles({ m }: { m: Metrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="result-tiles">
      <MetricTile k="net_pnl" value={money(m.net_pnl)} signed={m.net_pnl} explanation={`After ${rupees(m.total_costs)} in costs`} />
      <MetricTile k="win_rate_pct" value={m.win_rate_pct === null ? "—" : pct(m.win_rate_pct)} explanation={`${m.wins} of ${m.trades} trades made money`} />
      <MetricTile k="avg_win" value={`${money(m.avg_win)} / ${money(m.avg_loss)}`} explanation="Average win / average loss" />
      <MetricTile k="expectancy" value={money(m.expectancy)} signed={m.expectancy} explanation="Average result per trade" />
      <MetricTile k="trades" value={count(m.trades, "trade")} explanation="In the selected period" />
      {m.return_pct != null && <MetricTile k="return_pct" value={pct(m.return_pct, 2)} signed={m.return_pct} explanation="On the capital you entered" />}
    </div>
  );
}

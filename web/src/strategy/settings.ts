// Evaluation settings helpers (feature 02 design §1.1): pre-fills from meta, period quick choices.
import type { CostKey, EvaluationSettings, InstrumentSummary, MetaResponse, Strategy } from "@/api/types";
import { COST_KEYS } from "@/api/types";
import type { PeriodChoice, SettingsState } from "@/store";

export function expiryKind(strategy: { legs?: { expiry?: string }[] } | null | undefined): "WEEKLY" | "MONTHLY" {
  const e = strategy?.legs?.[0]?.expiry;
  return e === "MONTHLY" ? "MONTHLY" : "WEEKLY";
}

export function instrumentOf(meta: MetaResponse | null, symbol = "NIFTY50"): InstrumentSummary | undefined {
  return meta?.instruments.find((i) => i.symbol === symbol) ?? meta?.instruments[0];
}

function addYears(iso: string, years: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  d.setUTCDate(d.getUTCDate() + 1); // last N years = [last − N years + 1 day, last]
  return d.toISOString().slice(0, 10);
}

/** Period for a quick choice, clipped to the expiry kind's availability (feature 02 design §1.1). */
export function periodFor(choice: Exclude<PeriodChoice, "custom">, inst: InstrumentSummary, kind: "WEEKLY" | "MONTHLY"): { start: string; end: string } {
  const k = inst.expiry_kinds.find((x) => x.kind === kind)!;
  const last = inst.data_range.last.slice(0, 10);
  const earliest = k.default_period.start;
  if (choice === "full") return { start: earliest, end: k.default_period.end };
  const years = Number(choice[0]);
  const start = addYears(last, -years);
  return { start: start < earliest ? earliest : start, end: last };
}

export function defaultCosts(inst: InstrumentSummary): Partial<Record<CostKey, number>> {
  return Object.fromEntries(inst.default_costs.items.map((i) => [i.key, i.value])) as Partial<Record<CostKey, number>>;
}

/** Template "Use this template": full period, all default costs, no capital, already checked (D1). */
export function templateSettings(inst: InstrumentSummary, strategy: Strategy): SettingsState {
  return {
    periodChoice: "full",
    period: periodFor("full", inst, expiryKind(strategy)),
    costs: defaultCosts(inst),
    capital: null,
    checked: true,
  };
}

/** Pre-filled but unchecked settings (builder, upload, Customize). */
export function prefilledSettings(inst: InstrumentSummary, strategy: { legs?: { expiry?: string }[] } | null): SettingsState {
  return { ...templateSettings(inst, strategy as Strategy), checked: false };
}

export function toEvaluationSettings(s: SettingsState): EvaluationSettings | null {
  if (!s.period) return null;
  const costs: Partial<Record<CostKey, number>> = {};
  for (const k of COST_KEYS) {
    const v = s.costs[k];
    if (v === null || v === undefined || Number.isNaN(v) || v < 0) return null;
    costs[k] = v;
  }
  return {
    period: s.period,
    costs: costs as EvaluationSettings["costs"],
    ...(s.capital ? { capital_rupees: s.capital } : {}),
  };
}

export function costSummary(inst: InstrumentSummary, costs: Partial<Record<CostKey, number | null>>): string {
  const v = (k: CostKey) => costs[k] ?? inst.default_costs.items.find((i) => i.key === k)?.value;
  return `₹${v("brokerage_per_order")}/order brokerage, STT ${v("stt_sell_pct")}% (sell), exchange ${v("exchange_txn_pct")}%, GST ${v("gst_pct")}%, slippage ${v("slippage_pts")} points per fill`;
}

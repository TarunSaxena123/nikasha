"use client";
// "Ideas to test" (feature 06; REQ-SUG-01, 07…12). On demand; concurrency 4; fixed group order;
// no ranking. Leaving the report aborts every run in flight.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiFailure, evaluate, planSuggestions } from "@/api/client";
import type { EvaluateRequest, Metrics, Report, Variant } from "@/api/types";
import { DisclaimerShort } from "@/components/legal/Legal";
import { Button } from "@/components/ui/Button";
import { SUG, tuningKept, tuningPicked } from "@/copy/suggestions";
import { pct, period, rupees } from "@/lib/format";
import { useStore, type SuggestionRun } from "@/store";
import { clone, emptyDraft } from "@/strategy/draft";

export const CONCURRENCY = 4;
let controller: AbortController | null = null;

function update(id: string, patch: Partial<SuggestionRun>) {
  const s = useStore.getState();
  s.set({ suggestions: { ...s.suggestions, runs: s.suggestions.runs.map((r) => (r.variant.id === id ? { ...r, ...patch } : r)) } });
}

async function runOne(v: Variant, settings: EvaluateRequest["settings"], signal: AbortSignal) {
  update(v.id, { status: "running" });
  try {
    const report = await evaluate({ strategy: v.strategy as never, settings }, signal);
    if (!signal.aborted) update(v.id, { status: "done", report });
  } catch (e) {
    if (signal.aborted || (e instanceof ApiFailure && e.kind === "aborted")) return;
    update(v.id, { status: "error" });
  }
}

export async function runAll(variants: Variant[], settings: EvaluateRequest["settings"], signal: AbortSignal) {
  let next = 0;
  const worker = async () => {
    while (next < variants.length && !signal.aborted) {
      const v = variants[next++]!;
      await runOne(v, settings, signal);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, variants.length) }, worker));
}

export function stopSuggestions() {
  controller?.abort();
  controller = null;
}

function MetricsTable({ base, variant }: { base: Report; variant: Report }) {
  const oosB = base.overfit.out_of_sample?.metrics;
  const oosV = variant.overfit.out_of_sample?.metrics;
  const rows: [string, (m: Metrics) => string][] = [
    ["Net P&L", (m) => rupees(m.net_pnl, 0, "always")],
    ["Win rate", (m) => (m.win_rate_pct === null ? "—" : pct(m.win_rate_pct))],
    ["Max drawdown", (m) => rupees(-m.max_drawdown)],
    ["Expectancy", (m) => (m.expectancy === null ? "—" : rupees(m.expectancy, 0, "always"))],
    ["Trades", (m) => String(m.trades)],
  ];
  return (
    <div className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" tabIndex={0}>
      <table className="num w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-xs uppercase text-ink-muted"><th scope="col"><span className="sr-only">Measure</span></th><th colSpan={2} className="text-center">Whole period</th><th colSpan={2} className="text-center">Unseen period</th></tr>
          <tr className="text-xs text-ink-muted"><th scope="col"><span className="sr-only">Measure</span></th><th className="text-right">Yours</th><th className="text-right">This idea</th><th className="text-right">Yours</th><th className="text-right">This idea</th></tr>
        </thead>
        <tbody>
          {rows.map(([label, f]) => (
            <tr key={label} className="border-t border-line">
              <th className="py-1 text-left font-medium">{label}</th>
              <td className="text-right">{f(base.metrics)}</td><td className="text-right">{f(variant.metrics)}</td>
              <td className="text-right">{oosB ? f(oosB) : "—"}</td><td className="text-right">{oosV ? f(oosV) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(!oosB || !oosV) && <p className="mt-1 text-xs text-ink-muted">{SUG.noUnseen}.</p>}
    </div>
  );
}

const STATUS_ICON: Record<string, string> = { OK: "✓", POSSIBLY_OVERFIT: "⚠", TOO_FEW_TRADES: "…", NOT_APPLICABLE: "–" };

/** The tuning check for one sweep group (REQ-SUG-09). Returns null when the period doesn't span both parts. */
export function tuningCheck(base: Report, baseValue: number, runs: { value: number; report: Report }[], field: string, fmtValue: (v: number) => string): string | null {
  const all = [{ value: baseValue, report: base }, ...runs];
  if (all.some((r) => !r.report.overfit.in_sample || !r.report.overfit.out_of_sample)) return null;
  const exp = (r: Report) => r.overfit.in_sample!.metrics.expectancy ?? -Infinity;
  const pick = all.reduce((b, r) => {
    const d = exp(r.report) - exp(b.report);
    if (d > 0) return r;
    if (d === 0 && Math.abs(r.value - baseValue) < Math.abs(b.value - baseValue)) return r;
    return b;
  });
  const is = base.overfit.in_sample!.period;
  const oos = base.overfit.out_of_sample!.period;
  if (pick.value === baseValue) return tuningKept({ isLabel: period(is.start, is.end), value: fmtValue(baseValue) });
  return tuningPicked({
    field, isLabel: period(is.start, is.end), pick: fmtValue(pick.value), oosLabel: period(oos.start, oos.end),
    pickNet: rupees(pick.report.overfit.out_of_sample!.metrics.net_pnl, 0, "always"),
    origNet: rupees(base.overfit.out_of_sample!.metrics.net_pnl, 0, "always"), orig: fmtValue(baseValue),
  });
}

function sweepValue(v: Variant): number | null {
  const ex = v.strategy.exit as unknown as Record<string, { value?: number } | undefined>;
  const field = v.group?.startsWith("Stop-loss") ? "stop_loss" : v.group?.startsWith("Target") ? "target" : null;
  return field ? (ex[field]?.value ?? null) : null;
}

export function SuggestionsPanel() {
  const router = useRouter();
  const evaluation = useStore((s) => s.evaluation);
  const sug = useStore((s) => s.suggestions);
  const set = useStore((s) => s.set);

  useEffect(() => () => stopSuggestions(), []);
  if (evaluation.status !== "done") return null;
  const { report, request } = evaluation;

  const show = async () => {
    stopSuggestions();
    controller = new AbortController();
    const signal = controller.signal;
    set({ suggestions: { status: "planning", notOffered: null, runs: [], message: null } });
    try {
      const b = report.breakdowns;
      const plan = await planSuggestions({ strategy: request.strategy, settings: request.settings, base: { metrics: report.metrics, by_vol_band: b.by_vol_band, by_regime: b.by_regime, by_side: b.by_side } }, signal);
      if (plan.not_offered_text) {
        set({ suggestions: { status: "done", notOffered: plan.not_offered_text, runs: [], message: null } });
        return;
      }
      set({ suggestions: { status: "running", notOffered: null, runs: plan.variants.map((variant) => ({ variant, status: "queued", report: null })), message: null } });
      await runAll(plan.variants, request.settings, signal);
      if (!signal.aborted) set({ suggestions: { ...useStore.getState().suggestions, status: "done" } });
    } catch (e) {
      if (e instanceof ApiFailure && e.kind === "aborted") return;
      set({ suggestions: { status: "error", notOffered: null, runs: [], message: SUG.planFailed } });
    }
  };

  const retry = (v: Variant) => {
    if (!controller) controller = new AbortController();
    void runOne(v, request.settings, controller.signal);
  };

  const tryIt = (v: Variant) => {
    stopSuggestions();
    const draft = useStore.getState().draft;
    set({
      draft: { ...(draft ?? emptyDraft("BUILDER")), strategy: clone(v.strategy) as never, confirmed: draft?.confirmed ?? { lots: true, lotSize: true } },
      evaluation: { status: "idle" },
      suggestions: { status: "idle", notOffered: null, runs: [], message: null },
    });
    router.push("/review");
  };

  const done = sug.runs.filter((r) => r.status === "done" || r.status === "error").length;
  const groups: string[] = [];
  for (const r of sug.runs) if (!groups.includes(r.variant.group ?? r.variant.kind)) groups.push(r.variant.group ?? r.variant.kind);

  return (
    <section aria-labelledby="sug" className="rounded-xl border-2 border-accent bg-accent-soft p-6 shadow-sm" data-testid="suggestions">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-white">✦</span>
          <div>
            <h2 id="sug" className="text-xl font-semibold">{SUG.title}</h2>
            <p className="mt-1 text-sm text-ink">{SUG.intro}</p>
          </div>
        </div>
        {(sug.status === "idle" || sug.status === "error") && <Button className="px-5 py-2.5 text-base" onClick={() => void show()}>{SUG.show}</Button>}
      </div>
      {sug.status === "planning" && <p className="mt-3 text-sm" aria-live="polite">Preparing ideas…</p>}
      {sug.message && <p className="mt-3 text-sm text-risk" role="alert">{sug.message}</p>}
      {sug.notOffered && <p className="mt-3 text-sm">{sug.notOffered}</p>}
      {sug.runs.length > 0 && (
        <p className="mt-3 text-sm" aria-live="polite" data-testid="sug-progress">
          {sug.status === "running" ? `Running ${Math.min(done + 1, sug.runs.length)} of ${sug.runs.length}…` : `${done} of ${sug.runs.length} done`}
        </p>
      )}
      <div className="mt-4 space-y-6">
        {groups.map((g) => {
          const runs = sug.runs.filter((r) => (r.variant.group ?? r.variant.kind) === g);
          const sweep = runs[0]?.variant.kind === "PARAMETER_SWEEP";
          let tuning: string | null = null;
          let tuningHidden = false;
          if (sweep && runs.every((r) => r.status === "done" && r.report)) {
            const field = g.startsWith("Stop-loss") ? "stop-loss" : "target";
            const ex = request.strategy.exit as unknown as Record<string, { value: number }>;
            const baseValue = ex[field === "stop-loss" ? "stop_loss" : "target"]!.value;
            const unit = g.includes("%") ? "%" : " points";
            tuning = tuningCheck(report, baseValue, runs.map((r) => ({ value: sweepValue(r.variant)!, report: r.report! })), field, (v) => `${v}${unit}`);
            tuningHidden = tuning === null;
          }
          return (
            <div key={g}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{g}</h3>
              {tuning && <p className="mt-2 rounded-md bg-bg p-3 text-sm" data-testid="tuning-check"><strong>Tuning check:</strong> {tuning}</p>}
              {tuningHidden && <p className="mt-2 text-sm text-ink-muted">{SUG.longerPeriod}</p>}
              <div className="mt-2 space-y-3">
                {runs.map((r) => (
                  <article key={r.variant.id} className="rounded-lg border border-line bg-surface p-4" data-testid="sug-card">
                    <h4 className="font-medium">{r.variant.change_text}</h4>
                    <p className="mt-1 text-sm text-ink-muted"><strong>Why:</strong> {r.variant.reason_text}</p>
                    {r.status === "queued" || r.status === "running" ? <p className="mt-2 text-sm text-ink-muted">{r.status === "queued" ? "Waiting…" : "Running…"}</p> : null}
                    {r.status === "error" && <p className="mt-2 text-sm text-risk" role="alert">{SUG.variantFailed} <button type="button" className="underline" onClick={() => retry(r.variant)}>Retry</button></p>}
                    {r.status === "done" && r.report && (
                      <div className="mt-3 space-y-2">
                        <MetricsTable base={report} variant={r.report} />
                        <p className="text-sm"><span aria-hidden className="mr-1">{STATUS_ICON[r.report.overfit.status]}</span><strong>Overfitting check:</strong> {r.report.overfit.status_text}</p>
                      </div>
                    )}
                    <Button variant="secondary" className="mt-3" onClick={() => tryIt(r.variant)}>{SUG.tryIt}</Button>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {(sug.runs.length > 0 || sug.notOffered) && <DisclaimerShort className="mt-4" />}
    </section>
  );
}

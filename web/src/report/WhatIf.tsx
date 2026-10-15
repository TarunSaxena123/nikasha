"use client";
// What-if sliders (feature 05 design §1.6; REQ-BEG-14…18). Each request changes exactly one value,
// uses the same settings, is debounced 600 ms, cancels the previous request and drops stale replies.
import * as Slider from "@radix-ui/react-slider";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiFailure, evaluate } from "@/api/client";
import type { EvaluateRequest, Metrics } from "@/api/types";
import { DisclaimerShort } from "@/components/legal/Legal";
import { Button } from "@/components/ui/Button";
import { NOT_APPLICABLE, WHATIF_RANGES, fieldLabel, valueText, whatIfSentence } from "@/copy/whatif";
import { pct, rupees } from "@/lib/format";
import { emptyWhatIf, useStore } from "@/store";
import { clone, emptyDraft } from "@/strategy/draft";

type Field = "stop_loss" | "target";
type ValType = "PCT_PREMIUM" | "POINTS";
export const DEBOUNCE_MS = 600;

interface SliderSpec {
  field: Field;
  type: ValType;
  original: number;
  min: number;
  max: number;
  step: number;
}

export function slidersFor(req: EvaluateRequest): { sliders: SliderSpec[]; types: string[] } {
  const ex = req.strategy.exit as unknown as Record<string, { type: string; value?: number } | undefined>;
  const out: SliderSpec[] = [];
  const types: string[] = [];
  for (const field of ["stop_loss", "target"] as Field[]) {
    const v = ex[field];
    if (!v) continue;
    if ((v.type === "PCT_PREMIUM" || v.type === "POINTS") && typeof v.value === "number") {
      const r = WHATIF_RANGES[field][v.type];
      out.push({ field, type: v.type, original: v.value, min: Math.min(r.min, v.value), max: Math.max(r.max, v.value), step: r.step });
    } else {
      types.push(v.type === "TRIGGER_CANDLE" ? "a trigger-candle stop-loss" : v.type === "RR" ? "a risk-reward target" : "another type");
    }
  }
  return { sliders: out, types };
}

export function changedRequest(req: EvaluateRequest, field: Field, value: number): EvaluateRequest {
  const next = clone(req);
  (next.strategy.exit as unknown as Record<string, { value: number }>)[field]!.value = value;
  return next;
}

let controller: AbortController | null = null;
let nextId = 1;

export function WhatIfPanel() {
  const router = useRouter();
  const evaluation = useStore((s) => s.evaluation);
  const whatIf = useStore((s) => s.whatIf);
  const set = useStore((s) => s.set);
  const [values, setValues] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (evaluation.status !== "done") return null;
  const req = evaluation.request;
  const { sliders, types } = slidersFor(req);
  const original = evaluation.report.metrics;

  const run = (field: Field, value: number) => {
    controller?.abort();
    controller = new AbortController();
    const requestId = nextId++;
    set({ whatIf: { ...emptyWhatIf(), requestId, field, value, status: "running" } });
    evaluate(changedRequest(req, field, value), controller.signal)
      .then((report) => {
        if (useStore.getState().whatIf.requestId !== requestId) return;
        set({ whatIf: { requestId, field, value, status: "done", report, message: null } });
      })
      .catch((e: unknown) => {
        if (useStore.getState().whatIf.requestId !== requestId) return;
        if (e instanceof ApiFailure && e.kind === "aborted") return;
        const busy = e instanceof ApiFailure && e.kind === "busy";
        set({ whatIf: { requestId, field, value, status: "error", report: null, message: busy ? "Busy right now, please try again." : "Couldn't run this what-if. Try again." } });
      });
  };

  const onChange = (s: SliderSpec, v: number) => {
    // One change at a time: moving one slider resets the others to their original values.
    setValues({ [s.field]: v });
    if (timer.current) clearTimeout(timer.current);
    if (v === s.original) {
      controller?.abort();
      set({ whatIf: emptyWhatIf() });
      return;
    }
    timer.current = setTimeout(() => run(s.field, v), DEBOUNCE_MS);
  };

  const useTheseSettings = () => {
    if (whatIf.field === null || whatIf.value === null) return;
    const changed = changedRequest(req, whatIf.field as Field, whatIf.value);
    const draft = useStore.getState().draft;
    set({
      draft: { ...(draft ?? emptyDraft("BUILDER")), strategy: clone(changed.strategy) as never, confirmed: draft?.confirmed ?? { lots: true, lotSize: true } },
      evaluation: { status: "idle" },
      whatIf: emptyWhatIf(),
    });
    router.push("/review");
  };

  const spec = sliders.find((s) => s.field === whatIf.field);
  const w: Metrics | null = whatIf.report?.metrics ?? null;
  let sentence = "";
  if (w && spec && whatIf.value !== null) {
    const diff = w.net_pnl - original.net_pnl;
    sentence = whatIfSentence({
      label: fieldLabel(spec.field, spec.type), next: valueText(spec.type, whatIf.value), old: valueText(spec.type, spec.original),
      madeLost: w.net_pnl < 0 ? "lost" : "made", absNet: rupees(w.net_pnl, 0, "none"), diff: rupees(Math.abs(diff), 0, "none"),
      moreLess: diff >= 0 ? "more" : "less", maxDd: rupees(w.max_drawdown, 0, "none"),
    });
  }
  const row = (label: string, f: (m: Metrics) => string) => (
    <tr className="border-t border-line"><th className="py-1 text-left font-medium">{label}</th><td className="text-right">{f(original)}</td><td className="text-right">{w ? f(w) : "—"}</td></tr>
  );

  return (
    <section aria-labelledby="wi" className="rounded-lg border border-line bg-surface p-5" data-testid="whatif">
      <h2 id="wi" className="text-lg font-semibold">What if…?</h2>
      {sliders.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{NOT_APPLICABLE.replace("{types}", types.join(" and ") || "other types")}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-muted">Move one slider to re-run the same test with only that value changed.</p>
          <div className="mt-4 space-y-5">
            {sliders.map((s) => {
              const v = values[s.field] ?? s.original;
              const label = fieldLabel(s.field, s.type);
              return (
                <div key={s.field} className="grid items-center gap-2 sm:grid-cols-[12rem_1fr_8rem]">
                  <span className="text-sm font-medium capitalize" id={`wi-${s.field}`}>{label}</span>
                  <Slider.Root className="relative flex h-5 w-full touch-none select-none items-center" min={s.min} max={s.max} step={s.step} value={[v]} onValueChange={([nv]) => onChange(s, nv!)} aria-labelledby={`wi-${s.field}`}>
                    <Slider.Track className="relative h-1 grow rounded-full bg-line"><Slider.Range className="absolute h-full rounded-full bg-accent" /></Slider.Track>
                    <Slider.Thumb className="block h-5 w-5 rounded-full border-2 border-accent bg-surface" aria-label={label} data-testid={`slider-${s.field}`} />
                  </Slider.Root>
                  <span className="num text-sm">{v === s.original ? valueText(s.type, v) : `${valueText(s.type, s.original)} → ${valueText(s.type, v)}`}</span>
                </div>
              );
            })}
          </div>
          {whatIf.status === "running" && <p className="mt-4 text-sm text-ink-muted" aria-live="polite">Running the what-if…</p>}
          {whatIf.status === "error" && <p className="mt-4 text-sm text-risk" role="alert">{whatIf.message} <button type="button" className="underline" onClick={() => whatIf.field && whatIf.value !== null && run(whatIf.field as Field, whatIf.value)}>Retry</button></p>}
          {w && (
            <div className="mt-4" aria-live="polite">
              <table className="num w-full max-w-lg text-sm">
                <thead><tr className="text-xs uppercase text-ink-muted"><th /><th className="text-right">Original</th><th className="text-right">What-if</th></tr></thead>
                <tbody>
                  {row("Net P&L", (m) => rupees(m.net_pnl, 0, "always"))}
                  {row("Win rate", (m) => (m.win_rate_pct === null ? "—" : pct(m.win_rate_pct)))}
                  {row("Max drawdown", (m) => rupees(-m.max_drawdown))}
                  {row("Expectancy", (m) => (m.expectancy === null ? "—" : rupees(m.expectancy, 0, "always")))}
                  {row("Trades", (m) => String(m.trades))}
                </tbody>
              </table>
              <p className="mt-3 text-sm" data-testid="whatif-sentence">{sentence}</p>
              <Button variant="secondary" className="mt-3" onClick={useTheseSettings}>Use these settings</Button>
            </div>
          )}
          <DisclaimerShort className="mt-4" />
        </>
      )}
    </section>
  );
}

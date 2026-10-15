"use client";
// Builder steps (feature 03 design §1.5, §1.9, §1.10). Each step edits the draft in the store.
import { useState } from "react";
import type { InstrumentSummary } from "@/api/types";
import { ConfirmPrefill } from "@/components/ConfirmPrefill";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Card";
import { RichText } from "@/components/ui/Glossary";
import { number } from "@/lib/format";
import { getAt } from "@/lib/patch";
import type { Draft, StrategyDraft } from "@/strategy/draft";
import { mirror } from "@/strategy/mirror";
import { moneynessStrike } from "@/strategy/strikes";
import { ConditionGroup, IndicatorManager, usedIndicatorIds } from "./conditions";
import { Field, NumberInput, Segmented, TimeInput } from "./fields";

type AnyRec = Record<string, unknown>;
export interface StepProps {
  draft: Draft;
  update: (fn: (s: AnyRec, d: Draft) => void) => void;
  setDraft: (d: Draft) => void;
  inst: InstrumentSummary | undefined;
  problem: (label: string) => string | undefined;
}

const legs = (s: AnyRec) => ((s.legs as AnyRec[] | undefined) ?? []) as AnyRec[];

export function Basics({ draft, update, setDraft, inst, problem }: StepProps) {
  const s = draft.strategy as AnyRec;
  const leg0 = legs(s)[0] ?? {};
  const multi = legs(s).length > 1;
  const pos = (s.position ?? {}) as { lots?: number; lot_size?: number };
  const setAll = (field: string, v: unknown) => update((st) => {
    const ls = legs(st);
    if (!ls.length) st.legs = [{}];
    legs(st).forEach((l) => (l[field] = v));
  });
  const setOptionType = (v: string) => update((st, d) => {
    if (!legs(st).length) st.legs = [{}];
    const entry = (st.entry ?? {}) as AnyRec;
    if (v !== "SIGNAL" && entry.pe && v === "CE") {
      d.hiddenPutSet = entry.pe; // kept, not deleted, while the builder is open
      delete entry.pe;
    } else if (v === "SIGNAL" && d.hiddenPutSet && !entry.pe) {
      entry.pe = d.hiddenPutSet;
      delete d.hiddenPutSet;
    }
    if (v === "PE" && entry.ce && !entry.pe) {
      entry.pe = entry.ce;
      delete entry.ce;
    }
    st.entry = entry;
    legs(st)[0]!.option_type = v;
  });
  const tfs = inst?.allowed_timeframes_min ?? [1, 3, 5, 15, 30, 60, 240];
  return (
    <div className="space-y-5">
      <Field id="instrument" label="Instrument"><span className="inline-block rounded-full border border-line px-3 py-1 text-sm">{inst?.name ?? "Nifty 50"}</span></Field>
      <Field id="action" label="Buy or sell" problem={problem("Buy or sell")}>
        {multi ? <p className="text-sm text-ink-muted">Set per leg under Multiple legs.</p> : (
          <Segmented id="action" value={leg0.action as string | undefined} onChange={(v) => setAll("action", v)} options={[{ value: "BUY", label: "Buy options" }, { value: "SELL", label: "Sell options" }]} />
        )}
      </Field>
      <Field id="option_type" label="Option type" problem={problem("Option type")}>
        {multi ? <p className="text-sm text-ink-muted">Set per leg under Multiple legs.</p> : (
          <Segmented id="option_type" value={leg0.option_type as string | undefined} onChange={setOptionType}
            options={[{ value: "CE", label: "Call" }, { value: "PE", label: "Put" }, { value: "SIGNAL", label: "Both (call on the call signal, put on the put signal)" }]} />
        )}
      </Field>
      <Field id="expiry" label="Expiry" problem={problem("Expiry")} note={inst ? `Weekly options exist from ${inst.expiry_kinds.find((k) => k.kind === "WEEKLY")?.available_from ?? ""}; earlier periods need monthly expiry.` : "loading…"}>
        <select aria-labelledby="lbl-expiry" className="rounded-md border border-line px-2 py-1 text-sm" value={(leg0.expiry as string) ?? ""} onChange={(e) => setAll("expiry", e.target.value || undefined)}>
          <option value="">Choose…</option>
          <option value="CURRENT_WEEKLY">Current weekly</option>
          <option value="NEXT_WEEKLY">Next weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </Field>
      <Field id="timeframe" label="Candle timeframe" problem={problem("Candle timeframe")}>
        <select aria-labelledby="lbl-timeframe" className="rounded-md border border-line px-2 py-1 text-sm" value={(s.timeframe_min as number | undefined) ?? ""} onChange={(e) => update((st) => (st.timeframe_min = e.target.value ? Number(e.target.value) : undefined))} data-testid="timeframe">
          <option value="">Choose…</option>
          {tfs.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : m === 60 ? "60 min" : `${m / 60} hours`}</option>)}
        </select>
      </Field>
      <Field id="holding" label="Holding" problem={problem("Holding")}>
        <Segmented id="holding" value={s.holding as string | undefined} onChange={(v) => update((st) => (st.holding = v))}
          options={[{ value: "INTRADAY", label: `Intraday (closed by ${inst?.intraday_squareoff ?? "15:15"})` }, { value: "POSITIONAL", label: "Positional" }]} />
      </Field>
      {s.timeframe_min === 240 && s.holding === "INTRADAY" && (
        <Callout tone="info">With 4-hour candles and intraday holding, only the 13:14 candle close can trigger entries, because the day&apos;s second candle closes after the {inst?.intraday_squareoff ?? "15:15"} square-off.</Callout>
      )}
      <Field id="lots" label="Number of lots" problem={problem("Number of lots")}>
        <ConfirmPrefill label="Number of lots" value={pos.lots} confirmed={draft.confirmed.lots} max={1000}
          onChange={(v) => setDraft({ ...draft, strategy: { ...draft.strategy, position: { ...pos, lots: v } } as StrategyDraft, confirmed: { ...draft.confirmed, lots: v !== undefined } })}
          onConfirm={() => setDraft({ ...draft, confirmed: { ...draft.confirmed, lots: true } })} />
      </Field>
      <Field id="lot_size" label="Lot size" problem={problem("Lot size")}>
        <ConfirmPrefill label="Lot size" value={pos.lot_size} confirmed={draft.confirmed.lotSize} max={100000} note={inst?.lot_size_note}
          onChange={(v) => setDraft({ ...draft, strategy: { ...draft.strategy, position: { ...pos, lot_size: v } } as StrategyDraft, confirmed: { ...draft.confirmed, lotSize: v !== undefined } })}
          onConfirm={() => setDraft({ ...draft, confirmed: { ...draft.confirmed, lotSize: true } })} />
      </Field>
    </div>
  );
}

export function strikeExample(st: AnyRec, optionType: string | undefined, interval: number): string | null {
  const m = st.moneyness as "ATM" | "ITM" | "OTM" | undefined;
  if (!m) return null;
  const d = m === "ATM" ? 0 : Number(st.distance_pts);
  if (m !== "ATM" && !(d > 0)) return null;
  const spot = 24500;
  const ce = `${number(moneynessStrike(spot, interval, m, d, true))} CE`;
  const pe = `${number(moneynessStrike(spot, interval, m, d, false))} PE`;
  const what = m === "ATM" ? "ATM" : `${d} points ${m}`;
  if (optionType === "CE") return `Nifty at 24,500 → ${what} Call = ${ce}`;
  if (optionType === "PE") return `Nifty at 24,500 → ${what} Put = ${pe}`;
  return `Nifty at 24,500 → ${what} Call = ${ce}; Put = ${pe}`;
}

export function Strike({ draft, update, inst, problem }: StepProps) {
  const s = draft.strategy as AnyRec;
  const multi = legs(s).length > 1;
  const leg0 = legs(s)[0] ?? {};
  const st = (leg0.strike ?? {}) as AnyRec;
  const interval = inst?.strike_interval ?? 50;
  if (multi) return <p className="text-sm text-ink-muted">Each leg has its own strike under Advanced options → Multiple legs.</p>;
  if (st.method === "DELTA" || st.method === "PREMIUM") return <p className="text-sm text-ink-muted">The strike is chosen by {st.method === "DELTA" ? "delta" : "premium"} under Advanced options.</p>;
  const ex = strikeExample(st, leg0.option_type as string | undefined, interval);
  return (
    <div className="space-y-5">
      <Field id="moneyness" label="Strike" problem={problem("Strike")}>
        <Segmented id="moneyness" value={st.moneyness as string | undefined}
          onChange={(v) => update((x) => { if (!legs(x).length) x.legs = [{}]; legs(x)[0]!.strike = { method: "MONEYNESS", moneyness: v, ...(v === "ATM" ? { distance_pts: 0 } : {}) }; })}
          options={[{ value: "ATM", label: "At the money (ATM)" }, { value: "ITM", label: "In the money (ITM)" }, { value: "OTM", label: "Out of the money (OTM)" }]} />
      </Field>
      {(st.moneyness === "ITM" || st.moneyness === "OTM") && (
        <Field id="distance" label="Distance from the at-the-money strike (points)">
          <NumberInput label="Distance in points" min={interval} step={interval} value={st.distance_pts as number | undefined}
            onChange={(v) => update((x) => { (legs(x)[0]!.strike as AnyRec).distance_pts = v; })} />
        </Field>
      )}
      {ex && <p className="rounded-md bg-bg p-3 text-sm" data-testid="strike-example">{ex}</p>}
      <p className="text-xs text-ink-muted"><RichText text={`The [[atm-itm-otm|at-the-money]] strike is the index level rounded to the nearest ${interval} points.`} /></p>
    </div>
  );
}

type Mode = "conditions" | "time" | "time_if";

export function Entry({ draft, update, problem }: StepProps) {
  const s = draft.strategy as AnyRec;
  const entry = (s.entry ?? {}) as AnyRec;
  const ls = legs(s);
  const multi = ls.length > 1;
  const ot = ls[0]?.option_type as string | undefined;
  const hasCond = !!(entry.ce || entry.pe || entry.all_legs);
  const [mode, setMode] = useState<Mode | undefined>(entry.at_time ? (hasCond ? "time_if" : "time") : hasCond ? "conditions" : undefined);
  const [highlights, setHighlights] = useState<string[]>([]);
  const indicators = ((s.indicators ?? {}) as Record<string, AnyRec>);
  const sides: { key: "ce" | "pe" | "all_legs"; label: string }[] = multi
    ? [{ key: "all_legs", label: "Open all legs together when" }]
    : ot === "SIGNAL" ? [{ key: "ce", label: "Call when" }, { key: "pe", label: "Put when" }]
    : ot === "PE" ? [{ key: "pe", label: "Enter when" }] : [{ key: "ce", label: "Enter when" }];

  const chooseMode = (m: Mode) => {
    setMode(m);
    update((x) => {
      const e = ((x.entry ?? {}) as AnyRec);
      if (m === "time") { delete e.ce; delete e.pe; delete e.all_legs; }
      if (m === "conditions") delete e.at_time;
      if (m !== "time") for (const sd of sides) if (!e[sd.key]) e[sd.key] = { type: "all", conditions: [] };
      x.entry = e;
    });
  };
  const doMirror = () => {
    if (!entry.ce) return;
    if (entry.pe && !window.confirm("Replace the put conditions with a mirror of the call conditions?")) return;
    const r = mirror(entry.ce as AnyRec);
    setHighlights(r.needsReview);
    update((x) => { (x.entry as AnyRec).pe = r.tree; });
  };
  return (
    <div className="space-y-5">
      <Field id="entry_mode" label="When does a trade start?" problem={problem("Entry trigger")}>
        <div role="radiogroup" aria-labelledby="lbl-entry_mode" className="space-y-1 text-sm">
          {([["conditions", "When conditions are met"], ["time", "At a fixed time"], ["time_if", "At a fixed time, if conditions are met"]] as [Mode, string][])
            .map(([m, label]) => (
              <label key={m} className="flex items-center gap-2">
                <input type="radio" name="entry-mode" checked={mode === m} onChange={() => chooseMode(m)} disabled={ot === "SIGNAL" && m === "time"} />
                {label}{ot === "SIGNAL" && m === "time" && <span className="text-xs text-ink-muted">(needs conditions to choose call or put)</span>}
              </label>
            ))}
        </div>
      </Field>
      {(mode === "time" || mode === "time_if") && (
        <Field id="at_time" label="Entry time" problem={problem("Times")}>
          <TimeInput label="Entry time" value={entry.at_time as string | undefined} onChange={(v) => update((x) => { x.entry = { ...(x.entry as AnyRec), at_time: v }; })} />
        </Field>
      )}
      {(mode === "conditions" || mode === "time_if") && (
        <>
          <Field id="indicators" label="Indicators" problem={problem("Indicator settings")}>
            <IndicatorManager indicators={indicators} usedIds={usedIndicatorIds(entry)} onChange={(n) => update((x) => (x.indicators = n))} />
          </Field>
          <Field id="conditions" label="Conditions" problem={problem("Entry conditions")}>
            <div className="space-y-4">
              {sides.map((sd) => (
                <div key={sd.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{sd.label}</p>
                    {sd.key === "pe" && <Button variant="quiet" onClick={doMirror} disabled={!entry.ce}>Mirror from Call</Button>}
                  </div>
                  {sd.key === "pe" && highlights.length > 0 && <p className="mb-1 text-xs text-accent">Highlighted numbers were copied unchanged from the call side. Please check them.</p>}
                  <ConditionGroup node={(entry[sd.key] as AnyRec & { type: string }) ?? { type: "all", conditions: [] }} indicators={indicators}
                    highlights={sd.key === "pe" ? highlights : []}
                    onChange={(n) => {
                      if (sd.key === "pe") {
                        // A highlighted number stops being highlighted once the user edits it.
                        const before = entry.pe;
                        setHighlights((h) => h.filter((p) => JSON.stringify(getAt(n, p)) === JSON.stringify(getAt(before, p))));
                      }
                      update((x) => { x.entry = { ...(x.entry as AnyRec), [sd.key]: n }; });
                    }} />
                </div>
              ))}
            </div>
          </Field>
        </>
      )}
      {draft.hiddenPutSet !== undefined && <p className="text-xs text-ink-muted">Your put conditions are kept aside while option type is Call; switch back to Both to use them.</p>}
    </div>
  );
}

export function Exit({ draft, update, inst, problem }: StepProps) {
  const s = draft.strategy as AnyRec;
  const ex = (s.exit ?? {}) as AnyRec;
  const sl = (ex.stop_loss ?? {}) as AnyRec;
  const tgt = ex.target as AnyRec | undefined;
  const te = ex.time_exit as AnyRec | undefined;
  const adv = (s.advanced ?? {}) as AnyRec;
  const intraday = s.holding === "INTRADAY";
  const positional = s.holding === "POSITIONAL";
  const multi = legs(s).length > 1;
  const setExit = (fn: (e: AnyRec) => void) => update((x) => { const e = { ...((x.exit ?? {}) as AnyRec) }; fn(e); x.exit = e; });
  const needsQuestion = positional && !tgt && !te && !ex.hold_to_expiry && adv.exit_after_candles === undefined && draft.pendingExit !== "CANDLES";
  return (
    <div className="space-y-5">
      <Field id="stop_loss" label={multi ? "Stop-loss (combined position)" : "Stop-loss"} problem={problem("Stop-loss")}>
        {sl.type === "TRIGGER_CANDLE" ? <p className="text-sm">Trigger candle&apos;s low (bought) / high (sold), set under Advanced options.</p> : (
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Stop-loss type" className="rounded-md border border-line px-2 py-1 text-sm" value={(sl.type as string) ?? ""} onChange={(e) => setExit((x) => (x.stop_loss = e.target.value ? { type: e.target.value, value: sl.value } : undefined))}>
              <option value="">Choose…</option>
              <option value="PCT_PREMIUM">% of premium</option>
              <option value="POINTS">Premium points</option>
            </select>
            {!!sl.type && <NumberInput label="Stop-loss value" min={0.05} value={sl.value as number | undefined} onChange={(v) => setExit((x) => (x.stop_loss = { ...sl, value: v }))} />}
          </div>
        )}
        {multi && <p className="mt-1 text-xs text-ink-muted">With several legs, the stop-loss and target apply to the combined position: all legs close together.</p>}
      </Field>
      <Field id="target" label="Target (optional)" problem={problem("Target")}>
        {tgt?.type === "RR" ? <p className="text-sm">Risk-reward target, set under Advanced options.</p> : (
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Target type" className="rounded-md border border-line px-2 py-1 text-sm" value={(tgt?.type as string) ?? ""} onChange={(e) => setExit((x) => { if (e.target.value) x.target = { type: e.target.value, value: tgt?.value }; else delete x.target; })}>
              <option value="">No target</option>
              <option value="PCT_PREMIUM">% of premium</option>
              <option value="POINTS">Premium points</option>
            </select>
            {!!tgt?.type && <NumberInput label="Target value" min={0.05} value={tgt.value as number | undefined} onChange={(v) => setExit((x) => (x.target = { ...tgt, value: v }))} />}
          </div>
        )}
      </Field>
      <Field id="time_exit" label="Time exit (optional)" problem={problem("Exit rule")}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={!!te} onChange={(e) => setExit((x) => { if (e.target.checked) x.time_exit = { on: "ENTRY_DAY" }; else delete x.time_exit; })} /> Exit at a set time</label>
          {te && (
            <>
              <TimeInput label="Exit time" value={te.at as string | undefined} onChange={(v) => setExit((x) => (x.time_exit = { ...te, at: v }))} />
              {positional && (
                <select aria-label="Exit day" className="rounded-md border border-line px-2 py-1" value={te.on as string} onChange={(e) => setExit((x) => (x.time_exit = { ...te, on: e.target.value }))}>
                  <option value="ENTRY_DAY">on the entry day</option>
                  <option value="EXPIRY_DAY">on expiry day</option>
                </select>
              )}
            </>
          )}
        </div>
      </Field>
      {intraday && <Callout tone="info">Intraday positions close at {inst?.intraday_squareoff ?? "15:15"}, so the square-off already counts as the time exit. Only the stop-loss is required.</Callout>}
      {positional && (needsQuestion || ex.hold_to_expiry || draft.pendingExit === "CANDLES" || adv.exit_after_candles !== undefined) && (
        <Field id="positional_exit" label="Your strategy has no target or time exit. What should happen to an open position?" problem={problem("Exit rule")}>
          <div role="radiogroup" aria-labelledby="lbl-positional_exit" className="space-y-1 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="pexit" checked={!!ex.hold_to_expiry} onChange={() => update((x, d) => { (x.exit as AnyRec).hold_to_expiry = true; delete d.pendingExit; })} />Hold until expiry (settled at expiry)</label>
            <label className="flex items-center gap-2"><input type="radio" name="pexit" checked={false} onChange={() => update((x) => { const e = x.exit as AnyRec; delete e.hold_to_expiry; e.time_exit = { on: "EXPIRY_DAY" }; })} />Exit at a set time on expiry day</label>
            <label className="flex items-center gap-2"><input type="radio" name="pexit" checked={false} onChange={() => update((x) => { const e = x.exit as AnyRec; delete e.hold_to_expiry; e.target = { type: "PCT_PREMIUM" }; })} />Set a target</label>
            <label className="flex items-center gap-2"><input type="radio" name="pexit" checked={draft.pendingExit === "CANDLES" || adv.exit_after_candles !== undefined} onChange={() => update((x, d) => { delete (x.exit as AnyRec).hold_to_expiry; d.pendingExit = "CANDLES"; })} />Exit after a number of candles</label>
          </div>
          {(draft.pendingExit === "CANDLES" || adv.exit_after_candles !== undefined) && (
            <label className="mt-2 block text-sm">Exit after <NumberInput label="Candles" min={1} max={500} step={1} className="w-20" value={adv.exit_after_candles as number | undefined}
              onChange={(v) => update((x, d) => { x.advanced = { ...((x.advanced ?? {}) as AnyRec), exit_after_candles: v }; if (v === undefined) delete (x.advanced as AnyRec).exit_after_candles; else delete d.pendingExit; })} /> candles</label>
          )}
        </Field>
      )}
    </div>
  );
}


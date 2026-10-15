"use client";
// Advanced options (feature 03 design §1.9, §1.10; REQ-INP-18…20). Every switch starts OFF; turning
// one on reveals EMPTY required fields; turning it off removes it from the draft.
import * as Switch from "@radix-ui/react-switch";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/ui/Glossary";
import { FIELD_TOOLTIPS, type BuilderFieldId } from "@/copy/tooltips";
import type { Draft } from "@/strategy/draft";
import { NumberInput, TimeInput } from "./fields";
import type { StepProps } from "./steps";

type AnyRec = Record<string, unknown>;

export const ADVANCED_KEYS = [
  "sl_cap", "trigger_candle_sl", "rr_target", "trail_to_cost", "exit_after_candles", "vix_sizing",
  "entry_windows", "no_entry_windows", "expiry_day_cutoff", "daily_limits", "multiple_legs", "strike_by_delta_premium",
] as const;
export type AdvancedKey = (typeof ADVANCED_KEYS)[number];

const LABELS: Record<AdvancedKey, string> = {
  sl_cap: "SL cap", trigger_candle_sl: "Trigger-candle stop-loss", rr_target: "Risk-reward target",
  trail_to_cost: "Trail stop to cost", exit_after_candles: "Exit after N candles", vix_sizing: "Volatility (VIX) sizing",
  entry_windows: "Entry windows", no_entry_windows: "No-entry windows", expiry_day_cutoff: "Expiry-day cutoff",
  daily_limits: "Daily limits", multiple_legs: "Multiple legs", strike_by_delta_premium: "Strike by delta or premium",
};

/** Whether an option is present in the strategy itself. */
export function isUsed(s: AnyRec, k: AdvancedKey): boolean {
  const adv = (s.advanced ?? {}) as AnyRec;
  const ex = (s.exit ?? {}) as AnyRec;
  const ls = (s.legs as AnyRec[] | undefined) ?? [];
  switch (k) {
    case "sl_cap": return "sl_cap_pts" in adv;
    case "trigger_candle_sl": return (ex.stop_loss as AnyRec | undefined)?.type === "TRIGGER_CANDLE";
    case "rr_target": return (ex.target as AnyRec | undefined)?.type === "RR";
    case "trail_to_cost": return "trail_to_cost_at_r" in adv;
    case "exit_after_candles": return "exit_after_candles" in adv;
    case "vix_sizing": return "vix_sizing" in adv;
    case "entry_windows": return "entry_windows" in adv;
    case "no_entry_windows": return "no_entry_windows" in adv;
    case "expiry_day_cutoff": return "expiry_day_cutoff" in adv;
    case "daily_limits": return "daily" in adv;
    case "multiple_legs": return ls.length > 1;
    case "strike_by_delta_premium": return ls.some((l) => ["DELTA", "PREMIUM"].includes(String((l.strike as AnyRec | undefined)?.method)));
  }
}

/** Switched on but still missing a value (blocks "Review strategy", REQ-INP-18). */
export function advancedIncomplete(d: Draft): string[] {
  const s = d.strategy as AnyRec;
  const adv = (s.advanced ?? {}) as AnyRec;
  const ex = (s.exit ?? {}) as AnyRec;
  const on = new Set(d.advancedOn ?? []);
  const out: string[] = [];
  const empty = (v: unknown) => v === undefined || v === null || (typeof v === "number" && Number.isNaN(v));
  if (on.has("sl_cap") && empty(adv.sl_cap_pts)) out.push(LABELS.sl_cap);
  if (on.has("rr_target") && empty((ex.target as AnyRec | undefined)?.value)) out.push(LABELS.rr_target);
  if (on.has("trail_to_cost") && empty(adv.trail_to_cost_at_r)) out.push(LABELS.trail_to_cost);
  if (on.has("exit_after_candles") && empty(adv.exit_after_candles)) out.push(LABELS.exit_after_candles);
  if (on.has("vix_sizing")) {
    const vs = adv.vix_sizing as AnyRec | undefined;
    if (!vs?.measured_at || !(vs.bands as AnyRec[] | undefined)?.length || (vs.bands as AnyRec[]).some((b) => empty(b.size_pct))) out.push(LABELS.vix_sizing);
  }
  for (const k of ["entry_windows", "no_entry_windows"] as const) {
    if (on.has(k) && ((adv[k] as AnyRec[] | undefined) ?? []).some((w) => !w.from || !w.to)) out.push(LABELS[k]);
    if (on.has(k) && !((adv[k] as AnyRec[] | undefined)?.length)) out.push(LABELS[k]);
  }
  if (on.has("expiry_day_cutoff") && !adv.expiry_day_cutoff) out.push(LABELS.expiry_day_cutoff);
  if (on.has("daily_limits")) {
    const dl = (adv.daily ?? {}) as AnyRec;
    if (!["max_trades", "stop_after_sl_hits", "max_daily_loss_rupees"].some((k) => !empty(dl[k]))) out.push(LABELS.daily_limits);
  }
  if (on.has("strike_by_delta_premium")) {
    const ls = (s.legs as AnyRec[] | undefined) ?? [];
    if (ls.some((l) => { const st = (l.strike ?? {}) as AnyRec; return (st.method === "DELTA" && empty(st.target_delta)) || (st.method === "PREMIUM" && empty(st.target_premium)); })) out.push(LABELS.strike_by_delta_premium);
  }
  return out;
}

function Row({ k, on, toggle, children }: { k: AdvancedKey; on: boolean; toggle: (v: boolean) => void; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-line p-3" data-advanced={k}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center text-sm font-medium" id={`adv-${k}`}>{LABELS[k]}<InfoTip label={LABELS[k]} text={FIELD_TOOLTIPS[k as BuilderFieldId]} /></span>
        <Switch.Root checked={on} onCheckedChange={toggle} aria-labelledby={`adv-${k}`}
          className="relative h-6 w-11 rounded-full bg-line data-[state=checked]:bg-brand">
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-surface shadow transition-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>
      {on && children && <div className="mt-3 space-y-2 text-sm">{children}</div>}
    </div>
  );
}

function Windows({ list, onChange, label }: { list: AnyRec[]; onChange: (l: AnyRec[]) => void; label: string }) {
  return (
    <div className="space-y-2">
      {list.map((w, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <TimeInput label={`${label} ${i + 1} from`} value={w.from as string | undefined} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, from: v } : x)))} />
          <span>to</span>
          <TimeInput label={`${label} ${i + 1} to`} value={w.to as string | undefined} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, to: v } : x)))} />
          <button type="button" className="text-xs text-risk underline" onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      {list.length < 6 && <Button variant="secondary" onClick={() => onChange([...list, {}])}>Add window</Button>}
    </div>
  );
}

export function Advanced({ draft, update, setDraft, problem }: StepProps) {
  const s = draft.strategy as AnyRec;
  const adv = (s.advanced ?? {}) as AnyRec;
  const ex = (s.exit ?? {}) as AnyRec;
  const ls = (s.legs as AnyRec[] | undefined) ?? [];
  const on = new Set(draft.advancedOn ?? ADVANCED_KEYS.filter((k) => isUsed(s, k)));
  const setAdv = (key: string, v: unknown) => update((x) => {
    const a = { ...((x.advanced ?? {}) as AnyRec) };
    if (v === undefined) delete a[key];
    else a[key] = v;
    if (Object.keys(a).length) x.advanced = a;
    else delete x.advanced;
  });

  const toggle = (k: AdvancedKey, value: boolean) => {
    const next = new Set(on);
    if (value) next.add(k);
    else next.delete(k);
    const d: Draft = JSON.parse(JSON.stringify(draft));
    d.advancedOn = [...next];
    const st = d.strategy as AnyRec;
    const a = { ...((st.advanced ?? {}) as AnyRec) };
    const e = { ...((st.exit ?? {}) as AnyRec) };
    const legs = ((st.legs as AnyRec[] | undefined) ?? []).map((l) => ({ ...l }));
    if (!value) {
      // Switching off removes the option (type switches return to "not chosen", so the user picks again).
      const map: Partial<Record<AdvancedKey, string>> = { sl_cap: "sl_cap_pts", trail_to_cost: "trail_to_cost_at_r", exit_after_candles: "exit_after_candles", vix_sizing: "vix_sizing", entry_windows: "entry_windows", no_entry_windows: "no_entry_windows", expiry_day_cutoff: "expiry_day_cutoff", daily_limits: "daily" };
      if (map[k]) delete a[map[k]!];
      if (k === "trigger_candle_sl") delete e.stop_loss;
      if (k === "rr_target") delete e.target;
      if (k === "multiple_legs") st.legs = legs.slice(0, 1);
      if (k === "strike_by_delta_premium") legs.forEach((l) => { const m = (l.strike as AnyRec | undefined)?.method; if (m === "DELTA" || m === "PREMIUM") delete l.strike; });
    } else {
      if (k === "trigger_candle_sl") e.stop_loss = { type: "TRIGGER_CANDLE" };
      if (k === "rr_target") e.target = { type: "RR" };
      if (k === "vix_sizing") a.vix_sizing = { bands: [{}] };
      if (k === "entry_windows" || k === "no_entry_windows") a[k] = [{}];
      if (k === "daily_limits") a.daily = {};
      if (k === "multiple_legs") {
        const first = { ...(legs[0] ?? {}) };
        if (first.option_type === "SIGNAL") delete first.option_type;
        const entry = (st.entry ?? {}) as AnyRec;
        delete entry.ce; delete entry.pe;
        st.entry = entry;
        st.legs = [first, { action: first.action, expiry: first.expiry }];
      }
      if (k === "strike_by_delta_premium") legs.forEach((l) => (l.strike = { method: "DELTA" }));
    }
    if (k !== "multiple_legs") st.legs = legs.length ? legs : st.legs;
    if (Object.keys(a).length) st.advanced = a; else delete st.advanced;
    st.exit = e;
    setDraft(d);
  };

  const vs = (adv.vix_sizing ?? {}) as AnyRec;
  const bands = (vs.bands as AnyRec[] | undefined) ?? [];
  const daily = (adv.daily ?? {}) as AnyRec;
  const setDaily = (key: string, v: number | undefined) => {
    const d = { ...daily };
    if (v === undefined) delete d[key]; else d[key] = v;
    setAdv("daily", d);
  };
  const setLeg = (i: number, patch: AnyRec) => update((x) => { const l = (x.legs as AnyRec[]).map((y) => ({ ...y })); l[i] = { ...l[i], ...patch }; x.legs = l; });
  const strikeEditor = (l: AnyRec, i: number) => {
    const st = (l.strike ?? {}) as AnyRec;
    if (on.has("strike_by_delta_premium")) {
      return (
        <span className="flex flex-wrap items-center gap-2">
          <select aria-label={`Leg ${i + 1} strike by`} className="rounded-md border border-line px-2 py-1" value={(st.method as string) ?? "DELTA"} onChange={(e) => setLeg(i, { strike: { method: e.target.value } })}>
            <option value="DELTA">delta</option><option value="PREMIUM">premium</option>
          </select>
          {st.method === "PREMIUM"
            ? <NumberInput label={`Leg ${i + 1} target premium`} min={0.05} value={st.target_premium as number | undefined} onChange={(v) => setLeg(i, { strike: { method: "PREMIUM", target_premium: v } })} />
            : <NumberInput label={`Leg ${i + 1} target delta`} min={0.01} max={0.99} step={0.01} value={st.target_delta as number | undefined} onChange={(v) => setLeg(i, { strike: { method: "DELTA", target_delta: v } })} />}
        </span>
      );
    }
    return (
      <span className="flex flex-wrap items-center gap-2">
        <select aria-label={`Leg ${i + 1} strike`} className="rounded-md border border-line px-2 py-1" value={(st.moneyness as string) ?? ""} onChange={(e) => setLeg(i, { strike: { method: "MONEYNESS", moneyness: e.target.value || undefined, ...(e.target.value === "ATM" ? { distance_pts: 0 } : {}) } })}>
          <option value="">Strike…</option><option value="ATM">ATM</option><option value="ITM">ITM</option><option value="OTM">OTM</option>
        </select>
        {(st.moneyness === "ITM" || st.moneyness === "OTM") && <NumberInput label={`Leg ${i + 1} distance`} min={50} step={50} className="w-24" value={st.distance_pts as number | undefined} onChange={(v) => setLeg(i, { strike: { ...st, distance_pts: v } })} />}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">Every option is off unless you switch it on. Nothing is filled in for you.</p>
      {problem("Advanced options") && <p className="text-xs text-risk" role="alert">{problem("Advanced options")}</p>}
      <Row k="sl_cap" on={on.has("sl_cap")} toggle={(v) => toggle("sl_cap", v)}>
        <label>Stop no more than <NumberInput label="SL cap points" min={0.05} value={adv.sl_cap_pts as number | undefined} onChange={(v) => setAdv("sl_cap_pts", v)} /> premium points from entry</label>
      </Row>
      <Row k="trigger_candle_sl" on={on.has("trigger_candle_sl")} toggle={(v) => toggle("trigger_candle_sl", v)}>
        <p>The stop sits at the signal candle&apos;s lowest (bought) or highest (sold) modelled premium. Needs an entry signal candle, not a fixed time alone.</p>
      </Row>
      <Row k="rr_target" on={on.has("rr_target")} toggle={(v) => toggle("rr_target", v)}>
        <label>Target at <NumberInput label="Risk-reward multiple" min={0.1} max={20} value={(ex.target as AnyRec | undefined)?.value as number | undefined} onChange={(v) => update((x) => { (x.exit as AnyRec).target = { type: "RR", value: v }; })} /> × the stop distance</label>
      </Row>
      <Row k="trail_to_cost" on={on.has("trail_to_cost")} toggle={(v) => toggle("trail_to_cost", v)}>
        <label>Move the stop to the entry price after a gain of <NumberInput label="Trail multiple" min={0.1} max={20} value={adv.trail_to_cost_at_r as number | undefined} onChange={(v) => setAdv("trail_to_cost_at_r", v)} /> × the initial risk</label>
      </Row>
      <Row k="exit_after_candles" on={on.has("exit_after_candles")} toggle={(v) => toggle("exit_after_candles", v)}>
        <label>Exit after <NumberInput label="Candles" min={1} max={500} step={1} value={adv.exit_after_candles as number | undefined} onChange={(v) => setAdv("exit_after_candles", v)} /> candles if no stop or target is hit</label>
      </Row>
      <Row k="vix_sizing" on={on.has("vix_sizing")} toggle={(v) => toggle("vix_sizing", v)}>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1"><input type="radio" name="vix-at" checked={vs.measured_at === "DAY_OPEN"} onChange={() => setAdv("vix_sizing", { ...vs, measured_at: "DAY_OPEN" })} />VIX at the day&apos;s open</label>
          <label className="flex items-center gap-1"><input type="radio" name="vix-at" checked={vs.measured_at === "ENTRY"} onChange={() => setAdv("vix_sizing", { ...vs, measured_at: "ENTRY" })} />VIX at entry</label>
        </div>
        {bands.map((b, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span>From</span><NumberInput label={`Band ${i + 1} from`} min={0} className="w-20" value={b.vix_from as number | undefined} onChange={(v) => setAdv("vix_sizing", { ...vs, bands: bands.map((x, j) => (j === i ? { ...x, vix_from: v } : x)) })} />
            <span>to</span><NumberInput label={`Band ${i + 1} to`} min={0} className="w-20" value={b.vix_to as number | undefined} onChange={(v) => setAdv("vix_sizing", { ...vs, bands: bands.map((x, j) => (j === i ? { ...x, vix_to: v } : x)) })} />
            <span>trade</span><NumberInput label={`Band ${i + 1} size`} min={1} className="w-20" value={b.size_pct as number | undefined} onChange={(v) => setAdv("vix_sizing", { ...vs, bands: bands.map((x, j) => (j === i ? { ...x, size_pct: v } : x)) })} /><span>% of the lots</span>
            <button type="button" className="text-xs text-risk underline" onClick={() => setAdv("vix_sizing", { ...vs, bands: bands.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
        {bands.length < 6 && <Button variant="secondary" onClick={() => setAdv("vix_sizing", { ...vs, bands: [...bands, {}] })}>Add band</Button>}
        <p className="text-xs text-ink-muted">Leave &ldquo;from&rdquo; empty on the lowest band and &ldquo;to&rdquo; empty on the highest. Bands must cover every VIX level with no gaps.</p>
        {problem("Volatility sizing") && <p className="text-xs text-risk" role="alert">{problem("Volatility sizing")}</p>}
      </Row>
      <Row k="entry_windows" on={on.has("entry_windows")} toggle={(v) => toggle("entry_windows", v)}>
        <Windows label="Entry window" list={(adv.entry_windows as AnyRec[] | undefined) ?? []} onChange={(l) => setAdv("entry_windows", l)} />
      </Row>
      <Row k="no_entry_windows" on={on.has("no_entry_windows")} toggle={(v) => toggle("no_entry_windows", v)}>
        <Windows label="No-entry window" list={(adv.no_entry_windows as AnyRec[] | undefined) ?? []} onChange={(l) => setAdv("no_entry_windows", l)} />
      </Row>
      <Row k="expiry_day_cutoff" on={on.has("expiry_day_cutoff")} toggle={(v) => toggle("expiry_day_cutoff", v)}>
        <label>No new entries on expiry day from <TimeInput label="Expiry-day cutoff" value={adv.expiry_day_cutoff as string | undefined} onChange={(v) => setAdv("expiry_day_cutoff", v)} /></label>
      </Row>
      <Row k="daily_limits" on={on.has("daily_limits")} toggle={(v) => toggle("daily_limits", v)}>
        <label className="block">At most <NumberInput label="Max trades a day" min={1} max={100} step={1} className="w-20" value={daily.max_trades as number | undefined} onChange={(v) => setDaily("max_trades", v)} /> trades a day</label>
        <label className="block">Stop for the day after <NumberInput label="Stop-loss hits" min={1} max={100} step={1} className="w-20" value={daily.stop_after_sl_hits as number | undefined} onChange={(v) => setDaily("stop_after_sl_hits", v)} /> stop-losses</label>
        <label className="block">Stop for the day after a loss of ₹ <NumberInput label="Max daily loss" min={1} value={daily.max_daily_loss_rupees as number | undefined} onChange={(v) => setDaily("max_daily_loss_rupees", v)} /></label>
        <p className="text-xs text-ink-muted">Fill in at least one.</p>
      </Row>
      <Row k="multiple_legs" on={on.has("multiple_legs")} toggle={(v) => toggle("multiple_legs", v)}>
        <p className="text-xs text-ink-muted">All legs open together on the same expiry (from Basics) at a fixed time or when the conditions are met. The stop-loss and target apply to the combined position.</p>
        {ls.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2" data-testid={`leg-${i}`}>
            <span className="font-medium">Leg {i + 1}</span>
            <select aria-label={`Leg ${i + 1} buy or sell`} className="rounded-md border border-line px-2 py-1" value={(l.action as string) ?? ""} onChange={(e) => setLeg(i, { action: e.target.value || undefined })}>
              <option value="">Buy/sell…</option><option value="BUY">Buy</option><option value="SELL">Sell</option>
            </select>
            <select aria-label={`Leg ${i + 1} call or put`} className="rounded-md border border-line px-2 py-1" value={(l.option_type as string) ?? ""} onChange={(e) => setLeg(i, { option_type: e.target.value || undefined })}>
              <option value="">Call/put…</option><option value="CE">Call</option><option value="PE">Put</option>
            </select>
            {strikeEditor(l, i)}
            {ls.length > 2 && <button type="button" className="text-xs text-risk underline" onClick={() => update((x) => (x.legs = (x.legs as AnyRec[]).filter((_, j) => j !== i)))}>Remove</button>}
          </div>
        ))}
        {ls.length < 4 && <Button variant="secondary" onClick={() => update((x) => (x.legs = [...(x.legs as AnyRec[]), { action: undefined, expiry: (ls[0]?.expiry as string | undefined) }]))}>Add leg</Button>}
        {problem("Legs") && <p className="text-xs text-risk" role="alert">{problem("Legs")}</p>}
      </Row>
      <Row k="strike_by_delta_premium" on={on.has("strike_by_delta_premium")} toggle={(v) => toggle("strike_by_delta_premium", v)}>
        {ls.length <= 1 ? strikeEditor(ls[0] ?? {}, 0) : <p>Set per leg under Multiple legs.</p>}
      </Row>
    </div>
  );
}

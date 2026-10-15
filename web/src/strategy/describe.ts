// describeStrategy: the strategy as Rule / Setting / What it means rows (frontend.md §6; REQ-INP-02).
// Fixed sentence patterns for every schema element; every advanced option has a "used" line or
// "Not used". Works on partial drafts too (missing parts read "Not set yet"). No internal key ever
// reaches the output: a unit test checks every node type.
import advancedOptions from "@/generated/advanced-options.json";
import type { InstrumentSummary } from "@/api/types";
import { points, rupees } from "@/lib/format";
import type { StepId } from "./completeness";

type AnyRec = Record<string, unknown>;

export interface TextNode {
  text: string;
  children?: TextNode[];
}

export interface RuleLine {
  key: string; // stable row key (also the template override key)
  rule: string;
  setting: string;
  meaning: string;
  tree?: TextNode[]; // nested condition text, rendered as bullets
  step: StepId; // builder step for the Edit link
  used?: boolean; // advanced rows only
  advanced?: boolean;
}

export const NOT_SET = "Not set yet";
export const NOT_USED = "Not used";

const OUTPUT_NAMES: Record<string, string> = {
  signal: "signal line",
  hist: "histogram",
  upper: "upper band",
  middle: "middle band",
  lower: "lower band",
  plus_di: "+DI",
  minus_di: "−DI",
  high: "high",
  low: "low",
  p: "P",
  tc: "TC",
  bc: "BC",
  r1: "R1",
  r2: "R2",
  r3: "R3",
  s1: "S1",
  s2: "S2",
  s3: "S3",
  cpr_width: "CPR width",
  cpr_width_pct: "CPR width %",
};

const PRICE: Record<string, string> = { open: "Open", high: "High", low: "Low", close: "Close" };

export function indicatorName(ind: AnyRec | undefined): string {
  if (!ind) return "an indicator that isn't set up";
  const t = ind.type as string;
  const p = (k: string) => (ind[k] === undefined || ind[k] === null ? "?" : String(ind[k]));
  const src = (ind.source as string | undefined) ?? "price not set";
  switch (t) {
    case "EMA":
    case "SMA":
      return `${t} ${p("period")} (${src})`;
    case "RSI":
    case "ADX":
      return `${t} ${p("period")}`;
    case "SUPERTREND":
      return `Supertrend ${p("period")} × ${p("multiplier")}`;
    case "MACD":
      return `MACD ${p("fast")}/${p("slow")}/${p("signal")}`;
    case "BBANDS":
      return `Bollinger ${p("period")}, ${p("stddev")} SD (${src})`;
    case "OPENING_RANGE":
      return `Opening range ${p("minutes")} min`;
    case "PIVOTS":
      return "Pivots";
    default:
      return "an indicator";
  }
}

interface Ctx {
  indicators: Record<string, AnyRec>;
  volName: string;
}

function operandText(o: AnyRec | undefined, ctx: Ctx): string {
  if (!o) return NOT_SET.toLowerCase();
  let base: string;
  if ("ind" in o) {
    const ind = ctx.indicators[o.ind as string];
    const name = indicatorName(ind);
    const out = o.output as string;
    if (ind?.type === "ADX" && (out === "plus_di" || out === "minus_di")) base = `${OUTPUT_NAMES[out]} ${ind.period ?? "?"}`;
    else base = out && out !== "value" ? `${name} ${OUTPUT_NAMES[out] ?? out}` : name;
  } else if ("price" in o) base = `${PRICE[o.price as string] ?? "Price"}`;
  else if ("vix" in o) base = `${ctx.volName} (${o.vix === "open" ? "open" : "close"})`;
  else if ("candle" in o) base = o.candle === "body" ? "Candle body" : "Candle range";
  else base = Number.isFinite(o.const) ? points(Number(o.const)) : "(number not set yet)";
  const off = o.offset as AnyRec | undefined;
  if (off && "pts" in off) {
    const v = Number(off.pts);
    base += !Number.isFinite(v) ? " + (margin not set yet)" : v >= 0 ? ` + ${points(v)} points` : ` − ${points(-v)} points`;
  } else if (off && "pct" in off) {
    const v = Number(off.pct);
    base += !Number.isFinite(v) ? " + (margin not set yet)" : v >= 0 ? ` + ${points(v)}%` : ` − ${points(-v)}%`;
  }
  return base;
}

const CMP: Record<string, string> = { gt: "is above", gte: "is at or above", lt: "is below", lte: "is at or below" };

/** An index level per side, e.g. "Pivots R2 (calls) / Pivots S2 (puts)". */
export function levelsText(spec: AnyRec, ctx: Ctx): string {
  const parts = (["ce", "pe"] as const).filter((k) => spec[k]).map((k) => `${operandText(spec[k] as AnyRec, ctx)} (${k === "ce" ? "calls" : "puts"})`);
  return parts.length ? parts.join(" / ") : "level not set yet";
}

export function conditionText(node: AnyRec | undefined, ctx: Ctx): TextNode {
  if (!node) return { text: NOT_SET };
  const t = node.type as string;
  if (t === "all" || t === "any") {
    return {
      text: t === "all" ? "All of these:" : "Any of these:",
      children: ((node.conditions as AnyRec[] | undefined) ?? []).map((c) => conditionText(c, ctx)),
    };
  }
  if (t === "compare") {
    return { text: `${operandText(node.left as AnyRec, ctx)} ${CMP[node.op as string] ?? "compared with"} ${operandText(node.right as AnyRec, ctx)}` };
  }
  if (t === "cross") {
    return { text: `${operandText(node.left as AnyRec, ctx)} crosses ${node.direction === "below" ? "below" : "above"} ${operandText(node.right as AnyRec, ctx)}` };
  }
  if (t === "state" || t === "turns") {
    const ind = indicatorName(ctx.indicators[node.ind as string]);
    const dir = (t === "state" ? node.is : node.to) === "up" ? "green" : "red";
    return { text: t === "state" ? `${ind} is ${dir}` : `${ind} turns ${dir}` };
  }
  if (t === "slope") {
    const n = Number(node.lookback ?? 1);
    return {
      text: `${operandText(node.operand as AnyRec, ctx)} is ${node.direction === "down" ? "falling" : "rising"} (vs ${n} candle${n === 1 ? "" : "s"} ago)`,
    };
  }
  return { text: "A condition" };
}

/** Flatten a TextNode tree into indented lines (PDF, plain text). */
export function treeLines(nodes: TextNode[], depth = 0): string[] {
  return nodes.flatMap((n) => [`${"  ".repeat(depth)}• ${n.text}`, ...treeLines(n.children ?? [], depth + 1)]);
}

function timeframeText(m: unknown): string {
  if (m === undefined || m === null) return NOT_SET;
  const v = Number(m);
  if (v < 60) return `${v}-minute candles`;
  return v === 60 ? "1-hour candles" : `${v / 60}-hour candles`;
}

const EXPIRY: Record<string, [string, string]> = {
  CURRENT_WEEKLY: ["Current weekly", "The nearest weekly contract on or after the trade date"],
  NEXT_WEEKLY: ["Next weekly", "The weekly contract after the nearest one"],
  MONTHLY: ["Monthly", "The nearest monthly contract on or after the trade date"],
};

function legText(leg: AnyRec): string {
  const action = leg.action === "SELL" ? "Sell" : leg.action === "BUY" ? "Buy" : "Buy/sell not set";
  const ot = leg.option_type === "CE" ? "call" : leg.option_type === "PE" ? "put" : leg.option_type === "SIGNAL" ? "call or put" : "option";
  return `${action} ${ot}, ${strikeText((leg.strike ?? {}) as AnyRec)}`;
}

function strikeText(st: AnyRec): string {
  if (st.method === "DELTA") return `strike with delta near ${st.target_delta ?? "?"}`;
  if (st.method === "PREMIUM") return `strike with premium near ${st.target_premium !== undefined ? rupees(Number(st.target_premium), 2) : "?"}`;
  if (st.moneyness === "ATM") return "at the money";
  if (st.moneyness === "ITM" || st.moneyness === "OTM") {
    return st.distance_pts !== undefined ? `${points(Number(st.distance_pts))} points ${st.moneyness}` : `${st.moneyness} (distance not set yet)`;
  }
  return "strike not set yet";
}

function windowsText(ws: { from: string; to: string }[]): string {
  return ws.map((w) => `${w.from}–${w.to}`).join(", ");
}

export function describeStrategy(
  strategy: AnyRec,
  inst: InstrumentSummary | undefined,
  overrides: Record<string, string> = {},
): RuleLine[] {
  const s = strategy;
  const legs = ((s.legs as AnyRec[] | undefined) ?? []) as AnyRec[];
  const leg0 = legs[0] ?? {};
  const multi = legs.length > 1;
  const sq = inst?.intraday_squareoff ?? "15:15";
  const ctx: Ctx = { indicators: (s.indicators as Record<string, AnyRec> | undefined) ?? {}, volName: inst?.volatility_name ?? "India VIX" };
  const rows: RuleLine[] = [];
  const add = (r: RuleLine) => rows.push({ ...r, meaning: overrides[r.key] ?? r.meaning });

  add({ key: "instrument", rule: "Instrument", setting: s.underlying ? (inst?.name ?? String(s.underlying)) : NOT_SET, meaning: `Options on the ${inst?.name ?? "Nifty 50"} index`, step: "basics" });

  const bought = leg0.action === "BUY";
  add({
    key: "action", rule: "Trade",
    setting: multi ? `${legs.length} legs (see Multiple legs)` : leg0.action ? (bought ? "Buy options" : "Sell options") : NOT_SET,
    meaning: multi ? "Each leg's buy or sell is listed under Multiple legs" : bought ? "You pay the premium; the most you can lose is the premium" : leg0.action ? "You receive the premium; losses can be much larger than the premium" : "",
    step: "basics",
  });

  const ot = leg0.option_type;
  add({
    key: "option_type", rule: "Option type",
    setting: multi ? "Calls and puts as listed under Multiple legs" : ot === "CE" ? "Call (CE)" : ot === "PE" ? "Put (PE)" : ot === "SIGNAL" ? "Call on the call signal, put on the put signal" : NOT_SET,
    meaning: ot === "SIGNAL" ? "One option at a time: a call when the call conditions are met, a put when the put conditions are met" : ot === "CE" ? "A call gains when the index rises" : ot === "PE" ? "A put gains when the index falls" : "",
    step: "basics",
  });

  const st = (leg0.strike ?? {}) as AnyRec;
  const interval = inst?.strike_interval ?? 50;
  let strikeMeaning = "";
  if (st.moneyness === "ATM") strikeMeaning = `The strike nearest to the index level at the signal (rounded to ${interval} points)`;
  else if ((st.moneyness === "ITM" || st.moneyness === "OTM") && st.distance_pts !== undefined) {
    const d = points(Number(st.distance_pts));
    strikeMeaning = st.moneyness === "ITM" ? `Call ${d} below the at-the-money strike; put ${d} above` : `Call ${d} above the at-the-money strike; put ${d} below`;
  } else if (st.method === "DELTA") strikeMeaning = "The strike whose modelled delta is closest to the target";
  else if (st.method === "PREMIUM") strikeMeaning = "The strike whose modelled premium is closest to the target";
  add({ key: "strike", rule: "Strike", setting: multi ? "Per leg (see Multiple legs)" : leg0.strike ? strikeText(st) : NOT_SET, meaning: strikeMeaning, step: "strike" });

  const exp = EXPIRY[String(leg0.expiry)];
  add({ key: "expiry", rule: "Expiry", setting: exp?.[0] ?? NOT_SET, meaning: exp?.[1] ?? "", step: "basics" });
  add({ key: "timeframe", rule: "Chart", setting: timeframeText(s.timeframe_min), meaning: "Entry conditions are checked when each candle closes", step: "basics" });
  add({
    key: "holding", rule: "Holding",
    setting: s.holding === "INTRADAY" ? "Intraday" : s.holding === "POSITIONAL" ? "Positional" : NOT_SET,
    meaning: s.holding === "INTRADAY" ? `Closed by ${sq} the same day` : s.holding === "POSITIONAL" ? "Can be held overnight, up to the contract's expiry" : "",
    step: "basics",
  });
  const pos = (s.position ?? {}) as AnyRec;
  add({ key: "lots", rule: "Lots", setting: pos.lots !== undefined ? String(pos.lots) : NOT_SET, meaning: "Number of lots in every trade", step: "basics" });
  const qty = pos.lots !== undefined && pos.lot_size !== undefined ? Number(pos.lots) * Number(pos.lot_size) : null;
  add({
    key: "lot_size", rule: "Lot size", setting: pos.lot_size !== undefined ? String(pos.lot_size) : NOT_SET,
    meaning: qty !== null ? `${pos.lots} lot${pos.lots === 1 ? "" : "s"} × ${pos.lot_size} = ${qty} quantity per trade` : (inst?.lot_size_note ?? ""),
    step: "basics",
  });

  // Entry
  const entry = (s.entry ?? {}) as AnyRec;
  const tree: TextNode[] = [];
  const actionWord = bought ? "Buy" : "Sell";
  const heads: Record<string, string> = {
    ce: ot === "SIGNAL" ? `${actionWord} a call when` : "Enter when",
    pe: ot === "SIGNAL" ? `${actionWord} a put when` : "Enter when",
    all_legs: "Open all legs when",
  };
  for (const k of ["ce", "pe", "all_legs"]) {
    if (!entry[k]) continue;
    const node = entry[k] as AnyRec;
    const c = conditionText(node, ctx);
    tree.push(node.type === "all" ? { text: `${heads[k]} all of these are true:`, children: c.children } : { text: `${heads[k]}:`, children: [c] });
  }
  const hasCond = tree.length > 0;
  const at = entry.at_time as string | undefined;
  const entrySetting = at && hasCond ? `At ${at}, if the conditions below are met` : at ? `At ${at}` : hasCond ? "When the conditions below are met" : NOT_SET;
  add({
    key: "entry", rule: "Entry", setting: entrySetting,
    meaning: hasCond ? "A trade starts only when everything below is true at a candle close; it fills at the next minute's open" : at ? "A trade starts at this time each trading day" : "",
    tree: hasCond ? tree : undefined,
    step: "entry",
  });

  // Stop-loss
  const ex = (s.exit ?? {}) as AnyRec;
  const sl = ex.stop_loss as AnyRec | undefined;
  let slSetting = NOT_SET;
  let slMeaning = "";
  if (sl?.type === "PCT_PREMIUM") {
    const v = sl.value !== undefined ? Number(sl.value) : null;
    slSetting = v !== null ? `${points(v)}% of ${multi ? "the combined premium" : "premium"}` : "% of premium (value not set yet)";
    if (v !== null) {
      slMeaning = multi
        ? `All legs close together when the combined loss reaches ${points(v)}% of the combined premium`
        : bought ? `Bought at ₹100 → exit at ₹${points(100 - v)}` : `Sold at ₹100 → exit at ₹${points(100 + v)}`;
    }
  } else if (sl?.type === "POINTS") {
    const v = sl.value !== undefined ? Number(sl.value) : null;
    slSetting = v !== null ? `${points(v)} premium points${multi ? " (combined)" : ""}` : "Premium points (value not set yet)";
    if (v !== null) slMeaning = bought ? `Bought at ₹100 → exit at ₹${points(100 - v)}` : `Sold at ₹100 → exit at ₹${points(100 + v)}`;
  } else if (sl?.type === "TRIGGER_CANDLE") {
    slSetting = "Trigger candle's low (bought) / high (sold)";
    slMeaning = "The lowest (bought) or highest (sold) modelled premium during the signal candle";
  }
  add({ key: "stop_loss", rule: "Stop-loss", setting: slSetting, meaning: slMeaning, step: "exit" });

  // Exit rule
  const parts: string[] = [];
  const meanings: string[] = [];
  const tgt = ex.target as AnyRec | undefined;
  if (tgt?.type === "PCT_PREMIUM") {
    parts.push(tgt.value !== undefined ? `Target ${points(Number(tgt.value))}% of premium` : "Target % of premium (value not set yet)");
    if (tgt.value !== undefined && !multi) meanings.push(bought ? `Bought at ₹100 → exit at ₹${points(100 + Number(tgt.value))}` : `Sold at ₹100 → exit at ₹${points(100 - Number(tgt.value))}`);
  } else if (tgt?.type === "POINTS") parts.push(tgt.value !== undefined ? `Target ${points(Number(tgt.value))} premium points` : "Target in points (value not set yet)");
  else if (tgt?.type === "RR") parts.push(tgt.value !== undefined ? `Target ${points(Number(tgt.value))} × the stop distance` : "Risk-reward target (value not set yet)");
  else if (tgt?.type === "SPOT_LEVEL") parts.push(`Target when the index reaches ${levelsText(tgt, ctx)}`);
  if (ex.exit_when) parts.push("Exit when the exit conditions are met");
  const te = ex.time_exit as AnyRec | undefined;
  if (te) parts.push(te.at ? `Exit at ${te.at} on ${te.on === "EXPIRY_DAY" ? "expiry day" : "the entry day"}` : "Time exit (time not set yet)");
  if (ex.hold_to_expiry) {
    parts.push("Held until expiry");
    meanings.push("Settled at expiry value if nothing else closes it first");
  }
  const adv = (s.advanced ?? {}) as AnyRec;
  if (adv.exit_after_candles !== undefined) parts.push(`Exit after ${adv.exit_after_candles} candles`);
  if (s.holding === "INTRADAY") {
    parts.push(`Square-off at ${sq}`);
    meanings.push(`Any open position is closed at ${sq}`);
  }
  add({ key: "exit_rule", rule: "Exit rule", setting: parts.length ? parts.join("; ") : NOT_SET, meaning: meanings.join(". "), step: "exit" });

  // Advanced options: used first, then "Not used" (feature 02 design §1.1)
  const used: Record<string, string | null> = {
    sl_cap: adv.sl_cap_pts !== undefined ? `Stop no more than ${points(Number(adv.sl_cap_pts))} points from entry` : null,
    trigger_candle_sl: sl?.type === "TRIGGER_CANDLE" ? "Stop at the signal candle's premium low (bought) or high (sold)" : null,
    rr_target: tgt?.type === "RR" ? `Target at ${tgt.value !== undefined ? points(Number(tgt.value)) : "?"} × the stop distance` : null,
    trail_to_cost: adv.trail_to_cost_at_r !== undefined ? `Stop moves to the entry price after a gain of ${points(Number(adv.trail_to_cost_at_r))} × the initial risk`
      : adv.trail_to_cost_at_pts !== undefined ? `Stop moves to the entry price after a gain of ${points(Number(adv.trail_to_cost_at_pts))} points` : null,
    exit_after_candles: adv.exit_after_candles !== undefined ? `Exit after ${adv.exit_after_candles} candles if no stop or target is hit` : null,
    exit_conditions: ex.exit_when ? "Exit at the next minute's open when the exit conditions are true on a candle close" : null,
    index_target: tgt?.type === "SPOT_LEVEL" ? `Exit when the index reaches ${levelsText(tgt, ctx)}` : null,
    partial_exit: adv.partial_exit ? partialText(adv.partial_exit as AnyRec, ctx) : null,
    vix_sizing: adv.vix_sizing ? vixSizingText(adv.vix_sizing as AnyRec, ctx.volName) : null,
    entry_windows: Array.isArray(adv.entry_windows) && adv.entry_windows.length ? `New entries only ${windowsText(adv.entry_windows as { from: string; to: string }[])}` : null,
    no_entry_windows: Array.isArray(adv.no_entry_windows) && adv.no_entry_windows.length ? `No new entries ${windowsText(adv.no_entry_windows as { from: string; to: string }[])}` : null,
    expiry_day_cutoff: adv.expiry_day_cutoff ? `No new entries from ${adv.expiry_day_cutoff} on expiry day` : null,
    daily_limits: adv.daily ? dailyText(adv.daily as AnyRec) : null,
    multiple_legs: multi ? `${legs.length} legs, opened together with one combined stop-loss: ${legs.map(legText).join("; ")}` : null,
    strike_by_delta_premium: legs.some((l) => ["DELTA", "PREMIUM"].includes(String((l.strike as AnyRec | undefined)?.method))) ? legs.filter((l) => (l.strike as AnyRec | undefined)?.method !== "MONEYNESS").map(legText).join("; ") : null,
  };
  const options = (advancedOptions as { options: { key: string; label: string }[] }).options;
  const exitTree: TextNode[] = [];
  const exitHeads: Record<string, string> = { ce: "Exit a call when", pe: "Exit a put when", all_legs: "Exit when" };
  for (const [k, node] of Object.entries((ex.exit_when ?? {}) as Record<string, AnyRec>)) {
    const c = conditionText(node, ctx);
    exitTree.push(node.type === "all" ? { text: `${exitHeads[k]} all of these are true:`, children: c.children } : { text: `${exitHeads[k]}:`, children: [c] });
  }
  const STEP_OF: Record<string, StepId> = { exit_conditions: "exit", index_target: "exit" };
  const advRows = options.map((o) => ({
    key: o.key, rule: o.label, setting: used[o.key] ?? NOT_USED, meaning: used[o.key] ? "" : "", step: STEP_OF[o.key] ?? ("advanced" as StepId),
    used: used[o.key] !== null, advanced: true,
    ...(o.key === "exit_conditions" && exitTree.length ? { tree: exitTree } : {}),
  }));
  for (const r of [...advRows.filter((r) => r.used), ...advRows.filter((r) => !r.used)]) add(r);
  return rows;
}

function partialText(pe: AnyRec, ctx: Ctx): string {
  const w = (pe.when ?? {}) as AnyRec;
  let when = "(trigger not set yet)";
  if (w.type === "SPOT_LEVEL") when = `when the index reaches ${levelsText(w, ctx)}`;
  else if (w.type === "PREMIUM_GAIN") {
    const g = (w.gain ?? {}) as AnyRec;
    const v = g.value !== undefined ? points(Number(g.value)) : "?";
    when = `after a gain of ${v}${g.type === "PCT_PREMIUM" ? "% of the premium" : g.type === "RR" ? " × the initial risk" : " premium points"}`;
  }
  const then = pe.then_stop === "COST" ? "the rest's stop moves to the entry price"
    : pe.then_stop === "PARTIAL_CANDLE" ? "the rest exits if the index breaks back past that candle's low (or high)"
    : pe.then_stop === "UNCHANGED" ? "the rest keeps its exits" : "what happens to the rest is not set yet";
  return `Close ${pe.percent ?? "?"}% of the lots ${when}; ${then}`;
}

function vixSizingText(vs: AnyRec, vol: string): string {
  const bands = [...((vs.bands as AnyRec[] | undefined) ?? [])].sort((a, b) => Number(a.vix_from ?? 0) - Number(b.vix_from ?? 0));
  const parts = bands.map((b) => {
    const lo = b.vix_from as number | undefined;
    const hi = b.vix_to as number | undefined;
    const range = !lo ? (hi !== undefined ? `below ${points(hi)}` : "any level") : hi === undefined ? `${points(lo)} and above` : `${points(lo)}–${points(hi)}`;
    return `${range} → ${b.size_pct !== undefined ? points(Number(b.size_pct)) : "?"}% of the lots`;
  });
  return `${vol} measured ${vs.measured_at === "ENTRY" ? "at entry" : "at the day's open"}: ${parts.join("; ")} (rounded down, at least 1 lot)`;
}

function dailyText(d: AnyRec): string {
  const parts: string[] = [];
  if (d.max_trades !== undefined) parts.push(`at most ${d.max_trades} trade${d.max_trades === 1 ? "" : "s"} a day`);
  if (d.stop_after_sl_hits !== undefined) parts.push(`stop for the day after ${d.stop_after_sl_hits} stop-loss${d.stop_after_sl_hits === 1 ? "" : "es"}`);
  if (d.max_daily_loss_rupees !== undefined) parts.push(`stop for the day after a loss of ${rupees(Number(d.max_daily_loss_rupees))}`);
  const t = parts.join("; ");
  return t ? t[0]!.toUpperCase() + t.slice(1) : "Daily limits (values not set yet)";
}

// SEM-01…20 (contracts/strategy-rules.md), implemented identically to the engine's
// validation/semantic.py; the shared fixtures prove both sides agree (REQ-INP-03).
import type { InstrumentSummary, MetaResponse, Strategy } from "@/api/types";
import { day } from "@/lib/format";

export interface Problem {
  rule: string | null;
  field_label: string;
  message: string;
}

type Node = Record<string, unknown> & { type: string };
type AnyRec = Record<string, unknown>;

const OUTPUTS: Record<string, string[]> = {
  EMA: ["value"],
  SMA: ["value"],
  RSI: ["value"],
  ADX: ["value", "plus_di", "minus_di"],
  SUPERTREND: ["value"],
  MACD: ["value", "signal", "hist"],
  BBANDS: ["upper", "middle", "lower"],
  OPENING_RANGE: ["high", "low"],
  PIVOTS: ["p", "tc", "bc", "r1", "r2", "r3", "s1", "s2", "s3", "cpr_width", "cpr_width_pct"],
};

/** Every SPOT_LEVEL spec (target, partial exit), each with optional ce / pe operands. */
function levelSpecs(s: Strategy): AnyRec[] {
  const out: AnyRec[] = [];
  const tgt = (s.exit as unknown as AnyRec).target as AnyRec | undefined;
  if (tgt && tgt.type === "SPOT_LEVEL") out.push(tgt);
  const pe = ((s.advanced ?? {}) as AnyRec).partial_exit as AnyRec | undefined;
  if (pe && (pe.when as AnyRec).type === "SPOT_LEVEL") out.push(pe.when as AnyRec);
  return out;
}
const MAX_DEPTH = 4;
const MAX_CONDITIONS_PER_SIDE = 30;
const MAX_QUANTITY = 100_000;

export const hhmm = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

function walk(node: Node, depth = 0): { depth: number; leaves: number; nodes: Node[] } {
  if (node.type === "all" || node.type === "any") {
    let maxD = depth + 1;
    let leaves = 0;
    let nodes: Node[] = [node];
    for (const child of node.conditions as Node[]) {
      const r = walk(child, depth + 1);
      maxD = Math.max(maxD, r.depth);
      leaves += r.leaves;
      nodes = nodes.concat(r.nodes);
    }
    return { depth: maxD, leaves, nodes };
  }
  return { depth, leaves: 1, nodes: [node] };
}

function operands(node: Node): AnyRec[] {
  if (node.type === "compare" || node.type === "cross") return [node.left as AnyRec, node.right as AnyRec];
  if (node.type === "slope") return [node.operand as AnyRec];
  return [];
}

function num(x: number): string {
  return Number.isInteger(x) ? String(x) : String(x);
}

function tfName(m: number): string {
  if (m < 60) return `${m} min`;
  return m === 60 ? "1 hour" : `${m / 60} hours`;
}

function bandsCover(bands: AnyRec[]): boolean {
  const ordered = [...bands].sort((a, b) => ((a.vix_from as number) ?? 0) - ((b.vix_from as number) ?? 0));
  const first = ordered[0]!;
  const last = ordered[ordered.length - 1]!;
  if (((first.vix_from as number | undefined) ?? 0) !== 0) return false;
  if ("vix_to" in last) return false;
  for (let i = 0; i < ordered.length - 1; i++) {
    const a = ordered[i]!;
    const b = ordered[i + 1]!;
    if (!("vix_to" in a) || !("vix_from" in b) || a.vix_to !== b.vix_from) return false;
  }
  return ordered.every((b) => !("vix_to" in b) || ((b.vix_from as number) ?? 0) < (b.vix_to as number));
}

function allowedMinutes(s: Strategy, inst: InstrumentSummary): boolean {
  const adv = (s.advanced ?? {}) as AnyRec;
  const sq = hhmm(inst.intraday_squareoff);
  const first = hhmm(inst.session.first_bar);
  const last = s.holding === "INTRADAY" ? sq - 1 : hhmm(inst.session.last_bar);
  let minutes = new Set<number>();
  for (let m = first; m <= last; m++) minutes.add(m);
  const ew = adv.entry_windows as { from: string; to: string }[] | undefined;
  if (ew && ew.length) {
    const allowed = new Set<number>();
    for (const w of ew) for (let m = hhmm(w.from); m < hhmm(w.to); m++) allowed.add(m);
    minutes = new Set([...minutes].filter((m) => allowed.has(m)));
  }
  for (const w of (adv.no_entry_windows as { from: string; to: string }[] | undefined) ?? []) {
    for (let m = hhmm(w.from); m < hhmm(w.to); m++) minutes.delete(m);
  }
  return minutes.size > 0;
}

export interface RuleContext {
  meta: MetaResponse;
  instrumentOverride?: Partial<InstrumentSummary>;
  period?: { start: string; end: string } | null;
}

export function semanticProblems(s: Strategy, ctx: RuleContext): Problem[] {
  const probs: Problem[] = [];
  const base = ctx.meta.instruments.find((i) => i.symbol === s.underlying);
  if (!base) return [{ rule: "SEM-01", field_label: "Instrument", message: "This instrument isn't available in Nikasha yet." }];
  const inst: InstrumentSummary = { ...base, ...(ctx.instrumentOverride ?? {}) };

  if (!inst.allowed_timeframes_min.includes(s.timeframe_min)) {
    probs.push({
      rule: "SEM-02",
      field_label: "Candle timeframe",
      message: `Choose one of these candle timeframes: ${inst.allowed_timeframes_min.map(tfName).join(", ")}.`,
    });
  }

  const indicators = s.indicators as unknown as Record<string, AnyRec>;
  const entry = s.entry as AnyRec;
  const exitWhen = ((s.exit as unknown as AnyRec).exit_when ?? {}) as Record<string, Node>;
  // Entry and exit condition sets share SEM-03, 04 and 15.
  const sides = [
    ...(["ce", "pe", "all_legs"] as const).filter((k) => k in entry).map((k) => entry[k] as Node),
    ...Object.values(exitWhen),
  ];
  const nodes = sides.flatMap((t) => walk(t).nodes);
  const levels = levelSpecs(s);

  const missing: string[] = [];
  for (const spec of levels) {
    for (const o of [spec.ce, spec.pe] as (AnyRec | undefined)[]) {
      if (o && "ind" in o) {
        const ind = indicators[o.ind as string];
        if (!ind || !OUTPUTS[ind.type as string]!.includes(o.output as string)) missing.push(o.ind as string);
      }
    }
  }
  for (const node of nodes) {
    for (const o of operands(node)) {
      if ("ind" in o) {
        const ind = indicators[o.ind as string];
        if (!ind || !OUTPUTS[ind.type as string]!.includes(o.output as string)) missing.push(o.ind as string);
      }
    }
    if ((node.type === "state" || node.type === "turns") && !(node.ind as string in indicators)) missing.push(node.ind as string);
  }
  if (missing.length) {
    probs.push({
      rule: "SEM-03",
      field_label: "Entry conditions",
      message: `A condition uses an indicator that hasn't been set up: ${missing[0]}.`,
    });
  }

  for (const node of nodes) {
    if (node.type === "state" || node.type === "turns") {
      const ind = indicators[node.ind as string];
      if (ind && ind.type !== "SUPERTREND") {
        probs.push({ rule: "SEM-04", field_label: "Entry conditions", message: "'Turns green/red' only works with Supertrend." });
        break;
      }
    }
  }

  if (Object.values(indicators).some((i) => i.type === "MACD" && (i.fast as number) >= (i.slow as number))) {
    probs.push({ rule: "SEM-05", field_label: "Indicator settings", message: "MACD fast period must be shorter than the slow period." });
  }

  const interval = inst.strike_interval;
  for (const leg of s.legs) {
    const st = leg.strike as unknown as AnyRec;
    if (st.method !== "MONEYNESS") continue;
    const d = Number(st.distance_pts);
    const bad =
      st.moneyness === "ATM" ? d !== 0 : d <= 0 || Math.abs(d / interval - Math.round(d / interval)) > 1e-9;
    if (bad) {
      probs.push({
        rule: "SEM-06",
        field_label: "Strike",
        message: `For ITM or OTM, enter a distance in steps of ${num(interval)} points (e.g. ${num(interval * 2)}).`,
      });
      break;
    }
  }

  const ex = s.exit as unknown as AnyRec;
  const adv = (s.advanced ?? {}) as AnyRec;
  const intraday = s.holding === "INTRADAY";
  const sq = inst.intraday_squareoff;

  if (!intraday && !("target" in ex || "time_exit" in ex || ex.hold_to_expiry || "exit_after_candles" in adv || "exit_when" in ex)) {
    probs.push({
      rule: "SEM-07",
      field_label: "Exit rule",
      message:
        "Choose what should happen to an open positional trade: hold until expiry, exit at a set time on expiry day, set a target, or exit after a number of candles.",
    });
  }

  const te = ex.time_exit as { at: string; on: string } | undefined;
  if (intraday && (ex.hold_to_expiry || (te && (te.on !== "ENTRY_DAY" || hhmm(te.at) >= hhmm(sq))))) {
    probs.push({ rule: "SEM-08", field_label: "Exit rule", message: `Intraday positions close by ${sq}, so this exit can't apply.` });
  }

  const fb = hhmm(inst.session.first_bar);
  const lb = hhmm(inst.session.last_bar);
  const windows = [
    ...((adv.entry_windows as { from: string; to: string }[] | undefined) ?? []),
    ...((adv.no_entry_windows as { from: string; to: string }[] | undefined) ?? []),
  ];
  const times: string[] = [];
  if (entry.at_time) times.push(entry.at_time as string);
  if (adv.expiry_day_cutoff) times.push(adv.expiry_day_cutoff as string);
  if (te) times.push(te.at);
  for (const w of windows) times.push(w.from, w.to);
  const badTime = times.some((t) => hhmm(t) < fb || hhmm(t) > lb);
  const badWindow = windows.some((w) => hhmm(w.from) >= hhmm(w.to));
  const badAt = intraday && !!entry.at_time && hhmm(entry.at_time as string) >= hhmm(sq);
  const sem09 = badTime || badWindow || badAt;
  if (sem09) {
    probs.push({
      rule: "SEM-09",
      field_label: "Times",
      message: `Times must be within market hours (${inst.session.first_bar}–${inst.session.last_bar}), and a window must start before it ends.`,
    });
  }

  const types = s.legs.map((l) => l.option_type);
  const canCe = types.some((t) => t === "CE" || t === "SIGNAL");
  const canPe = types.some((t) => t === "PE" || t === "SIGNAL");
  let sem10 = false;
  if (types.includes("SIGNAL") && (s.legs.length !== 1 || !("ce" in entry || "pe" in entry))) sem10 = true;
  for (const t of types) {
    if (t === "CE" && !("ce" in entry || "all_legs" in entry || "at_time" in entry)) sem10 = true;
    if (t === "PE" && !("pe" in entry || "all_legs" in entry || "at_time" in entry)) sem10 = true;
  }
  if (("ce" in entry && !canCe) || ("pe" in entry && !canPe)) sem10 = true;
  if (sem10) {
    probs.push({ rule: "SEM-10", field_label: "Entry trigger", message: "The entry rule doesn't match the options you chose to trade." });
  }

  if (s.legs.length > 1) {
    const sl = ex.stop_loss as AnyRec;
    if (
      types.includes("SIGNAL") ||
      "ce" in entry ||
      "pe" in entry ||
      !("all_legs" in entry || "at_time" in entry) ||
      new Set(s.legs.map((l) => l.expiry)).size > 1 ||
      sl.type === "TRIGGER_CANDLE"
    ) {
      probs.push({
        rule: "SEM-11",
        field_label: "Legs",
        message: "Multi-leg strategies open all legs together on the same expiry, with one combined stop-loss.",
      });
    }
  }

  const vs = adv.vix_sizing as { bands: AnyRec[] } | undefined;
  if (vs && !bandsCover(vs.bands)) {
    probs.push({
      rule: "SEM-12",
      field_label: "Volatility sizing",
      message: "Volatility sizing must say what to do for every VIX level, with no gaps or overlaps.",
    });
  }

  if (ctx.period) {
    const { start, end } = ctx.period;
    const weekly = inst.expiry_kinds.find((k) => k.kind === "WEEKLY");
    if (weekly && s.legs.some((l) => l.expiry === "CURRENT_WEEKLY" || l.expiry === "NEXT_WEEKLY") && start < weekly.available_from) {
      probs.push({
        rule: "SEM-13",
        field_label: "Expiry",
        message: `Weekly options only exist from ${day(weekly.available_from)}. Choose a later start date or monthly expiry.`,
      });
    }
    const first = inst.data_range.first.slice(0, 10);
    const last = inst.data_range.last.slice(0, 10);
    if (!(first <= start && start < end && end <= last)) {
      probs.push({ rule: "SEM-14", field_label: "Backtest period", message: `Choose dates between ${day(first)} and ${day(last)}.` });
    }
  }

  for (const tree of sides) {
    const r = walk(tree);
    if (r.depth > MAX_DEPTH || r.leaves > MAX_CONDITIONS_PER_SIDE) {
      probs.push({ rule: "SEM-15", field_label: "Entry conditions", message: "This entry rule is too complex. Please simplify it." });
      break;
    }
  }

  if ((ex.stop_loss as AnyRec).type === "TRIGGER_CANDLE" && !("ce" in entry || "pe" in entry || "all_legs" in entry)) {
    probs.push({
      rule: "SEM-16",
      field_label: "Stop-loss",
      message: "'Trigger candle' stop-loss needs an entry signal candle; a fixed-time entry has none.",
    });
  }

  if (intraday && (ex.hold_to_expiry || (te && te.on === "EXPIRY_DAY"))) {
    probs.push({ rule: "SEM-17", field_label: "Exit rule", message: "This exit only applies to positional strategies." });
  }

  if (!sem09 && !allowedMinutes(s, inst)) {
    probs.push({ rule: "SEM-18", field_label: "Entry timing", message: "Your time windows leave no time to enter a trade." });
  }

  if (s.position.lots * s.position.lot_size > MAX_QUANTITY) {
    probs.push({ rule: "SEM-20", field_label: "Position size", message: "That position size is too large to simulate." });
  }

  if (adv.trail_to_cost_at_r !== undefined && adv.trail_to_cost_at_pts !== undefined) {
    probs.push({ rule: "SEM-21", field_label: "Trail to cost", message: "Choose one way to move the stop to cost: a multiple of the risk, or premium points." });
  }
  const legs = s.legs as unknown as AnyRec[];
  const partial = adv.partial_exit as AnyRec | undefined;
  const usesLevels = levels.length > 0 || partial?.then_stop === "PARTIAL_CANDLE";
  if (usesLevels && legs.length > 1) {
    probs.push({ rule: "SEM-22", field_label: "Exit levels", message: "Index-level exits work with one leg only." });
  }
  if (levels.length && legs.length === 1) {
    const ot = legs[0]!.option_type as string;
    const need = ot === "CE" ? ["ce"] : ot === "PE" ? ["pe"] : ["ce", "pe"];
    const bad = levels.some((spec) => need.some((k) => { const o = spec[k] as AnyRec | undefined; return !o || !("ind" in o || "const" in o); }));
    if (bad) {
      probs.push({ rule: "SEM-23", field_label: "Exit levels", message: "Give the index level for each side you trade (calls and puts), using an indicator value or a number." });
    }
  }
  const exitKeys = Object.keys(exitWhen);
  if (exitKeys.length) {
    const ot = legs[0]!.option_type as string;
    const ok = legs.length > 1
      ? exitKeys.length === 1 && exitKeys[0] === "all_legs"
      : ot === "SIGNAL"
        ? !exitKeys.includes("all_legs")
        : exitKeys.length === 1 && (exitKeys[0] === ot.toLowerCase() || exitKeys[0] === "all_legs");
    if (!ok) {
      probs.push({ rule: "SEM-24", field_label: "Exit conditions", message: "The exit conditions don't match the option type: use call and put conditions for one signal leg, or one set for all legs." });
    }
  }
  if (partial && s.position.lots < 2) {
    probs.push({ rule: "SEM-25", field_label: "Partial exit", message: "A partial exit needs at least 2 lots, so part of the position can be closed and part kept." });
  }
  return probs;
}

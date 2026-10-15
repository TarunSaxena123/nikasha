// The ONE definition of "missing" (architecture.md A9; frontend.md §6a; REQ-INP-01). Used by the
// builder, the review screen and the upload flow. Each missing input has a fixed plain-English
// question; nothing is ever filled in for the user.
import type { MetaResponse, Question } from "@/api/types";
import type { Draft } from "./draft";

export type StepId = "basics" | "strike" | "entry" | "exit" | "advanced";

export interface MissingItem {
  key: string;
  label: string; // plain-English name, e.g. "Stop-loss"
  step: StepId;
  question: Question | null; // null: set in the builder (entry conditions)
}

type AnyRec = Record<string, unknown>;

const choice = (id: string, prompt: string, options: { label: string; patch: unknown }[], help?: string): Question => ({
  id,
  item_id: id,
  kind: "CHOICE",
  prompt,
  ...(help ? { help } : {}),
  options: options as Question["options"],
});

const legPaths = (n: number, field: string) => Array.from({ length: Math.max(n, 1) }, (_, i) => `/legs/${i}/${field}`);

export const POSITIONAL_EXIT_PROMPT = "Your strategy has no target or time exit. What should happen to an open position?";

const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);

function operandUnfinished(o: AnyRec | undefined): boolean {
  if (!o) return true;
  const off = o.offset as AnyRec | undefined;
  if (off && !finite(off.pts ?? off.pct)) return true;
  if ("ind" in o) return !o.ind || !o.output;
  if ("price" in o) return !o.price;
  if ("vix" in o) return !o.vix;
  if ("const" in o) return !finite(o.const);
  if ("candle" in o) return !o.candle;
  return true;
}

/** A condition with an empty box (no value chosen, no number, no look-back) or an empty group. */
export function unfinished(n: AnyRec): boolean {
  switch (n.type) {
    case "all":
    case "any": {
      const c = (n.conditions ?? []) as AnyRec[];
      return c.length === 0 || c.some(unfinished);
    }
    case "compare":
      return !n.op || operandUnfinished(n.left as AnyRec) || operandUnfinished(n.right as AnyRec);
    case "cross":
      return !n.direction || operandUnfinished(n.left as AnyRec) || operandUnfinished(n.right as AnyRec);
    case "turns":
    case "state":
      return !n.ind;
    case "slope":
      return operandUnfinished(n.operand as AnyRec) || !finite(n.lookback);
    default:
      return true;
  }
}

export function completeness(draft: Draft | null, meta: MetaResponse | null): MissingItem[] {
  const s = (draft?.strategy ?? {}) as AnyRec;
  const legs = (Array.isArray(s.legs) ? s.legs : []) as AnyRec[];
  const n = legs.length;
  const inst = meta?.instruments.find((i) => i.symbol === (s.underlying ?? "NIFTY50")) ?? meta?.instruments[0];
  const interval = inst?.strike_interval ?? 50;
  const out: MissingItem[] = [];
  // With several legs, each leg's buy/sell, call/put and strike are edited under Advanced → Multiple legs.
  const legStep = (step: StepId): StepId => (n > 1 ? "advanced" : step);

  if (!s.underlying) {
    out.push({
      key: "instrument", label: "Instrument", step: "basics",
      question: choice("instrument", "Which instrument?", [{ label: inst?.name ?? "Nifty 50", patch: [{ op: "add", path: "/underlying", value: inst?.symbol ?? "NIFTY50" }] }]),
    });
  }

  if (n === 0 || legs.some((l) => !l.action)) {
    out.push({
      key: "action", label: "Buy or sell", step: legStep("basics"),
      question: choice("action", "Do you buy options or sell options?", [
        { label: "Buy options", patch: legPaths(n, "action").map((path) => ({ op: "add", path, value: "BUY" })) },
        { label: "Sell options", patch: legPaths(n, "action").map((path) => ({ op: "add", path, value: "SELL" })) },
      ]),
    });
  }

  if (n === 0 || legs.some((l) => !l.option_type)) {
    out.push({
      key: "option_type", label: "Option type", step: legStep("basics"),
      question: choice("option_type", "Which option do you trade?", [
        { label: "Call (CE)", patch: [{ op: "add", path: "/legs/0/option_type", value: "CE" }] },
        { label: "Put (PE)", patch: [{ op: "add", path: "/legs/0/option_type", value: "PE" }] },
        { label: "Both: a call on the call signal, a put on the put signal", patch: [{ op: "add", path: "/legs/0/option_type", value: "SIGNAL" }] },
      ]),
    });
  }

  const strikes = legs.map((l) => (l.strike ?? {}) as AnyRec);
  if (n === 0 || strikes.some((st) => !st.method || (st.method === "MONEYNESS" && !st.moneyness))) {
    out.push({
      key: "moneyness", label: "Strike", step: legStep("strike"),
      question: choice("moneyness", "Which strike: at the money, in the money or out of the money?", [
        { label: "At the money (ATM)", patch: legPaths(n, "strike").map((path) => ({ op: "add", path, value: { method: "MONEYNESS", moneyness: "ATM", distance_pts: 0 } })) },
        { label: "In the money (ITM)", patch: legPaths(n, "strike").map((path) => ({ op: "add", path, value: { method: "MONEYNESS", moneyness: "ITM" } })) },
        { label: "Out of the money (OTM)", patch: legPaths(n, "strike").map((path) => ({ op: "add", path, value: { method: "MONEYNESS", moneyness: "OTM" } })) },
      ]),
    });
  } else if (strikes.some((st) => st.method === "MONEYNESS" && st.moneyness !== "ATM" && (st.distance_pts === undefined || st.distance_pts === null))) {
    out.push({
      key: "distance", label: "Strike distance", step: legStep("strike"),
      question: {
        id: "distance", item_id: "distance", kind: "NUMBER",
        prompt: `How many points from the at-the-money strike? (steps of ${interval})`,
        number: { unit_label: "points", min: interval, step: interval, targets: strikes.map((_, i) => ({ path: `/legs/${i}/strike/distance_pts` })) },
      },
    });
  }

  if (n === 0 || legs.some((l) => !l.expiry)) {
    const all = (value: string) => legPaths(n, "expiry").map((path) => ({ op: "add" as const, path, value }));
    out.push({
      key: "expiry", label: "Expiry", step: "basics",
      question: choice("expiry", "Which expiry do you trade?", [
        { label: "Current weekly", patch: all("CURRENT_WEEKLY") },
        { label: "Next weekly", patch: all("NEXT_WEEKLY") },
        { label: "Monthly", patch: all("MONTHLY") },
      ]),
    });
  }

  if (s.timeframe_min === undefined || s.timeframe_min === null) {
    const tfs = inst?.allowed_timeframes_min ?? [1, 3, 5, 15, 30, 60, 240];
    out.push({
      key: "timeframe", label: "Candle timeframe", step: "basics",
      question: choice("timeframe", "Which candle timeframe?", tfs.map((m) => ({
        label: m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : `${m / 60} hours`,
        patch: [{ op: "add", path: "/timeframe_min", value: m }],
      }))),
    });
  }

  if (!s.holding) {
    out.push({
      key: "holding", label: "Holding", step: "basics",
      question: choice("holding", "Intraday or positional?", [
        { label: `Intraday (closed by ${inst?.intraday_squareoff ?? "15:15"} the same day)`, patch: [{ op: "add", path: "/holding", value: "INTRADAY" }] },
        { label: "Positional (can be held overnight)", patch: [{ op: "add", path: "/holding", value: "POSITIONAL" }] },
      ]),
    });
  }

  const pos = (s.position ?? {}) as AnyRec;
  if (pos.lots === undefined || pos.lots === null || !draft?.confirmed.lots) {
    out.push({
      key: "lots", label: "Number of lots", step: "basics",
      question: {
        id: "lots", item_id: "lots", kind: "NUMBER", prompt: "How many lots per trade? Please confirm or change.",
        number: { unit_label: "lots", min: 1, max: 1000, step: 1, prefill: (pos.lots as number | undefined) ?? 1, targets: [{ path: "/position/lots" }] },
      },
    });
  }
  if (pos.lot_size === undefined || pos.lot_size === null || !draft?.confirmed.lotSize) {
    out.push({
      key: "lot_size", label: "Lot size", step: "basics",
      question: {
        id: "lot_size", item_id: "lot_size", kind: "NUMBER",
        prompt: "What lot size? Please confirm or change.",
        help: inst?.lot_size_note,
        number: { unit_label: "quantity per lot", min: 1, max: 100000, step: 1, prefill: (pos.lot_size as number | undefined) ?? inst?.lot_size_suggested ?? 65, targets: [{ path: "/position/lot_size" }] },
      },
    });
  }

  const entry = (s.entry ?? {}) as AnyRec;
  const types = legs.map((l) => l.option_type);
  const hasTime = !!entry.at_time;
  const sideOk =
    n > 1
      ? hasTime || !!entry.all_legs
      : types[0] === "SIGNAL"
        ? !!entry.ce || !!entry.pe
        : types[0] === "CE"
          ? hasTime || !!entry.ce || !!entry.all_legs
          : types[0] === "PE"
            ? hasTime || !!entry.pe || !!entry.all_legs
            : hasTime || !!entry.ce || !!entry.pe || !!entry.all_legs;
  if (!sideOk || (draft?.pending.length ?? 0) > 0) {
    out.push({ key: "entry", label: "Entry trigger", step: "entry", question: null });
  }
  if (["ce", "pe", "all_legs"].some((k) => entry[k] && unfinished(entry[k] as AnyRec))) {
    out.push({ key: "entry_conditions", label: "Entry conditions", step: "entry", question: null });
  }

  const ex = (s.exit ?? {}) as AnyRec;
  const sl = ex.stop_loss as AnyRec | undefined;
  if (Object.values((ex.exit_when ?? {}) as Record<string, AnyRec>).some((t) => unfinished(t))) {
    out.push({ key: "exit_conditions", label: "Exit conditions", step: "exit", question: null });
  }
  const tgtLevel = ex.target as AnyRec | undefined;
  if (tgtLevel?.type === "SPOT_LEVEL") {
    const need = types[0] === "CE" ? ["ce"] : types[0] === "PE" ? ["pe"] : ["ce", "pe"];
    if (need.some((k) => { const o = tgtLevel[k] as AnyRec | undefined; return !o || ("const" in o && !finite(o.const)); })) {
      out.push({ key: "target_levels", label: "Target", step: "exit", question: null });
    }
  }
  if (!sl || !sl.type) {
    out.push({
      key: "stop_loss", label: "Stop-loss", step: "exit",
      question: choice("stop_loss", "How is your stop-loss set?", [
        { label: "% of the option premium", patch: [{ op: "add", path: "/exit/stop_loss", value: { type: "PCT_PREMIUM" } }] },
        { label: "Premium points", patch: [{ op: "add", path: "/exit/stop_loss", value: { type: "POINTS" } }] },
      ]),
    });
  } else if (sl.type !== "TRIGGER_CANDLE" && (sl.value === undefined || sl.value === null)) {
    out.push({
      key: "stop_loss_value", label: "Stop-loss", step: "exit",
      question: {
        id: "stop_loss_value", item_id: "stop_loss_value", kind: "NUMBER",
        prompt: sl.type === "PCT_PREMIUM" ? "Stop-loss: how many % of the premium?" : "Stop-loss: how many premium points?",
        number: { unit_label: sl.type === "PCT_PREMIUM" ? "%" : "points", min: 0.05, targets: [{ path: "/exit/stop_loss/value" }] },
      },
    });
  }

  const adv = (s.advanced ?? {}) as AnyRec;
  const tgt = ex.target as AnyRec | undefined;
  const te = ex.time_exit as AnyRec | undefined;
  if (tgt && tgt.type !== "SPOT_LEVEL" && (tgt.value === undefined || tgt.value === null)) {
    out.push({
      key: "target_value", label: "Target", step: "exit",
      question: {
        id: "target_value", item_id: "target_value", kind: "NUMBER",
        prompt: tgt.type === "POINTS" ? "Target: how many premium points?" : tgt.type === "RR" ? "Target: how many times the stop distance?" : "Target: how many % of the premium?",
        number: { unit_label: tgt.type === "POINTS" ? "points" : tgt.type === "RR" ? "× stop" : "%", min: 0.05, targets: [{ path: "/exit/target/value" }] },
      },
    });
  }
  if (te && !te.at) {
    out.push({
      key: "time_exit_at", label: "Exit time", step: "exit",
      question: { id: "time_exit_at", item_id: "time_exit_at", kind: "TIME", prompt: te.on === "EXPIRY_DAY" ? "At what time on expiry day?" : "At what time?", time: { path: "/exit/time_exit/at" } },
    });
  }
  if (draft?.pendingExit === "CANDLES" && adv.exit_after_candles === undefined) {
    out.push({
      key: "exit_after_candles", label: "Exit after N candles", step: "exit",
      question: {
        id: "exit_after_candles", item_id: "exit_after_candles", kind: "NUMBER", prompt: "Exit after how many candles?",
        number: { unit_label: "candles", min: 1, max: 500, step: 1, targets: [{ path: "/advanced/exit_after_candles" }] },
      },
    });
  }

  if (s.holding === "POSITIONAL" && !tgt && !te && !ex.hold_to_expiry && adv.exit_after_candles === undefined && draft?.pendingExit !== "CANDLES") {
    out.push({
      key: "exit_rule", label: "Exit rule", step: "exit",
      question: choice("exit_rule", POSITIONAL_EXIT_PROMPT, [
        { label: "Hold until expiry (settled at expiry)", patch: [{ op: "add", path: "/exit/hold_to_expiry", value: true }] },
        { label: "Exit at a set time on expiry day", patch: [{ op: "add", path: "/exit/time_exit", value: { on: "EXPIRY_DAY" } }] },
        { label: "Set a target (% of premium)", patch: [{ op: "add", path: "/exit/target", value: { type: "PCT_PREMIUM" } }] },
        { label: "Set a target (premium points)", patch: [{ op: "add", path: "/exit/target", value: { type: "POINTS" } }] },
        { label: "Exit after a number of candles", patch: [{ op: "add", path: "/__pendingExit", value: "CANDLES" }] },
      ]),
    });
  }
  return out;
}

/** Order of the mandatory inputs (product.md §6.1), for sorting questions. */
export const MANDATORY_ORDER = [
  "instrument", "action", "option_type", "moneyness", "distance", "expiry", "timeframe", "holding", "lots", "lot_size",
  "entry", "stop_loss", "stop_loss_value", "exit_rule", "target_value", "time_exit_at", "exit_after_candles",
];

import { describe, expect, it } from "vitest";
import { completeness, POSITIONAL_EXIT_PROMPT } from "./completeness";
import { describeStrategy, treeLines, NOT_USED } from "./describe";
import { emptyDraft, type Draft } from "./draft";
import { mirror } from "./mirror";
import { moneynessStrike, atmStrike } from "./strikes";
import { meta, validStrategy, list, readJson } from "@/test/fixtures";
import { applyPatch } from "@/lib/patch";

const M = meta();
const inst = M.instruments[0]!;
const draftOf = (s: unknown, confirmed = true): Draft => ({
  ...emptyDraft("UPLOAD"),
  strategy: JSON.parse(JSON.stringify(s)),
  confirmed: { lots: confirmed, lotSize: confirmed },
});

describe("completeness (AC-INP-01)", () => {
  it("lists every mandatory input for an empty draft", () => {
    const keys = completeness({ ...emptyDraft(), strategy: {} }, M).map((m) => m.key);
    expect(keys).toEqual(["instrument", "action", "option_type", "moneyness", "expiry", "timeframe", "holding", "lots", "lot_size", "entry", "stop_loss"]);
  });

  it("one-line sample after extraction asks holding, expiry, lots, lot size only", () => {
    const s = validStrategy("one-line-sample-with-answers") as unknown as Record<string, unknown>;
    delete s.holding;
    delete (s.legs as Record<string, unknown>[])[0]!.expiry;
    const keys = completeness(draftOf(s, false), M).map((m) => m.key);
    expect(keys).toEqual(["expiry", "holding", "lots", "lot_size"]);
  });

  it("asks the positional exit question, and nothing more for intraday", () => {
    const s = validStrategy("one-line-sample-with-answers") as unknown as Record<string, unknown>;
    s.holding = "POSITIONAL";
    const items = completeness(draftOf(s), M);
    expect(items.map((i) => i.key)).toEqual(["exit_rule"]);
    expect(items[0]!.question!.prompt).toBe(POSITIONAL_EXIT_PROMPT);
    expect(items[0]!.question!.options!.map((o) => o.label)).toContain("Hold until expiry (settled at expiry)");
    s.holding = "INTRADAY";
    expect(completeness(draftOf(s), M)).toEqual([]);
  });

  it("unconfirmed pre-fills count as missing; a pending condition blocks entry", () => {
    const d = draftOf(validStrategy("simple-trend-follower"), false);
    expect(completeness(d, M).map((m) => m.key)).toEqual(["lots", "lot_size"]);
    d.confirmed = { lots: true, lotSize: true };
    d.pending = ["q1"];
    expect(completeness(d, M).map((m) => m.key)).toEqual(["entry"]);
  });

  it("missing stop-loss is asked, never defaulted (AC-UPL-11)", () => {
    const s = validStrategy("simple-trend-follower") as unknown as { exit: Record<string, unknown> };
    delete s.exit.stop_loss;
    const item = completeness(draftOf(s), M).find((m) => m.key === "stop_loss")!;
    const after = applyPatch(s as unknown as Record<string, unknown>, item.question!.options![0]!.patch);
    const next = completeness(draftOf(after), M);
    expect(next.map((m) => m.key)).toEqual(["stop_loss_value"]);
  });

  it("all fixtures are complete once confirmed", () => {
    for (const name of list("fixtures", "strategies", "valid")) expect(completeness(draftOf(validStrategy(name)), M)).toEqual([]);
  });
});

describe("describeStrategy (AC-INP-02)", () => {
  const forbidden = /[{}"]|PCT_PREMIUM|option_type|CURRENT_WEEKLY|SIGNAL|TRIGGER_CANDLE|undefined|NaN|\bnull\b/;
  it.each(list("fixtures", "strategies", "valid"))("%s renders every row in plain English", (name) => {
    const rows = describeStrategy(validStrategy(name) as never, inst);
    expect(rows.slice(0, 13).map((r) => r.key)).toEqual(["instrument", "action", "option_type", "strike", "expiry", "timeframe", "holding", "lots", "lot_size", "entry", "stop_loss", "exit_rule"].concat(rows[12]!.key).slice(0, 13));
    const advanced = rows.filter((r) => r.advanced);
    expect(advanced).toHaveLength(15);
    for (const r of rows) {
      const text = [r.rule, r.setting, r.meaning, ...treeLines(r.tree ?? [])].join(" ");
      expect(text).not.toMatch(forbidden);
    }
  });

  it("the advanced sample's ADX rule reads in words", () => {
    const rows = describeStrategy(validStrategy("sample-pdf-with-answers") as never, inst);
    const lines = treeLines(rows.find((r) => r.key === "entry")!.tree!).join("\n");
    expect(lines).toContain("Any of these:");
    expect(lines).toContain("ADX 14 is above 20");
    expect(lines).toContain("ADX 14 is rising (vs 1 candle ago)");
    expect(lines).toContain("Close is above EMA 9 (close) + 10 points");
    expect(lines).toContain("Supertrend 10 × 2 turns green");
  });

  it("Simple Trend Follower: used advanced options first, others Not used (AC-EVL-01)", () => {
    const rows = describeStrategy(validStrategy("simple-trend-follower") as never, inst).filter((r) => r.advanced);
    expect(rows.slice(0, 2).map((r) => [r.rule, r.used])).toEqual([["Entry windows", true], ["Daily limits", true]]);
    expect(rows.slice(2).every((r) => r.setting === NOT_USED)).toBe(true);
  });

  it("covers every condition node type", () => {
    const s = validStrategy("simple-trend-follower") as unknown as Record<string, unknown>;
    s.indicators = { st: { type: "SUPERTREND", period: 10, multiplier: 3 }, m: { type: "MACD", fast: 12, slow: 26, signal: 9 }, b: { type: "BBANDS", period: 20, stddev: 2, source: "close" }, a: { type: "ADX", period: 14 }, s: { type: "SMA", period: 50, source: "high" }, r: { type: "RSI", period: 14 } };
    s.entry = { ce: { type: "all", conditions: [
      { type: "state", ind: "st", is: "up" },
      { type: "compare", left: { ind: "m", output: "hist" }, op: "gte", right: { const: 0 } },
      { type: "compare", left: { price: "low" }, op: "lte", right: { ind: "b", output: "lower", offset: { pct: -1 } } },
      { type: "compare", left: { ind: "a", output: "plus_di" }, op: "gt", right: { ind: "a", output: "minus_di" } },
      { type: "compare", left: { vix: "close" }, op: "lt", right: { const: 18 } },
      { type: "slope", operand: { ind: "s", output: "value" }, direction: "down", lookback: 3 },
      { type: "cross", left: { ind: "r", output: "value" }, direction: "below", right: { const: 30 } },
    ] } };
    const lines = treeLines(describeStrategy(s as never, inst).find((r) => r.key === "entry")!.tree!).join("\n");
    for (const t of ["Supertrend 10 × 3 is green", "MACD 12/26/9 histogram is at or above 0", "Low is at or below Bollinger 20, 2 SD (close) lower band − 1%", "+DI 14 is above −DI 14", "India VIX (close) is below 18", "SMA 50 (high) is falling (vs 3 candles ago)", "RSI 14 crosses below 30"]) {
      expect(lines).toContain(t);
    }
  });

  it("template overrides replace the meaning", () => {
    const rows = describeStrategy(validStrategy("simple-trend-follower") as never, inst, { stop_loss: "Custom" });
    expect(rows.find((r) => r.key === "stop_loss")!.meaning).toBe("Custom");
  });

  it("partial drafts read 'Not set yet'", () => {
    const rows = describeStrategy({}, inst);
    expect(rows.find((r) => r.key === "holding")!.setting).toBe("Not set yet");
  });
});

describe("mirror (AC-INP-11)", () => {
  it("flips directions and flags numbers for review", () => {
    const ce = { type: "all", conditions: [
      { type: "cross", left: { ind: "ema9", output: "value" }, direction: "above", right: { ind: "ema21", output: "value" } },
      { type: "compare", left: { ind: "rsi", output: "value" }, op: "gt", right: { const: 55 } },
      { type: "compare", left: { price: "close" }, op: "gt", right: { ind: "ema9", output: "value", offset: { pts: 10 } } },
    ] };
    const r = mirror(ce);
    const kids = r.tree.conditions as Record<string, unknown>[];
    expect(kids[0]!.direction).toBe("below");
    expect(kids[1]!.op).toBe("lt");
    expect((kids[1]!.right as { const: number }).const).toBe(55);
    expect(((kids[2]!.right as { offset: { pts: number } }).offset.pts)).toBe(-10);
    expect(r.needsReview).toEqual(["/conditions/1/right"]);
  });
});

describe("strike examples (AC-INP-07)", () => {
  it("mirror the engine", () => {
    expect(moneynessStrike(24500, 50, "ITM", 100, true)).toBe(24400);
    expect(moneynessStrike(24500, 50, "ITM", 100, false)).toBe(24600);
    expect(atmStrike(24525, 50)).toBe(24550);
  });
});

describe("advanced options list", () => {
  it("is the shared 15-label contract", () => {
    const opts = readJson<{ options: { label: string }[] }>("advanced-options.json").options;
    expect(describeStrategy({}, inst).filter((r) => r.advanced).map((r) => r.rule)).toEqual(opts.map((o) => o.label));
  });
});

describe("unfinished conditions block the entry step", () => {
  it("flags empty boxes, missing look-backs and empty groups; accepts complete trees", async () => {
    const { unfinished } = await import("./completeness");
    const ema = (id: string) => ({ ind: id, output: "value" });
    expect(unfinished({ type: "compare", left: ema("ema9"), op: "gt", right: { const: undefined } })).toBe(true);
    expect(unfinished({ type: "compare", left: ema("ema9"), op: "gt", right: ema("ema21") })).toBe(false);
    expect(unfinished({ type: "compare", left: ema("ema9"), op: "gt", right: { ...ema("ema21"), offset: { pts: undefined } } })).toBe(true);
    expect(unfinished({ type: "cross", left: { price: "close" }, direction: "above", right: { const: 55 } })).toBe(false);
    expect(unfinished({ type: "slope", operand: ema("adx14"), direction: "up" })).toBe(true);
    expect(unfinished({ type: "turns", to: "up" })).toBe(true);
    expect(unfinished({ type: "all", conditions: [] })).toBe(true);
    expect(unfinished({ type: "any", conditions: [{ type: "state", ind: "st", is: "up" }] })).toBe(false);
  });
});

describe("vocabulary extensions in words (REQ-INP-22, 25; REQ-RPT-23)", () => {
  it("the ORB + CPR sample reads its levels, exits and partial exit in plain English", () => {
    const rows = describeStrategy(validStrategy("orb-cpr-sample-with-answers") as never, inst);
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    const entry = treeLines(by.entry!.tree ?? []).join("\n");
    expect(entry).toContain("Opening range 15 min low is above Pivots TC");
    expect(entry).toContain("Candle range is at or below 70");
    expect(entry).toContain("Pivots CPR width % is at or below 0.4");
    expect(by.exit_rule!.setting).toContain("Target when the index reaches Pivots R2 (calls) / Pivots S2 (puts)");
    expect(by.partial_exit!.setting).toBe(
      "Close 50% of the lots when the index reaches Pivots R1 (calls) / Pivots S1 (puts); the rest exits if the index breaks back past that candle's low (or high)",
    );
    expect(by.trail_to_cost!.setting).toBe("Stop moves to the entry price after a gain of 25 points");
    expect(treeLines(by.exit_conditions!.tree ?? []).join("\n")).toContain("Exit a call when:");
    expect(by.exit_conditions!.step).toBe("exit");
  });
});

describe("mirror swaps pivot and opening-range sides (AC-INP-20)", () => {
  it("TC↔BC, high↔low, flips direction, keeps direction-free filters and flags swaps", () => {
    const or = (o: string) => ({ ind: "or15", output: o });
    const piv = (o: string) => ({ ind: "piv", output: o });
    const call = {
      type: "all",
      conditions: [
        { type: "compare", left: or("low"), op: "gt", right: piv("tc") },
        { type: "compare", left: { price: "close" }, op: "gt", right: or("high") },
        { type: "compare", left: { candle: "range" }, op: "lte", right: { const: 70 } },
        { type: "compare", left: piv("cpr_width_pct"), op: "lte", right: { const: 0.4 } },
      ],
    };
    const r = mirror(call);
    const kids = (r.tree.conditions as Record<string, unknown>[]);
    expect(kids[0]).toEqual({ type: "compare", left: or("high"), op: "lt", right: piv("bc") });
    expect(kids[1]).toEqual({ type: "compare", left: { price: "close" }, op: "lt", right: or("low") });
    expect(kids[2]!.op).toBe("lte"); // a candle-size filter has no direction
    expect(kids[3]!.op).toBe("lte");
    expect(r.needsReview).toEqual(expect.arrayContaining(["/conditions/0/left", "/conditions/0/right", "/conditions/1/right"]));
  });
});

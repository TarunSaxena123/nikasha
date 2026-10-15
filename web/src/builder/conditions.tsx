"use client";
// Indicator manager (REQ-INP-12, 13; D1) and condition editor (REQ-INP-14; D2).
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { VWAP_NOTE } from "@/copy/glossary";
import { conditionText, indicatorName } from "@/strategy/describe";
import { Chips, NumberInput } from "./fields";

type AnyRec = Record<string, unknown>;
type Node = AnyRec & { type: string };
export const MAX_DEPTH = 4;
export const MAX_PER_SIDE = 30;

const IND_TYPES: { type: string; label: string; params: { key: string; label: string; chips: (string | number)[] }[] }[] = [
  { type: "EMA", label: "EMA", params: [{ key: "period", label: "Period", chips: [9, 20, 21, 50, 200] }, { key: "source", label: "Price", chips: ["close", "open", "high", "low"] }] },
  { type: "SMA", label: "SMA", params: [{ key: "period", label: "Period", chips: [9, 20, 21, 50, 200] }, { key: "source", label: "Price", chips: ["close", "open", "high", "low"] }] },
  { type: "RSI", label: "RSI", params: [{ key: "period", label: "Period", chips: [14] }] },
  { type: "ADX", label: "ADX", params: [{ key: "period", label: "Period", chips: [14] }] },
  { type: "SUPERTREND", label: "Supertrend", params: [{ key: "period", label: "Period", chips: [10] }, { key: "multiplier", label: "Multiplier", chips: [3, 2] }] },
  { type: "MACD", label: "MACD", params: [{ key: "fast", label: "Fast", chips: [12] }, { key: "slow", label: "Slow", chips: [26] }, { key: "signal", label: "Signal", chips: [9] }] },
  { type: "BBANDS", label: "Bollinger Bands", params: [{ key: "period", label: "Period", chips: [20] }, { key: "stddev", label: "Standard deviations", chips: [2] }, { key: "source", label: "Price", chips: ["close"] }] },
];

const OUTPUTS: Record<string, { key: string; label: string }[]> = {
  EMA: [{ key: "value", label: "" }], SMA: [{ key: "value", label: "" }], RSI: [{ key: "value", label: "" }],
  ADX: [{ key: "value", label: "" }, { key: "plus_di", label: "+DI" }, { key: "minus_di", label: "−DI" }],
  SUPERTREND: [{ key: "value", label: "line" }],
  MACD: [{ key: "value", label: "line" }, { key: "signal", label: "signal line" }, { key: "hist", label: "histogram" }],
  BBANDS: [{ key: "upper", label: "upper band" }, { key: "middle", label: "middle band" }, { key: "lower", label: "lower band" }],
};

/** Hidden, stable id from the type (params are chosen after adding); a numeric suffix avoids clashes. Never shown. */
export function indicatorId(ind: AnyRec, existing: string[]): string {
  const t = String(ind.type).toLowerCase().replace("supertrend", "st").replace("bbands", "bb");
  const parts = ["period", "fast", "slow", "signal", "multiplier", "stddev"].filter((k) => ind[k] !== undefined).map((k) => String(ind[k]).replace(".", "_"));
  let id = (t + parts.join("x")).replace(/[^a-z0-9_]/g, "").slice(0, 28) || t;
  if (!/^[a-z]/.test(id)) id = `i${id}`;
  let n = 2;
  const base = id;
  while (existing.includes(id)) id = `${base}_${n++}`;
  return id;
}

export function IndicatorManager({ indicators, onChange, usedIds }: { indicators: Record<string, AnyRec>; onChange: (next: Record<string, AnyRec>) => void; usedIds: Set<string> }) {
  const [adding, setAdding] = useState(false);
  const ids = Object.keys(indicators);
  const update = (id: string, ind: AnyRec) => onChange({ ...indicators, [id]: ind });
  return (
    <div className="space-y-3" data-testid="indicators">
      {ids.length === 0 && <p className="text-sm text-ink-muted">No indicators yet.</p>}
      {ids.map((id) => {
        const ind = indicators[id]!;
        const spec = IND_TYPES.find((t) => t.type === ind.type)!;
        return (
          <div key={id} className="rounded-md border border-line p-3">
            <div className="flex items-center justify-between">
              <strong className="text-sm">{indicatorName(ind)}</strong>
              <button type="button" className="text-xs text-risk underline disabled:opacity-40" disabled={usedIds.has(id)}
                title={usedIds.has(id) ? "Remove the conditions that use it first" : undefined}
                onClick={() => { const n = { ...indicators }; delete n[id]; onChange(n); }}>
                Remove
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
              {spec.params.map((p) => (
                <label key={p.key} className="text-sm">
                  {p.label}{" "}
                  {p.key === "source" ? (
                    <select aria-label={`${spec.label} ${p.label}`} className="rounded-md border border-line px-2 py-1" value={(ind.source as string) ?? ""} onChange={(e) => update(id, { ...ind, source: e.target.value || undefined })}>
                      <option value="">Choose…</option>
                      {["close", "open", "high", "low"].map((s) => <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  ) : (
                    <NumberInput label={`${spec.label} ${p.label}`} className="w-20" value={ind[p.key] as number | undefined} onChange={(v) => update(id, { ...ind, [p.key]: v })} />
                  )}
                  <Chips label={p.label} values={p.chips} onPick={(v) => update(id, { ...ind, [p.key]: p.key === "source" ? v : Number(v) })} />
                </label>
              ))}
            </div>
          </div>
        );
      })}
      {ids.length < 20 && (adding ? (
        <div className="rounded-md border border-dashed border-line p-3" role="group" aria-label="Choose an indicator">
          <div className="flex flex-wrap gap-2">
            {IND_TYPES.map((t) => (
              <Button key={t.type} variant="secondary" onClick={() => { onChange({ ...indicators, [indicatorId({ type: t.type }, ids)]: { type: t.type } }); setAdding(false); }}>
                {t.label}
              </Button>
            ))}
            <Button variant="secondary" disabled aria-describedby="vwap-note">VWAP</Button>
          </div>
          <p id="vwap-note" className="mt-2 text-xs text-ink-muted">{VWAP_NOTE}</p>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>Add indicator</Button>
      ))}
    </div>
  );
}

// ---------- condition rows ----------

const OPS = [
  { key: "gt", label: "is above" }, { key: "lt", label: "is below" }, { key: "gte", label: "is at or above" }, { key: "lte", label: "is at or below" },
  { key: "cross_above", label: "crosses above" }, { key: "cross_below", label: "crosses below" },
  { key: "turns_up", label: "turns green" }, { key: "turns_down", label: "turns red" },
  { key: "state_up", label: "is green" }, { key: "state_down", label: "is red" },
  { key: "rising", label: "is rising" }, { key: "falling", label: "is falling" },
];

function opOf(n: Node): string {
  if (n.type === "compare") return String(n.op ?? "gt");
  if (n.type === "cross") return n.direction === "below" ? "cross_below" : "cross_above";
  if (n.type === "turns") return n.to === "down" ? "turns_down" : "turns_up";
  if (n.type === "state") return n.is === "down" ? "state_down" : "state_up";
  if (n.type === "slope") return n.direction === "down" ? "falling" : "rising";
  return "gt";
}

function leftOf(n: Node): AnyRec | undefined {
  if (n.type === "slope") return n.operand as AnyRec | undefined;
  if (n.type === "turns" || n.type === "state") return n.ind ? { ind: n.ind, output: "value" } : undefined;
  return n.left as AnyRec | undefined;
}

function operandKey(o: AnyRec | undefined): string {
  if (!o) return "";
  if ("ind" in o) return `ind:${o.ind}:${o.output}`;
  if ("price" in o) return `price:${o.price}`;
  if ("vix" in o) return `vix:${o.vix}`;
  return "";
}

function operandFromKey(k: string): AnyRec | undefined {
  const [kind, a, b] = k.split(":");
  if (kind === "ind") return { ind: a, output: b };
  if (kind === "price") return { price: a };
  if (kind === "vix") return { vix: a };
  return undefined;
}

export function buildNode(op: string, left: AnyRec | undefined, right: AnyRec | undefined, lookback: number | undefined): Node {
  if (op.startsWith("cross_")) return { type: "cross", left, direction: op === "cross_above" ? "above" : "below", right };
  if (op.startsWith("turns_")) return { type: "turns", ind: left?.ind, to: op === "turns_up" ? "up" : "down" };
  if (op.startsWith("state_")) return { type: "state", ind: left?.ind, is: op === "state_up" ? "up" : "down" };
  if (op === "rising" || op === "falling") return { type: "slope", operand: left, direction: op === "rising" ? "up" : "down", lookback };
  return { type: "compare", left, op, right };
}

function OperandSelect({ value, onChange, indicators, label, supertrendOnly }: { value: AnyRec | undefined; onChange: (o: AnyRec | undefined) => void; indicators: Record<string, AnyRec>; label: string; supertrendOnly?: boolean }) {
  const opts: { key: string; label: string }[] = [];
  for (const [id, ind] of Object.entries(indicators)) {
    if (supertrendOnly && ind.type !== "SUPERTREND") continue;
    for (const o of OUTPUTS[String(ind.type)] ?? []) {
      opts.push({ key: `ind:${id}:${o.key}`, label: `${indicatorName(ind)}${o.label ? ` ${o.label}` : ""}` });
    }
  }
  if (!supertrendOnly) {
    for (const p of ["close", "open", "high", "low"]) opts.push({ key: `price:${p}`, label: `Candle ${p}` });
    opts.push({ key: "vix:close", label: "India VIX (close)" });
  }
  return (
    <select aria-label={label} className="rounded-md border border-line px-2 py-1 text-sm" value={operandKey(value)} onChange={(e) => onChange(operandFromKey(e.target.value))}>
      <option value="">Choose…</option>
      {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

export function ConditionRow({ node, onChange, indicators, highlight }: { node: Node; onChange: (n: Node) => void; indicators: Record<string, AnyRec>; highlight?: boolean }) {
  const op = opOf(node);
  const left = leftOf(node);
  const right = (node.right as AnyRec | undefined) ?? undefined;
  const isCmp = node.type === "compare" || node.type === "cross";
  const rightIsNumber = right ? "const" in right : true;
  const offset = right && !("const" in right) ? (right.offset as AnyRec | undefined) : undefined;
  const set = (o: string, l = left, r = right, lb = node.lookback as number | undefined) => onChange(buildNode(o, l, r, lb));
  const withOffset = (kind: "" | "pts" | "pct", v: number | undefined) => {
    if (!right || "const" in right) return;
    const base = { ...right };
    delete base.offset;
    set(op, left, kind ? { ...base, offset: { [kind]: v } } : base);
  };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <OperandSelect label="What to check" value={left} indicators={indicators} supertrendOnly={op.startsWith("turns") || op.startsWith("state")} onChange={(o) => set(op, o)} />
        <select aria-label="Condition" className="rounded-md border border-line px-2 py-1" value={op} onChange={(e) => set(e.target.value)}>
          {OPS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        {isCmp && (
          <>
            <select aria-label="Compare with" className="rounded-md border border-line px-2 py-1" value={rightIsNumber ? "number" : "operand"}
              onChange={(e) => set(op, left, e.target.value === "number" ? { const: undefined } : undefined)}>
              <option value="number">a number</option>
              <option value="operand">another value</option>
            </select>
            {rightIsNumber ? (
              <span className={highlight ? "rounded ring-2 ring-accent" : ""} title={highlight ? "Copied from the call side: please check this number" : undefined}>
                <NumberInput label="Number" className="w-24" value={right?.const as number | undefined} onChange={(v) => set(op, left, { const: v })} />
              </span>
            ) : (
              <>
                <OperandSelect label="Other value" value={right} indicators={indicators} onChange={(o) => set(op, left, o)} />
                <select aria-label="Margin" className="rounded-md border border-line px-2 py-1" value={offset ? ("pts" in offset ? "pts" : "pct") : ""} onChange={(e) => withOffset(e.target.value as "" | "pts" | "pct", undefined)}>
                  <option value="">no margin</option>
                  <option value="pts">+ points</option>
                  <option value="pct">+ %</option>
                </select>
                {offset && <NumberInput label="Margin" className="w-20" value={(offset.pts ?? offset.pct) as number | undefined} onChange={(v) => withOffset("pts" in offset ? "pts" : "pct", v)} />}
              </>
            )}
          </>
        )}
        {node.type === "slope" && (
          <label>over <NumberInput label="Candles back" className="w-16" min={1} max={50} step={1} value={node.lookback as number | undefined} onChange={(v) => set(op, left, right, v)} /> candles</label>
        )}
      </div>
      <p className="text-xs text-ink-muted">Reads as: {conditionText(node, { indicators, volName: "India VIX" }).text}</p>
    </div>
  );
}

function count(n: Node): number {
  return n.type === "all" || n.type === "any" ? ((n.conditions as Node[]) ?? []).reduce((a, c) => a + count(c), 0) : 1;
}

export function ConditionGroup({ node, onChange, indicators, depth = 1, onRemove, highlights = [], path = "", total }: {
  node: Node; onChange: (n: Node) => void; indicators: Record<string, AnyRec>; depth?: number; onRemove?: () => void;
  highlights?: string[]; path?: string; total?: number;
}) {
  const kids = (node.conditions as Node[] | undefined) ?? [];
  const all = total ?? count(node);
  const setKids = (k: Node[]) => onChange({ ...node, conditions: k });
  const move = (i: number, d: number) => {
    const k = [...kids];
    const [x] = k.splice(i, 1);
    k.splice(i + d, 0, x!);
    setKids(k);
  };
  const full = all >= MAX_PER_SIDE;
  return (
    <div className="space-y-2 rounded-md border border-line p-3" data-depth={depth}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select aria-label="Group type" className="rounded-md border border-line px-2 py-1" value={node.type} onChange={(e) => onChange({ ...node, type: e.target.value })}>
          <option value="all">All of these</option>
          <option value="any">Any of these</option>
        </select>
        {onRemove && <button type="button" className="text-xs text-risk underline" onClick={onRemove}>Remove group</button>}
      </div>
      {kids.map((k, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col">
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-xs disabled:opacity-30">▲</button>
            <button type="button" aria-label="Move down" disabled={i === kids.length - 1} onClick={() => move(i, 1)} className="text-xs disabled:opacity-30">▼</button>
          </div>
          <div className="flex-1">
            {k.type === "all" || k.type === "any" ? (
              <ConditionGroup node={k} indicators={indicators} depth={depth + 1} total={all} highlights={highlights} path={`${path}/conditions/${i}`}
                onChange={(n) => setKids(kids.map((x, j) => (j === i ? n : x)))} onRemove={() => setKids(kids.filter((_, j) => j !== i))} />
            ) : (
              <ConditionRow node={k} indicators={indicators} highlight={highlights.includes(`${path}/conditions/${i}/right`)}
                onChange={(n) => setKids(kids.map((x, j) => (j === i ? n : x)))} />
            )}
          </div>
          {k.type !== "all" && k.type !== "any" && <button type="button" aria-label="Remove condition" className="text-xs text-risk" onClick={() => setKids(kids.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={full} onClick={() => setKids([...kids, { type: "compare", left: undefined, op: "gt", right: { const: undefined } }])}>Add condition</Button>
        <Button variant="secondary" disabled={full || depth >= MAX_DEPTH} onClick={() => setKids([...kids, { type: "all", conditions: [] }])}>Add group</Button>
        {full && <span className="text-xs text-ink-muted">Up to {MAX_PER_SIDE} conditions per side.</span>}
        {depth >= MAX_DEPTH && <span className="text-xs text-ink-muted">Groups can nest up to {MAX_DEPTH} levels.</span>}
      </div>
    </div>
  );
}

/** Indicator ids used anywhere in the entry conditions (an indicator in use can't be removed). */
export function usedIndicatorIds(entry: AnyRec): Set<string> {
  const ids = new Set<string>();
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const r = n as AnyRec;
    if (typeof r.ind === "string") ids.add(r.ind);
    for (const v of Object.values(r)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk(entry);
  return ids;
}

// A draft = a partial strategy plus web-only bookkeeping (feature 03 design §1.1).
import type { Strategy } from "@/api/types";

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type StrategyDraft = DeepPartial<Strategy> & Record<string, unknown>;

export interface LeftOutRule {
  quote: string;
  reason: string;
}

export interface Draft {
  strategy: StrategyDraft;
  origin: "TEMPLATE" | "BUILDER" | "UPLOAD";
  confirmed: { lots: boolean; lotSize: boolean };
  leftOut: LeftOutRule[]; // unsupported rules from an upload, acknowledged by the user
  pending: string[]; // upload questions still unanswered (blocks evaluation)
  hiddenPutSet?: unknown; // a Put condition set kept while option type is Call only
  pendingExit?: "CANDLES"; // positional exit question answered "exit after N candles", N still to come
  advancedOn?: string[]; // builder: advanced switches turned on whose fields may still be empty
}

/** Apply question patches to a draft. The pseudo-path /__pendingExit marks a chosen-but-unvalued exit. */
export function applyToDraft(d: Draft, ops: { op: string; path: string; value?: unknown }[], apply: (s: StrategyDraft, ops: never[]) => StrategyDraft): Draft {
  const real = ops.filter((o) => o.path !== "/__pendingExit");
  const next: Draft = { ...d, strategy: apply(d.strategy, real as never[]) };
  if (ops.some((o) => o.path === "/__pendingExit")) next.pendingExit = "CANDLES";
  if ((next.strategy.advanced as Record<string, unknown> | undefined)?.exit_after_candles !== undefined) delete next.pendingExit;
  return next;
}

export function emptyDraft(origin: Draft["origin"] = "BUILDER"): Draft {
  return {
    strategy: { schema_version: "1.0", underlying: "NIFTY50", indicators: {} },
    origin,
    confirmed: { lots: false, lotSize: false },
    leftOut: [],
    pending: [],
  };
}

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/** The draft as a complete strategy (callers check completeness and validation first). */
export function asStrategy(d: Draft): Strategy {
  return clone(d.strategy) as unknown as Strategy;
}

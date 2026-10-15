// Types come from the contracts (generated); never hand-written (frontend.md §1).
import type { components } from "@/generated/api";
import type { Strategy } from "@/generated/strategy";

type S = components["schemas"];
export type { Strategy };
export type MetaResponse = S["MetaResponse"];
export type InstrumentSummary = S["InstrumentSummary"];
export type EvaluationSettings = S["EvaluationSettings"];
export type Costs = EvaluationSettings["costs"];
export type CostKey = keyof Costs;
export type EvaluateRequest = { strategy: Strategy; settings: EvaluationSettings };
export type Report = S["Report"];
export type Metrics = S["Metrics"];
export type BreakdownRow = S["BreakdownRow"];
export type Trade = S["Trade"];
export type ApiError = S["Error"];
export type Problem = NonNullable<ApiError["error"]["problems"]>[number];
export type SuggestionPlanRequest = Omit<S["SuggestionPlanRequest"], "strategy"> & { strategy: Strategy };
export type SuggestionPlanResponse = S["SuggestionPlanResponse"];
export type Variant = SuggestionPlanResponse["variants"][number];
export type ExtractionResult = S["ExtractionResult"];
export type Question = S["Question"];
export type ExtractionItem = ExtractionResult["items"][number];
export type JsonPatchOp = S["JsonPatch"][number];

export const COST_KEYS: CostKey[] = [
  "brokerage_per_order",
  "stt_sell_pct",
  "stt_exercise_pct",
  "exchange_txn_pct",
  "sebi_per_crore",
  "stamp_buy_pct",
  "gst_pct",
  "slippage_pts",
];

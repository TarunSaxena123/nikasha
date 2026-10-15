// Work held in this tab and how to get back to it (REQ-BEG-20, 21; feature 05 design §1.8).
import { emptySettings, emptyWhatIf, type EvaluationState, type Store } from "@/store";
import type { Draft } from "@/strategy/draft";

type AnyRec = Record<string, unknown>;

/** A template or upload draft, a builder draft with any user input, or a report. */
export function hasWork(draft: Draft | null, evaluation: EvaluationState): boolean {
  if (evaluation.status === "done") return true;
  if (!draft) return false;
  if (draft.origin !== "BUILDER") return true;
  const s = draft.strategy as AnyRec;
  const leg = ((s.legs as AnyRec[] | undefined) ?? [])[0] ?? {};
  return !!(
    leg.action || leg.option_type || leg.expiry || leg.strike || s.timeframe_min || s.holding || s.entry || s.exit || s.advanced ||
    Object.keys((s.indicators as AnyRec | undefined) ?? {}).length || draft.confirmed.lots || draft.confirmed.lotSize
  );
}

/** Where "Continue" leads, and its label. */
export function continueTarget(draft: Draft | null, evaluation: EvaluationState): { href: string; label: string } {
  if (evaluation.status === "done") return { href: "/report", label: "View your report" };
  if (draft?.origin === "UPLOAD") return { href: "/upload", label: "Continue with your upload" };
  if (draft?.origin === "TEMPLATE") return { href: "/review", label: "Continue to review" };
  return { href: "/build", label: "Continue building" };
}

/** What the panel calls the strategy. */
export function workName(draft: Draft | null, evaluation: EvaluationState): string {
  const name = (draft?.strategy as AnyRec | undefined)?.name as string | undefined;
  if (name && draft?.origin !== "UPLOAD") return name;
  if (draft?.origin === "UPLOAD") return "your uploaded strategy";
  if (evaluation.status === "done") return evaluation.strategyName;
  return "the strategy you're building";
}

/** Everything a new strategy must not inherit. */
export function clearedWork(): Partial<Store> {
  return {
    draft: null,
    settings: emptySettings(),
    extraction: { status: "idle", result: null, answers: {}, message: null },
    evaluation: { status: "idle" },
    reviewProblems: [],
    whatIf: emptyWhatIf(),
    suggestions: { status: "idle", notOffered: null, runs: [], message: null },
  };
}

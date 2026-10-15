"use client";
// Evaluation state machine (feature 02 design §1.2): idle → running → done | error; Cancel → review.
import { ApiFailure, evaluate } from "@/api/client";
import type { EvaluateRequest, Strategy } from "@/api/types";
import { emptyWhatIf, useStore } from "@/store";

let controller: AbortController | null = null;
let nextId = 1;
export const READY_TITLE = "✓ Report ready — Nikasha";

/** Rough duration estimate shown as an estimate (feature 02 design §1.3). */
export function estimateMs(timeframe: number, start: string, end: string): number {
  const years = Math.max((Date.parse(end) - Date.parse(start)) / (365.25 * 86400000), 0.1);
  const perYear = timeframe === 1 ? 6000 : timeframe === 3 ? 3000 : timeframe === 5 ? 2000 : 1500;
  return Math.round(4000 + years * perYear);
}

export async function startEvaluation(request: EvaluateRequest, navigate: (path: string) => void): Promise<void> {
  const { set } = useStore.getState();
  controller?.abort();
  controller = new AbortController();
  const requestId = nextId++;
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    try {
      void Notification.requestPermission();
    } catch {
      // Older browsers: no notification, the tab title still changes.
    }
  }
  set({
    evaluation: { status: "running", requestId, startedAt: Date.now(), estimateMs: estimateMs(request.strategy.timeframe_min, request.settings.period.start, request.settings.period.end) },
    reviewProblems: [],
    whatIf: emptyWhatIf(),
    suggestions: { status: "idle", notOffered: null, runs: [], message: null },
  });
  navigate("/evaluate");
  try {
    const report = await evaluate(request, controller.signal);
    const ev = useStore.getState().evaluation;
    if (ev.status !== "running" || ev.requestId !== requestId) return; // cancelled or superseded
    set({ evaluation: { status: "done", requestId, report, strategyName: request.strategy.name ?? "Your strategy", request } });
    document.title = READY_TITLE;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Your Nikasha report is ready");
      } catch {
        // ignore
      }
    }
    navigate("/report");
  } catch (e) {
    const ev = useStore.getState().evaluation;
    if (ev.status !== "running" || ev.requestId !== requestId) return;
    const f = e instanceof ApiFailure ? e : new ApiFailure("failed", 0, null, "Something went wrong. Please try again.");
    if (f.kind === "aborted") return;
    if (f.kind === "invalid") {
      set({ evaluation: { status: "idle" }, reviewProblems: f.problems.length ? f.problems : [{ field_label: "Strategy", message: f.userMessage }] });
      navigate("/review");
      return;
    }
    set({ evaluation: { status: "error", kind: f.kind === "busy" ? "busy" : "failed", message: f.userMessage } });
  }
}

export function cancelEvaluation(navigate: (path: string) => void): void {
  controller?.abort();
  controller = null;
  useStore.getState().set({ evaluation: { status: "idle" } });
  navigate("/review");
}

export type { Strategy };

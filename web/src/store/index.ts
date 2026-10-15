// One in-memory store, split into slices (frontend.md §4). No persistence of any kind.
"use client";
import { create } from "zustand";
import type { CostKey, EvaluateRequest, ExtractionResult, MetaResponse, Problem, Report, Variant } from "@/api/types";
import type { Draft } from "@/strategy/draft";

export type MetaState = { status: "idle" | "loading" | "ready" | "error"; data: MetaResponse | null };

export type PeriodChoice = "full" | "1y" | "3y" | "5y" | "custom";

export interface SettingsState {
  periodChoice: PeriodChoice | null;
  period: { start: string; end: string } | null;
  costs: Partial<Record<CostKey, number | null>>;
  capital: number | null;
  checked: boolean; // "I've checked the costs and period"
}

export type EvaluationState =
  | { status: "idle" }
  | { status: "running"; requestId: number; startedAt: number; estimateMs: number }
  | { status: "done"; requestId: number; report: Report; strategyName: string; request: EvaluateRequest }
  | { status: "error"; kind: "busy" | "failed"; message: string };

export interface ExtractionState {
  status: "idle" | "reading" | "questions" | "error";
  result: ExtractionResult | null;
  answers: Record<string, unknown>;
  message: string | null;
}

export interface WhatIfState {
  requestId: number;
  field: string | null;
  value: number | null;
  status: "idle" | "running" | "done" | "error";
  report: Report | null;
  message: string | null;
}

export interface SuggestionRun {
  variant: Variant;
  status: "queued" | "running" | "done" | "error";
  report: Report | null;
}

export interface SuggestionsState {
  status: "idle" | "planning" | "running" | "done" | "error";
  notOffered: string | null;
  runs: SuggestionRun[];
  message: string | null;
}

interface Store {
  meta: MetaState;
  draft: Draft | null;
  settings: SettingsState;
  extraction: ExtractionState;
  evaluation: EvaluationState;
  reviewProblems: Problem[];
  whatIf: WhatIfState;
  suggestions: SuggestionsState;
  set: (partial: Partial<Omit<Store, "set">>) => void;
}

export const emptySettings = (): SettingsState => ({
  periodChoice: null,
  period: null,
  costs: {},
  capital: null,
  checked: false,
});

export const emptyWhatIf = (): WhatIfState => ({
  requestId: 0,
  field: null,
  value: null,
  status: "idle",
  report: null,
  message: null,
});

export const useStore = create<Store>()((set) => ({
  meta: { status: "idle", data: null },
  draft: null,
  settings: emptySettings(),
  extraction: { status: "idle", result: null, answers: {}, message: null },
  evaluation: { status: "idle" },
  reviewProblems: [],
  whatIf: emptyWhatIf(),
  suggestions: { status: "idle", notOffered: null, runs: [], message: null },
  set: (partial) => set(partial),
}));

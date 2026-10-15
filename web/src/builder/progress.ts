// Step status for the builder (REQ-INP-05; D4): a step is complete when it has no missing inputs
// and no validation problems; forward navigation only to completed steps (+ the first open one).
import type { MetaResponse } from "@/api/types";
import { completeness, type StepId } from "@/strategy/completeness";
import type { Draft } from "@/strategy/draft";
import { stepFor } from "@/strategy/fieldMap";
import { validate, type Problem } from "@/strategy/validate";
import { advancedIncomplete } from "./advanced";

export const STEPS: { id: StepId; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "strike", label: "Strike" },
  { id: "entry", label: "Entry" },
  { id: "exit", label: "Exit" },
];

export interface StepIssue {
  label: string;
  message: string;
}

export function stepIssues(draft: Draft, meta: MetaResponse | null): Record<StepId, StepIssue[]> {
  const out: Record<StepId, StepIssue[]> = { basics: [], strike: [], entry: [], exit: [], advanced: [] };
  const missing = completeness(draft, meta);
  for (const m of missing) {
    out[m.step].push({ label: m.label, message: m.key === "lots" || m.key === "lot_size" ? "please confirm" : "not set yet" });
  }
  // The whole-strategy checks (schema + SEM) run once nothing is missing; until then their messages
  // would only repeat the missing inputs. The strike distance rule (SEM-06) is checked straight away.
  const interval = meta?.instruments[0]?.strike_interval ?? 50;
  for (const leg of ((draft.strategy.legs ?? []) as { strike?: { moneyness?: string; distance_pts?: number } }[])) {
    const st = leg.strike;
    if (st && (st.moneyness === "ITM" || st.moneyness === "OTM") && typeof st.distance_pts === "number") {
      const d = st.distance_pts;
      if (d <= 0 || Math.abs(d / interval - Math.round(d / interval)) > 1e-9) {
        out.strike.push({ label: "Strike", message: `For ITM or OTM, enter a distance in steps of ${interval} points (e.g. ${interval * 2}).` });
        break;
      }
    }
  }
  const problems: Problem[] = meta && missing.length === 0 ? validate(draft.strategy, { meta }) : [];
  for (const p of problems) {
    const st = stepFor(p);
    if (st === "settings") continue;
    // Missing inputs are already listed by completeness; skip schema echoes of the same thing.
    if (!p.rule && out[st].some((i) => i.label === p.field_label)) continue;
    out[st].push({ label: p.field_label, message: p.message });
  }
  for (const label of advancedIncomplete(draft)) out.advanced.push({ label, message: "enter a value or switch it off" });
  return out;
}

export function firstIncomplete(issues: Record<StepId, StepIssue[]>): StepId | null {
  for (const s of STEPS) if (issues[s.id].length) return s.id;
  return issues.advanced.length ? "advanced" : null;
}

/** Can the user open `target` now? Back freely; forward only up to the first incomplete step. */
export function canOpen(target: StepId, issues: Record<StepId, StepIssue[]>): boolean {
  if (target === "advanced") return true; // optional, and where multi-leg details are edited
  const order: StepId[] = ["basics", "strike", "entry", "exit", "advanced"];
  const first = firstIncomplete(issues);
  if (!first || first === "advanced") return true;
  return order.indexOf(target) <= order.indexOf(first);
}

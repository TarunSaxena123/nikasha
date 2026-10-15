// What-if copy (feature 05 design §1.6). One change at a time keeps the sentence truthful.
export const WHATIF_RANGES = {
  stop_loss: { PCT_PREMIUM: { min: 10, max: 60, step: 5 }, POINTS: { min: 5, max: 100, step: 5 } },
  target: { PCT_PREMIUM: { min: 20, max: 150, step: 10 }, POINTS: { min: 10, max: 200, step: 10 } },
} as const;

export const NOT_APPLICABLE =
  "What-if sliders work when the stop-loss or target is set in % of premium or in points. This strategy uses {types}.";

export function fieldLabel(field: "stop_loss" | "target", type: "PCT_PREMIUM" | "POINTS"): string {
  return `${field === "stop_loss" ? "stop-loss" : "target"}${type === "POINTS" ? " (points)" : ""}`;
}

export function valueText(type: "PCT_PREMIUM" | "POINTS", v: number): string {
  return type === "PCT_PREMIUM" ? `${v}%` : `${v} points`;
}

/** "With a stop-loss of 25% instead of 30%, this strategy would have made ₹38,900 (₹2,350 less), with a largest fall of ₹16,950." */
export function whatIfSentence(p: { label: string; next: string; old: string; madeLost: "made" | "lost"; absNet: string; diff: string; moreLess: "more" | "less"; maxDd: string }): string {
  return `With a ${p.label} of ${p.next} instead of ${p.old}, this strategy would have ${p.madeLost} ${p.absNet} (${p.diff} ${p.moreLess}), with a largest fall of ${p.maxDd}.`;
}

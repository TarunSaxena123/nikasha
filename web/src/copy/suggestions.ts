// Suggestions copy (feature 06 design §1.1, §1.3). Past-simulated; no ranking words.
export const SUG = {
  title: "Ideas to test",
  intro: "Each idea changes one thing and re-runs the same period. These are past simulated results, not recommendations.",
  show: "Show ideas",
  planFailed: "Couldn't prepare ideas. Try again.",
  variantFailed: "Couldn't run this one",
  noUnseen: "Period doesn't include the unseen years",
  longerPeriod: "Choose a longer period to see the tuning check.",
  tryIt: "Try this version",
};

export function tuningKept(p: { isLabel: string; value: string }): string {
  return `Tuning on ${p.isLabel} would have kept your ${p.value}.`;
}

export function tuningPicked(p: { field: string; isLabel: string; pick: string; oosLabel: string; pickNet: string; origNet: string; orig: string }): string {
  return `If you had tuned the ${p.field} on ${p.isLabel}, you'd have picked ${p.pick}. On ${p.oosLabel} that choice would have made ${p.pickNet}, compared with ${p.origNet} for your ${p.orig}.`;
}

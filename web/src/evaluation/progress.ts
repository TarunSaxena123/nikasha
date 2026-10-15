export const KEEP_OPEN = "Keep this tab open. Closing it will lose your result.";

/** Time-based stage messages (feature 02 design §1.3). */
export function stageFor(elapsed: number, estimate: number): string {
  const f = elapsed / estimate;
  if (f < 0.15) return "Preparing data…";
  if (f < 0.7) return "Simulating trades…";
  if (f < 1) return "Building your report…";
  return "Still working — longer periods take a little more time.";
}

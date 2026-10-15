// Mirror from Call (feature 03 design §1.8; D3): directions flip; numbers are copied unchanged and
// flagged for review, because mirroring a threshold (55 → 45) would be a guess. Pivot and
// opening-range sides swap (R1↔S1, TC↔BC, high↔low) and are flagged too (REQ-INP-26). Comparisons
// of values with no direction (candle size, CPR width) keep their operator.
type AnyRec = Record<string, unknown>;

const FLIP_OP: Record<string, string> = { gt: "lt", lt: "gt", gte: "lte", lte: "gte" };
const SWAP_OUT: Record<string, string> = { r1: "s1", s1: "r1", r2: "s2", s2: "r2", r3: "s3", s3: "r3", tc: "bc", bc: "tc", high: "low", low: "high" };

/** The put-side version of a level or operand: swaps pivot / opening-range sides. */
export function mirrorOperand(o: AnyRec | undefined): AnyRec | undefined {
  if (!o) return o;
  if ("ind" in o && SWAP_OUT[o.output as string]) return { ...o, output: SWAP_OUT[o.output as string] };
  return { ...o };
}

const swapped = (o: AnyRec | undefined) => !!o && "ind" in o && !!SWAP_OUT[o.output as string];
const directionless = (o: AnyRec | undefined) =>
  !!o && ("candle" in o || ("ind" in o && String(o.output).startsWith("cpr_width")));

export interface MirrorResult {
  tree: AnyRec;
  needsReview: string[]; // JSON pointers (relative to the side) of copied numeric thresholds
}

function flipOffset(o: AnyRec | undefined): AnyRec | undefined {
  if (!o) return o;
  const off = o.offset as AnyRec | undefined;
  if (!off) return mirrorOperand(o);
  const flipped = "pts" in off ? { pts: -Number(off.pts) } : { pct: -Number(off.pct) };
  return { ...mirrorOperand(o), offset: flipped };
}

export function mirror(node: AnyRec, path = ""): MirrorResult {
  const t = node.type as string;
  const needs: string[] = [];
  const mark = (o: AnyRec | undefined, p: string) => {
    if (o && ("const" in o || swapped(o))) needs.push(p);
  };
  if (t === "all" || t === "any") {
    const kids = ((node.conditions as AnyRec[]) ?? []).map((c, i) => mirror(c, `${path}/conditions/${i}`));
    kids.forEach((k) => needs.push(...k.needsReview));
    return { tree: { type: t, conditions: kids.map((k) => k.tree) }, needsReview: needs };
  }
  if (t === "compare") {
    mark(node.left as AnyRec, `${path}/left`);
    mark(node.right as AnyRec, `${path}/right`);
    const keep = directionless(node.left as AnyRec) || directionless(node.right as AnyRec);
    return {
      tree: { type: t, left: flipOffset(node.left as AnyRec), op: keep ? node.op : (FLIP_OP[node.op as string] ?? node.op), right: flipOffset(node.right as AnyRec) },
      needsReview: needs,
    };
  }
  if (t === "cross") {
    mark(node.left as AnyRec, `${path}/left`);
    mark(node.right as AnyRec, `${path}/right`);
    return {
      tree: { type: t, left: flipOffset(node.left as AnyRec), direction: node.direction === "above" ? "below" : "above", right: flipOffset(node.right as AnyRec) },
      needsReview: needs,
    };
  }
  if (t === "state") return { tree: { ...node, is: node.is === "up" ? "down" : "up" }, needsReview: [] };
  if (t === "turns") return { tree: { ...node, to: node.to === "up" ? "down" : "up" }, needsReview: [] };
  if (t === "slope") return { tree: { ...node, operand: mirrorOperand(node.operand as AnyRec), direction: node.direction === "up" ? "down" : "up" }, needsReview: [] };
  return { tree: JSON.parse(JSON.stringify(node)) as AnyRec, needsReview: [] };
}

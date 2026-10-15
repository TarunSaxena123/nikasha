// Mirror from Call (feature 03 design §1.8; D3): directions flip; numbers are copied unchanged and
// flagged for review, because mirroring a threshold (55 → 45) would be a guess.
type AnyRec = Record<string, unknown>;

const FLIP_OP: Record<string, string> = { gt: "lt", lt: "gt", gte: "lte", lte: "gte" };

export interface MirrorResult {
  tree: AnyRec;
  needsReview: string[]; // JSON pointers (relative to the side) of copied numeric thresholds
}

function flipOffset(o: AnyRec | undefined): AnyRec | undefined {
  if (!o) return o;
  const off = o.offset as AnyRec | undefined;
  if (!off) return { ...o };
  const flipped = "pts" in off ? { pts: -Number(off.pts) } : { pct: -Number(off.pct) };
  return { ...o, offset: flipped };
}

export function mirror(node: AnyRec, path = ""): MirrorResult {
  const t = node.type as string;
  const needs: string[] = [];
  const mark = (o: AnyRec | undefined, p: string) => {
    if (o && "const" in o) needs.push(p);
  };
  if (t === "all" || t === "any") {
    const kids = ((node.conditions as AnyRec[]) ?? []).map((c, i) => mirror(c, `${path}/conditions/${i}`));
    kids.forEach((k) => needs.push(...k.needsReview));
    return { tree: { type: t, conditions: kids.map((k) => k.tree) }, needsReview: needs };
  }
  if (t === "compare") {
    mark(node.left as AnyRec, `${path}/left`);
    mark(node.right as AnyRec, `${path}/right`);
    return {
      tree: { type: t, left: flipOffset(node.left as AnyRec), op: FLIP_OP[node.op as string] ?? node.op, right: flipOffset(node.right as AnyRec) },
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
  if (t === "slope") return { tree: { ...node, direction: node.direction === "up" ? "down" : "up" }, needsReview: [] };
  return { tree: JSON.parse(JSON.stringify(node)) as AnyRec, needsReview: [] };
}

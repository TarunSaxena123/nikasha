// JSON Patch (RFC 6902 add / replace / remove) applied to drafts in the browser. Unlike strict
// RFC behaviour, "add"/"replace" create missing parent objects/arrays, because drafts are partial.
import type { JsonPatchOp } from "@/api/types";

type Container = Record<string, unknown> | unknown[];

function unescape(seg: string): string {
  return seg.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function pointerParts(path: string): string[] {
  return path.split("/").slice(1).map(unescape);
}

export function getAt(doc: unknown, path: string): unknown {
  let cur: unknown = doc;
  for (const seg of pointerParts(path)) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function setAt(doc: Record<string, unknown>, path: string, value: unknown): void {
  const parts = pointerParts(path);
  let cur: Container = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i]!;
    const nextIsIndex = /^\d+$/.test(parts[i + 1]!) || parts[i + 1] === "-";
    const holder = cur as Record<string, unknown>;
    if (holder[seg] === undefined || holder[seg] === null || typeof holder[seg] !== "object") {
      holder[seg] = nextIsIndex ? [] : {};
    }
    cur = holder[seg] as Container;
  }
  const last = parts[parts.length - 1]!;
  if (Array.isArray(cur)) {
    if (last === "-") cur.push(value);
    else cur[Number(last)] = value;
  } else {
    cur[last] = value;
  }
}

export function removeAt(doc: Record<string, unknown>, path: string): void {
  const parts = pointerParts(path);
  let cur: unknown = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur === null || typeof cur !== "object") return;
    cur = (cur as Record<string, unknown>)[parts[i]!];
  }
  if (cur === null || typeof cur !== "object") return;
  const last = parts[parts.length - 1]!;
  if (Array.isArray(cur)) cur.splice(Number(last), 1);
  else delete (cur as Record<string, unknown>)[last];
}

export function applyPatch<T extends Record<string, unknown>>(doc: T, ops: JsonPatchOp[]): T {
  const copy = JSON.parse(JSON.stringify(doc)) as T;
  for (const op of ops) {
    if (op.op === "remove") removeAt(copy, op.path);
    else setAt(copy, op.path, JSON.parse(JSON.stringify(op.value ?? null)));
  }
  return copy;
}

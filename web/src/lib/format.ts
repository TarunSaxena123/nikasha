// Number and date formatting (frontend.md §5.5). Rupees use Indian grouping; negatives use "−".
export const MINUS = "−";

function groupIndian(integer: string): string {
  if (integer.length <= 3) return integer;
  let head = integer.slice(0, -3);
  const tail = integer.slice(-3);
  const parts: string[] = [];
  while (head.length > 2) {
    parts.unshift(head.slice(-2));
    head = head.slice(0, -2);
  }
  if (head) parts.unshift(head);
  return `${parts.join(",")},${tail}`;
}

function roundHalfUp(x: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((Math.abs(x) + Number.EPSILON) * f) / f;
}

export function number(x: number, decimals = 0): string {
  const abs = roundHalfUp(x, decimals);
  const [int, frac] = abs.toFixed(decimals).split(".");
  const body = groupIndian(int ?? "0") + (frac ? `.${frac}` : "");
  return x < 0 && abs !== 0 ? MINUS + body : body;
}

/** ₹ amount. `signed: "always"` adds + for gains (P&L values carry a sign, never colour alone). */
export function rupees(x: number, decimals = 0, signed: "minus" | "always" | "none" = "minus"): string {
  const abs = roundHalfUp(x, decimals);
  const [int, frac] = abs.toFixed(decimals).split(".");
  const body = "₹" + groupIndian(int ?? "0") + (frac ? `.${frac}` : "");
  if (abs === 0 || signed === "none") return body;
  if (x < 0) return MINUS + body;
  return signed === "always" ? `+${body}` : body;
}

export function pct(x: number, decimals = 1): string {
  return `${number(x, decimals)}%`;
}

export function points(x: number): string {
  const t = number(x, 2);
  return t.includes(".") ? t.replace(/0+$/, "").replace(/\.$/, "") : t;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-05-14" or "2026-05-14T15:29" → "14 May 2026". */
export function day(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function period(start: string, end: string): string {
  return `${day(start)} – ${day(end)}`;
}

/** "2026-05-14T15:29" → "14 May 2026, 15:29". */
export function dateTime(ts: string): string {
  return `${day(ts)}, ${ts.slice(11, 16)}`;
}

export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function count(n: number, singular: string, plural?: string): string {
  return `${number(n)} ${n === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Strategy name → file-name slug: lower-case, non-alphanumerics → "-", ≤ 40 chars (REQ-RPT-21). */
export function slug(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");
  return s || "strategy";
}

export function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

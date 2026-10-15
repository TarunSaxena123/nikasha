// The ONLY module allowed to touch browser storage (REQ-PRV-21, lint-enforced). It stores exactly
// { accepted: true, version } under one key; nothing else, and no timestamp (REQ-PRV-06, 36).
import { DISCLAIMER_VERSION } from "./disclaimer";

export const CONSENT_KEY = "nikasha.disclaimer";
let memoryAccepted = false; // fallback when storage is blocked (REQ-PRV-08)

export function read(version: string = DISCLAIMER_VERSION): "accepted" | "not-accepted" {
  if (memoryAccepted) return "accepted";
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return "not-accepted";
    const value = JSON.parse(raw) as { accepted?: unknown; version?: unknown };
    return value.accepted === true && value.version === version ? "accepted" : "not-accepted";
  } catch {
    return "not-accepted";
  }
}

export function accept(version: string = DISCLAIMER_VERSION): void {
  memoryAccepted = true;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, version }));
  } catch {
    // Storage blocked: acceptance lasts for this page session only.
  }
}

/** Test helper: forget the in-memory flag. */
export function _resetForTests(): void {
  memoryAccepted = false;
}

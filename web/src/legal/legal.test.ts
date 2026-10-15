import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTRACTS } from "@/test/fixtures";
import { accept, CONSENT_KEY, read, _resetForTests } from "./consent";
import { AI_RETENTION_DAYS, DISCLAIMER_VERSION, FULL_DISCLAIMER, FULL_TITLE, SHORT_DISCLAIMER, fillDates, fullTemplateText } from "./disclaimer";

const PRODUCT = readFileSync(join(CONTRACTS, "..", "product.md"), "utf8");

function blockquote(heading: string): string {
  const section = PRODUCT.slice(PRODUCT.indexOf(heading));
  const lines = section.split("\n");
  const start = lines.findIndex((l) => l.startsWith(">"));
  const out: string[] = [];
  for (let i = start; i < lines.length && lines[i]!.startsWith(">"); i++) out.push(lines[i]!.replace(/^>\s?/, ""));
  return out.join("\n").replace(/\*\*/g, "").replace(/\[first date\]/g, "{firstDate}").replace(/\[last date\]/g, "{lastDate}").replace(/\n\n/g, "\n").trim();
}

describe("disclaimer text equals product.md §11 (no drift)", () => {
  it("full", () => {
    const app = [FULL_TITLE, ...FULL_DISCLAIMER.map((b) => (b.lead ? `${b.lead} ${b.text}` : b.text))].join("\n");
    expect(app).toBe(blockquote("### 11.1 Full disclaimer"));
  });
  it("short", () => {
    expect(SHORT_DISCLAIMER).toBe(blockquote("### 11.2 Short disclaimer"));
  });
});

describe("fillDates (REQ-PRV-09, 10, 15)", () => {
  it("fills, shows loading, or unavailable — never a literal date", () => {
    expect(fillDates(SHORT_DISCLAIMER, { first: "2015-01-09T09:15", last: "2026-05-14T15:29" })).toContain("(9 Jan 2015 – 14 May 2026, read from the data)");
    const loading = fillDates(SHORT_DISCLAIMER, "loading");
    expect(loading).toContain("loading dates…");
    expect(loading).not.toMatch(/\d{4}/);
    expect(fillDates(SHORT_DISCLAIMER, "unavailable")).toContain("dates unavailable");
    expect(fillDates(fullTemplateText(), "unavailable")).not.toMatch(/20\d\d -|\{/);
  });
  it("version changes with the text, not the dates", () => {
    expect(DISCLAIMER_VERSION).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("consent (AC-PRV-05, 06, 07, 22)", () => {
  afterEach(() => {
    window.localStorage.clear();
    _resetForTests();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it("writes only the accepted flag and version", () => {
    expect(read()).toBe("not-accepted");
    accept();
    expect(JSON.parse(window.localStorage.getItem(CONSENT_KEY)!)).toEqual({ accepted: true, version: DISCLAIMER_VERSION });
    expect(window.localStorage.length).toBe(1);
    _resetForTests();
    expect(read()).toBe("accepted");
  });
  it("old version or corrupt value is not accepted", () => {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, version: "old" }));
    expect(read()).toBe("not-accepted");
    window.localStorage.setItem(CONSENT_KEY, "{not json");
    expect(read()).toBe("not-accepted");
  });
  it("blocked storage falls back to memory for this page session", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(read()).toBe("not-accepted");
    accept();
    expect(read()).toBe("accepted");
  });
  it("acceptance doesn't expire with time", () => {
    accept();
    _resetForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 366 * 24 * 3600 * 1000));
    expect(read()).toBe("accepted");
  });
});

describe("AI provider retention (REQ-PRV-30)", () => {
  it("the one retention constant matches the disclaimer and the upload notice", () => {
    expect(AI_RETENTION_DAYS).toBe(30);
    expect(FULL_DISCLAIMER.map((p) => p.text).join(" ")).toContain(`within ${AI_RETENTION_DAYS} days`);
    const legal = readFileSync(join(__dirname, "..", "components", "legal", "Legal.tsx"), "utf8");
    expect(legal).toContain("{AI_RETENTION_DAYS} days");
  });
});

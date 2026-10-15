import { describe, expect, it } from "vitest";
import { count, day, number, pct, period, points, rupees, slug } from "./format";
import { applyPatch, getAt } from "./patch";
import { sha256Hex } from "./sha256";

describe("format (frontend.md §5.5)", () => {
  it("rupees with Indian grouping and minus sign", () => {
    expect(rupees(123456.5, 2)).toBe("₹1,23,456.50");
    expect(rupees(-4250)).toBe("−₹4,250");
    expect(rupees(4250, 0, "always")).toBe("+₹4,250");
    expect(rupees(0, 0, "always")).toBe("₹0");
    expect(number(10000000)).toBe("1,00,00,000");
  });
  it("percent, dates, periods, points", () => {
    expect(pct(54.25)).toBe("54.3%");
    expect(day("2026-05-14")).toBe("14 May 2026");
    expect(period("2015-01-09", "2026-05-14T15:29")).toBe("9 Jan 2015 – 14 May 2026");
    expect(points(1.5)).toBe("1.5");
    expect(points(30)).toBe("30");
    expect(count(1, "trade")).toBe("1 trade");
  });
  it("file-name slug (REQ-RPT-21)", () => {
    expect(slug("Simple Trend Follower")).toBe("simple-trend-follower");
    expect(slug("  ##  ")).toBe("strategy");
    expect(slug("x".repeat(60))).toHaveLength(40);
  });
});

describe("patch", () => {
  it("creates missing parents and never mutates the input", () => {
    const doc: Record<string, unknown> = { a: 1 };
    const out = applyPatch(doc, [{ op: "add", path: "/legs/0/action", value: "BUY" }, { op: "add", path: "/x/y", value: 2 }]);
    expect(getAt(out, "/legs/0/action")).toBe("BUY");
    expect(getAt(out, "/x/y")).toBe(2);
    expect(doc).toEqual({ a: 1 });
    expect(applyPatch(out, [{ op: "remove", path: "/x" }]).x).toBeUndefined();
  });
});

describe("sha256", () => {
  it("matches a known vector", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

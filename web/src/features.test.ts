// Unit tests for feature logic used by the screens (templates, copy, what-if, suggestions, downloads, upload).
import { describe, expect, it } from "vitest";
import { bannedPhrases, meta, reportFixture, validStrategy } from "@/test/fixtures";
import { TEMPLATES } from "@/templates";
import { validate } from "@/strategy/validate";
import { completeness } from "@/strategy/completeness";
import { emptyDraft } from "@/strategy/draft";
import { GLOSSARY, parseTerms, plainTerms } from "@/copy/glossary";
import { BUILDER_FIELD_IDS, FIELD_TOOLTIPS, METRIC_TOOLTIPS, REPORT_METRIC_KEYS } from "@/copy/tooltips";
import { INTRO, START } from "@/copy/intro";
import { SUG, tuningKept, tuningPicked } from "@/copy/suggestions";
import { NOT_APPLICABLE, whatIfSentence } from "@/copy/whatif";
import { ARTICLES, PROGRESS_ARTICLES } from "@/learn/articles";
import { changedRequest, slidersFor } from "@/report/WhatIf";
import { tuningCheck } from "@/report/Suggestions";
import { CSV_COLUMNS, cell, csvFileName, pdfFileName, tradesCsv } from "@/report/csv";
import { pdfText } from "@/report/pdf";
import { csvLegalPreamble, pdfLegalBlocks } from "@/legal/downloads";
import { checkFile } from "@/upload/logic";
import { stageFor } from "@/evaluation/progress";
import { estimateMs } from "@/evaluation/run";
import { periodFor, templateSettings, toEvaluationSettings } from "@/strategy/settings";
import type { EvaluateRequest, Report } from "@/api/types";

const M = meta();
const inst = M.instruments[0]!;

describe("templates (AC-BEG-03, 04)", () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))("%s matches its shared fixture and validates", (_, t) => {
    expect(t.strategy).toEqual(validStrategy(t.fixture));
    expect(validate(t.strategy, { meta: M, period: templateSettings(inst, t.strategy).period })).toEqual([]);
    expect(t.explanation.length).toBeGreaterThan(40);
    expect(t.riskNote.length).toBeGreaterThan(20);
  });
  it("Use this template settings are complete and confirmed (D1)", () => {
    const s = templateSettings(inst, TEMPLATES[0]!.strategy);
    expect(s.checked).toBe(true);
    expect(s.period).toEqual({ start: "2019-02-11", end: "2026-05-14" });
    const evalSettings = toEvaluationSettings(s)!;
    expect(Object.keys(evalSettings.costs)).toHaveLength(8);
    const d = { ...emptyDraft("TEMPLATE"), strategy: TEMPLATES[0]!.strategy as never, confirmed: { lots: true, lotSize: true } };
    expect(completeness(d, M)).toEqual([]);
  });
  it("only the straddle has the prominent risk note (AC-BEG-06)", () => {
    expect(TEMPLATES.filter((t) => t.prominentRisk).map((t) => t.id)).toEqual(["simple-short-straddle"]);
    expect(TEMPLATES.find((t) => t.prominentRisk)!.riskNote).toContain("much more than the premium");
  });
  it("period quick choices are clipped to availability", () => {
    expect(periodFor("1y", inst, "WEEKLY")).toEqual({ start: "2025-05-15", end: "2026-05-14" });
    expect(periodFor("full", inst, "MONTHLY").start).toBe("2015-01-09");
  });
});

describe("glossary and tooltips (AC-BEG-07, 08)", () => {
  it("covers every product.md §16 term", () => {
    const required = ["option", "ce-pe", "premium", "strike", "atm-itm-otm", "strike-interval", "expiry", "lot-size", "india-vix", "implied-volatility", "black-scholes", "intraday-positional", "stop-loss", "target", "trailing-sl", "risk-reward", "square-off", "slippage", "backtest", "equity-curve", "drawdown", "win-rate", "expectancy", "losing-streak", "in-sample-out-of-sample", "overfitting", "regime", "theta-decay", "ema-sma", "rsi", "adx", "supertrend", "macd", "vwap", "bollinger-bands", "stt"];
    expect(GLOSSARY.map((g) => g.slug).sort()).toEqual([...required].sort());
    expect(GLOSSARY.find((g) => g.slug === "vwap")!.definition).toContain("no volume and no VWAP");
  });
  it("unknown glossary slugs fail", () => {
    expect(() => parseTerms("[[nope]]")).toThrow();
    expect(plainTerms("a [[premium|price]] b")).toBe("a price b");
  });
  it("every builder field and report metric has a tooltip", () => {
    for (const k of BUILDER_FIELD_IDS) expect(FIELD_TOOLTIPS[k]?.length).toBeGreaterThan(10);
    for (const k of REPORT_METRIC_KEYS) expect(METRIC_TOOLTIPS[k]?.length).toBeGreaterThan(10);
  });
});

describe("copy scans (AC-PRV-18, AC-BEG-01, 09)", () => {
  const copyBlob = () =>
    JSON.stringify([INTRO, START, SUG, NOT_APPLICABLE, GLOSSARY, FIELD_TOOLTIPS, METRIC_TOOLTIPS, TEMPLATES.map((t) => [t.explanation, t.riskNote, t.whatItMeans]), ARTICLES.map((a) => a.body)]).toLowerCase();
  it("no banned phrase anywhere in UI copy, templates or articles", () => {
    const blob = copyBlob();
    for (const p of bannedPhrases()) expect(blob).not.toContain(p);
  });
  it("no literal date range in the intro copy", () => {
    expect(JSON.stringify(INTRO)).not.toMatch(/20\d\d/);
  });
  it("articles exist, 300–700 words, progress cards present", () => {
    expect(ARTICLES.map((a) => a.slug).sort()).toEqual(["how-option-premiums-decay", "how-to-use-nikasha", "modelled-vs-real-prices", "what-is-drawdown", "what-is-overfitting", "why-most-strategies-fail"]);
    for (const a of ARTICLES) {
      const words = plainTerms(a.body).split(/\s+/).filter(Boolean).length;
      expect(words, a.slug).toBeGreaterThanOrEqual(300);
      expect(words, a.slug).toBeLessThanOrEqual(700);
      expect(() => parseTerms(a.body)).not.toThrow();
    }
    expect(PROGRESS_ARTICLES).toHaveLength(3);
  });
});

const stfReport = reportFixture("simple-trend-follower-2023-2024");

describe("what-if (AC-BEG-10, 13)", () => {
  const req = stfReport.request as EvaluateRequest;
  it("offers SL and target sliders from the strategy's own values", () => {
    const { sliders } = slidersFor(req);
    expect(sliders.map((s) => [s.field, s.original, s.min, s.max, s.step])).toEqual([["stop_loss", 30, 10, 60, 5], ["target", 50, 20, 150, 10]]);
  });
  it("changes exactly one value and keeps the settings", () => {
    const next = changedRequest(req, "stop_loss", 25);
    expect(next.strategy.exit.stop_loss).toEqual({ type: "PCT_PREMIUM", value: 25 });
    const a = JSON.parse(JSON.stringify(next));
    a.strategy.exit.stop_loss.value = 30;
    expect(a).toEqual(req);
  });
  it("explains when sliders don't apply", () => {
    const adv = { ...req, strategy: validStrategy("sample-pdf-with-answers") };
    const r = slidersFor(adv);
    expect(r.sliders).toEqual([]);
    expect(r.types).toEqual(["a trigger-candle stop-loss", "a risk-reward target"]);
  });
  it("sentence template", () => {
    expect(whatIfSentence({ label: "stop-loss", next: "25%", old: "30%", madeLost: "made", absNet: "₹38,900", diff: "₹2,350", moreLess: "less", maxDd: "₹16,950" }))
      .toBe("With a stop-loss of 25% instead of 30%, this strategy would have made ₹38,900 (₹2,350 less), with a largest fall of ₹16,950.");
  });
});

describe("suggestions tuning check (AC-SUG-08)", () => {
  const base = stfReport.report;
  const variant = (isExp: number, oosNet: number): Report => JSON.parse(JSON.stringify({ ...base, overfit: { ...base.overfit, in_sample: { ...base.overfit.in_sample!, metrics: { ...base.overfit.in_sample!.metrics, expectancy: isExp } }, out_of_sample: { ...base.overfit.out_of_sample!, metrics: { ...base.overfit.out_of_sample!.metrics, net_pnl: oosNet } } } }));
  it("names the in-sample pick and how it did unseen", () => {
    const text = tuningCheck(base, 30, [{ value: 20, report: variant(999, -4100) }, { value: 40, report: variant(-5, 100) }], "stop-loss", (v) => `${v}%`)!;
    expect(text).toContain("you'd have picked 20%");
    expect(text).toContain("would have made −₹4,100");
    expect(text).toContain("for your 30%");
  });
  it("keeps the original when it was best in-sample", () => {
    expect(tuningCheck(base, 30, [{ value: 20, report: variant(-50, 0) }], "stop-loss", (v) => `${v}%`)).toContain("would have kept your 30%");
  });
  it("hidden when a part is missing", () => {
    const short = { ...base, overfit: { ...base.overfit, in_sample: undefined } } as Report;
    expect(tuningCheck(short, 30, [], "stop-loss", String)).toBeNull();
    expect(tuningKept({ isLabel: "x", value: "y" }) + tuningPicked({ field: "f", isLabel: "a", pick: "b", oosLabel: "c", pickNet: "d", origNet: "e", orig: "g" })).not.toMatch(/best|recommend/i);
  });
});

describe("downloads (AC-RPT-13, 14, 15; AC-PRV-10)", () => {
  it("CSV has the preamble, header and one row per trade, RFC 4180", () => {
    const csv = tradesCsv(stfReport.report, M);
    expect(csv.startsWith("﻿# Period tested: 1 Jan 2023 – 31 Dec 2024")).toBe(true);
    const lines = csv.split("\r\n");
    expect(lines.some((l) => l.startsWith("# Educational use only."))).toBe(true);
    expect(lines.some((l) => l.startsWith("# Data: Kaggle"))).toBe(true);
    const header = lines.findIndex((l) => l.startsWith("Trade #"));
    expect(lines[header]).toBe(CSV_COLUMNS.map(cell).join(","));
    expect(lines.slice(header + 1).filter(Boolean)).toHaveLength(stfReport.report.trades.length);
    expect(cell('a "b", c')).toBe('"a ""b"", c"');
  });
  it("file names", () => {
    const d = new Date(2026, 9, 15);
    expect(pdfFileName("Simple Trend Follower", d)).toBe("nikasha-report-simple-trend-follower-20261015.pdf");
    expect(csvFileName("Simple Trend Follower", d)).toBe("nikasha-trades-simple-trend-follower-20261015.csv");
  });
  it("legal blocks carry the short disclaimer, data source with dates and period", () => {
    const b = pdfLegalBlocks(M, stfReport.report.period);
    expect(b.disclaimer).toContain("9 Jan 2015 – 14 May 2026");
    expect(b.dataSource).toContain("9 Jan 2015 – 14 May 2026");
    expect(csvLegalPreamble(M, stfReport.report.period, []).every((l) => l.startsWith("# "))).toBe(true);
  });
  it("PDF text keeps meaning without unsupported glyphs", () => {
    expect(pdfText("−₹4,250 – fall… ✓")).toBe("-Rs 4,250 - fall... ");
  });
});

describe("upload checks (AC-UPL-01)", () => {
  it("refuses wrong type and size before sending", () => {
    expect(checkFile({ name: "plan.xlsx", size: 10 })).toMatch(/PDF, Word/);
    expect(checkFile({ name: "plan.pdf", size: 5 * 1024 * 1024 })).toMatch(/too large/);
    expect(checkFile({ name: "plan.PDF", size: 10 })).toBeNull();
  });
});

describe("progress (REQ-EVL-09)", () => {
  it("stage messages and estimate", () => {
    expect(stageFor(0, 10000)).toBe("Preparing data…");
    expect(stageFor(5000, 10000)).toBe("Simulating trades…");
    expect(stageFor(8000, 10000)).toBe("Building your report…");
    expect(stageFor(12000, 10000)).toMatch(/^Still working/);
    expect(estimateMs(15, "2019-02-11", "2026-05-14")).toBeGreaterThan(4000);
  });
});

describe("partial exits in downloads (AC-RPT-16)", () => {
  it("CSV has the partial exit columns, filled only for trades that had one", async () => {
    const { tradesCsv, CSV_COLUMNS } = await import("@/report/csv");
    const report = reportFixture("orb-cpr-2024").report;
    expect(CSV_COLUMNS).toEqual(expect.arrayContaining(["Partial exit time", "Partial exit quantity", "Partial exit premium(s)"]));
    const lines = tradesCsv(report, meta()).split("\r\n");
    const header = lines.findIndex((l) => l.startsWith("Trade #"));
    const col = CSV_COLUMNS.indexOf("Partial exit quantity");
    const rows = lines.slice(header + 1).filter(Boolean).map((l) => l.split(","));
    const withPartial = report.trades.filter((t) => t.partial_exit).map((t) => String(t.n));
    expect(withPartial.length).toBeGreaterThan(0);
    for (const r of rows) expect(r[col] !== "").toBe(withPartial.includes(r[0]!));
  });
});

// Legal text for every download (feature 07 design §1.4; REQ-PRV-13, 14, 16).
import type { MetaResponse } from "@/api/types";
import { day, period as fmtPeriod } from "@/lib/format";
import { SHORT_DISCLAIMER, fillDates, type DateState } from "./disclaimer";

function dates(meta: MetaResponse | null): DateState {
  const i = meta?.instruments[0];
  return i ? { first: i.data_range.first, last: i.data_range.last } : "unavailable";
}

export function dataSourceText(meta: MetaResponse | null): string {
  const src = meta?.instruments[0]?.data_source;
  return src ? `Data: ${src.name} (unofficial, not an NSE feed), ${day(src.first)} – ${day(src.last)}. ${src.url}` : "Data source details unavailable.";
}

export function pdfLegalBlocks(meta: MetaResponse | null, p: { start: string; end: string }) {
  return {
    disclaimer: fillDates(SHORT_DISCLAIMER, dates(meta)),
    dataSource: dataSourceText(meta),
    period: `Period tested: ${fmtPeriod(p.start, p.end)}`,
  };
}

export function csvLegalPreamble(meta: MetaResponse | null, p: { start: string; end: string }, settingsSummary: string[]): string[] {
  const b = pdfLegalBlocks(meta, p);
  return [b.period, ...settingsSummary, b.dataSource, b.disclaimer].map((l) => `# ${l.replace(/\r?\n/g, " ")}`);
}

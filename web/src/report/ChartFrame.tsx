"use client";
import { useState, type ReactNode } from "react";

/** Chart + caption + "Show as table" toggle (frontend.md §9; REQ-RPT-16). */
export function ChartFrame({ title, caption, chart, table }: { title: string; caption: string; chart: ReactNode; table: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className="rounded-lg border border-line bg-surface p-4" data-chart={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <button type="button" className="text-sm text-info underline" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
          {asTable ? "Show as chart" : "Show as table"}
        </button>
      </div>
      <div className="mt-3">{asTable ? table : chart}</div>
      <figcaption className="mt-2 text-xs text-ink-muted">{caption}</figcaption>
    </figure>
  );
}

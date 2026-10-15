"use client";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { Report } from "@/api/types";
import { useMeta } from "@/hooks/useMeta";
import { useStore } from "@/store";
import { describeStrategy } from "@/strategy/describe";
import { EquityAndDrawdown, HEX_PALETTE } from "./Charts";
import { csvFileName, pdfFileName, saveBlob, tradesCsv } from "./csv";

async function renderChartsOffscreen(report: Report): Promise<SVGSVGElement[]> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:760px";
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => root.render(<EquityAndDrawdown report={report} width={760} height={240} interactive={false} palette={HEX_PALETTE} />));
  await new Promise((r) => setTimeout(r, 30));
  const svgs = Array.from(host.querySelectorAll("svg.recharts-surface")).map((s) => s.cloneNode(true) as SVGSVGElement);
  root.unmount();
  host.remove();
  return svgs;
}

export function Downloads({ report, strategyName }: { report: Report; strategyName: string }) {
  const { data: meta, inst } = useMeta();
  const draft = useStore((s) => s.draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pdf = async () => {
    setBusy(true);
    setError(null);
    try {
      const { buildPdf } = await import("./pdf");
      const rules = draft ? describeStrategy(draft.strategy, inst) : [];
      const blob = await buildPdf({ report, meta, strategyName, rules, leftOut: draft?.leftOut ?? [], renderCharts: () => renderChartsOffscreen(report) });
      saveBlob(blob, pdfFileName(strategyName));
    } catch {
      setError("Couldn't create the PDF on this device. Try a desktop browser.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur" data-testid="download-bar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <button type="button" onClick={() => void pdf()} disabled={busy} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          {busy ? "Creating PDF…" : "Download PDF"}
        </button>
        {report.trades.length > 0 && (
          <button type="button" className="rounded-md border border-line px-4 py-2 text-sm" onClick={() => saveBlob(new Blob([tradesCsv(report, meta)], { type: "text/csv;charset=utf-8" }), csvFileName(strategyName))}>
            Download trades (CSV)
          </button>
        )}
        <span className="text-xs text-ink-muted">Nikasha keeps nothing: download before you close this tab.</span>
        {error && <span role="alert" className="text-sm text-risk">{error}</span>}
      </div>
    </div>
  );
}

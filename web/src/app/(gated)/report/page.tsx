"use client";
// Report screen (feature 02 design §1.4; REQ-RPT-15…18). Section order is fixed: risk before reward.
import { useEffect } from "react";
import { BackLink } from "@/components/BackLink";
import { DataSourceLine, DisclaimerShort } from "@/components/legal/Legal";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, EmptyState } from "@/components/ui/Card";
import { READY_TITLE } from "@/evaluation/run";
import { period } from "@/lib/format";
import { BACK } from "@/lib/navigation";
import { EquityAndDrawdown } from "@/report/Charts";
import { Downloads } from "@/report/Downloads";
import { Breakdowns, OverfitPanel, Sensitivity, SettingsAndNotes, TradesTable } from "@/report/Sections";
import { ResultTiles, RiskTiles } from "@/report/Tiles";
import { WhatIfPanel } from "@/report/WhatIf";
import { SuggestionsPanel } from "@/report/Suggestions";
import { useStore } from "@/store";

export default function ReportPage() {
  const evaluation = useStore((s) => s.evaluation);
  const ready = evaluation.status === "done";
  useEffect(() => {
    // The tab title says the report is ready while it is on screen (REQ-EVL-12); the next navigation restores it.
    if (ready) document.title = READY_TITLE;
    return () => {
      if (document.title === READY_TITLE) document.title = "Nikasha — The touchstone for your trading strategy";
    };
  }, [ready]);

  if (evaluation.status !== "done") {
    return (
      <main id="main" className="px-4 py-12">
        <EmptyState title="Nothing to show here." action={<ButtonLink href="/start">Choose a path</ButtonLink>}>
          Nikasha doesn&apos;t store anything, so a refreshed or closed tab starts fresh.
        </EmptyState>
      </main>
    );
  }
  const { report, strategyName } = evaluation;
  const noTrades = report.trades.length === 0;
  return (
    <>
      <main id="main" className="mx-auto max-w-6xl space-y-8 px-4 py-8" data-testid="report">
        <BackLink to={BACK["/report"]!} />
        <header data-section="header">
          <h1 className="truncate text-2xl font-semibold" title={strategyName}>{strategyName}</h1>
          <p className="mt-1 text-sm text-ink-muted">{period(report.period.start, report.period.end)} · {report.period.trading_days.toLocaleString("en-IN")} trading days</p>
          <div className="mt-2"><Badge tone="caution">Premiums modelled, not actual</Badge></div>
        </header>

        <section data-section="summary" aria-labelledby="sum" className="rounded-lg border border-line bg-surface p-5">
          <h2 id="sum" className="text-lg font-semibold">Summary</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed">{report.summary.map((p) => <p key={p}>{p}</p>)}</div>
        </section>

        <section data-section="risk" aria-labelledby="risk"><h2 id="risk" className="mb-3 text-lg font-semibold">Risk</h2><RiskTiles m={report.metrics} /></section>
        <section data-section="result" aria-labelledby="res"><h2 id="res" className="mb-3 text-lg font-semibold">Result</h2><ResultTiles m={report.metrics} /></section>

        {noTrades ? (
          <EmptyState title="No trades in this period.">
            {report.skipped.signals.length ? `Signals were skipped: ${report.skipped.signals.map((s) => `${s.reason_text} (${s.count})`).join("; ")}.` : "The entry conditions were never all true at the same time."}
          </EmptyState>
        ) : (
          <>
            <section data-section="charts"><EquityAndDrawdown report={report} /></section>
            <div data-section="breakdowns"><Breakdowns report={report} /></div>
          </>
        )}
        <div data-section="overfit"><OverfitPanel report={report} /></div>
        <div data-section="sensitivity"><Sensitivity report={report} /></div>
        <div data-section="whatif"><WhatIfPanel /></div>
        <div data-section="suggestions"><SuggestionsPanel /></div>
        {!noTrades && <div data-section="trades"><TradesTable report={report} /></div>}
        <div data-section="settings"><SettingsAndNotes report={report} /></div>
        <div data-section="disclaimer" className="space-y-1">
          <DataSourceLine />
          <DisclaimerShort />
          <p className="text-xs text-ink-muted">Engine version {report.engine_version} · generated {report.generated_at.replace("T", " ")}</p>
        </div>
      </main>
      <Downloads report={report} strategyName={strategyName} />
    </>
  );
}

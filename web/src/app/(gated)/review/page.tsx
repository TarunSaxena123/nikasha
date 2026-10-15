"use client";
// Review & Evaluate (feature 02 design §1.1; REQ-EVL-01…07). Every path ends here.
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { CostKey } from "@/api/types";
import { BackLink } from "@/components/BackLink";
import { ConfirmPrefill } from "@/components/ConfirmPrefill";
import { DisclaimerShort } from "@/components/legal/Legal";
import { RuleTable } from "@/components/RuleTable";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, EmptyState } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/Glossary";
import { startEvaluation } from "@/evaluation/run";
import { useMeta } from "@/hooks/useMeta";
import { day, period as fmtPeriod } from "@/lib/format";
import { reviewBack } from "@/lib/navigation";
import { useStore, type PeriodChoice } from "@/store";
import { completeness } from "@/strategy/completeness";
import { describeStrategy } from "@/strategy/describe";
import { asStrategy } from "@/strategy/draft";
import { stepFor } from "@/strategy/fieldMap";
import { expiryKind, periodFor, prefilledSettings, toEvaluationSettings } from "@/strategy/settings";
import { validate } from "@/strategy/validate";

const CHOICES: { key: Exclude<PeriodChoice, "custom">; label: string }[] = [
  { key: "full", label: "Full range" },
  { key: "1y", label: "Last 1 year" },
  { key: "3y", label: "Last 3 years" },
  { key: "5y", label: "Last 5 years" },
];

export default function ReviewPage() {
  const router = useRouter();
  const { inst, status: metaStatus, data: meta } = useMeta();
  const draft = useStore((s) => s.draft);
  const settings = useStore((s) => s.settings);
  const serverProblems = useStore((s) => s.reviewProblems);
  const evaluation = useStore((s) => s.evaluation);
  const set = useStore((s) => s.set);

  // Settings arrive pre-filled from meta the first time this screen sees a draft.
  useEffect(() => {
    if (draft && inst && !settings.period && settings.periodChoice === null) {
      set({ settings: prefilledSettings(inst, draft.strategy as never) });
    }
  }, [draft, inst, settings.period, settings.periodChoice, set]);

  const rows = useMemo(() => (draft ? describeStrategy(draft.strategy, inst) : []), [draft, inst]);
  const missing = useMemo(() => completeness(draft, meta), [draft, meta]);
  const problems = useMemo(() => {
    if (!draft || !meta || missing.some((m) => m.key !== "lots" && m.key !== "lot_size")) return [];
    return validate(draft.strategy, { meta, period: settings.period });
  }, [draft, meta, missing, settings.period]);

  if (!draft) {
    return (
      <main id="main" className="px-4 py-12">
        <EmptyState title="Nothing to show here." action={<ButtonLink href="/start">Choose a path</ButtonLink>}>
          Nikasha doesn&apos;t store anything, so a refreshed or closed tab starts fresh.
        </EmptyState>
      </main>
    );
  }

  const kind = expiryKind(draft.strategy as never);
  const k = inst?.expiry_kinds.find((x) => x.kind === kind);
  const evalSettings = toEvaluationSettings(settings);
  // The report held in this tab still matches what is on screen (REQ-BEG-19: going back is never a dead end).
  const heldReport = evaluation.status === "done" && !!evalSettings
    && JSON.stringify(evaluation.request) === JSON.stringify({ strategy: asStrategy(draft), settings: evalSettings });
  const s = draft.strategy as Record<string, unknown>;
  const pos = (s.position ?? {}) as { lots?: number; lot_size?: number };

  const updateSettings = (patch: Partial<typeof settings>) => set({ settings: { ...settings, ...patch, checked: false }, reviewProblems: [] });
  const setPosition = (field: "lots" | "lot_size", v: number | undefined) => {
    const next = { ...draft, strategy: { ...draft.strategy, position: { ...pos, [field]: v } }, confirmed: { ...draft.confirmed, [field === "lots" ? "lots" : "lotSize"]: v !== undefined } };
    set({ draft: next as never, reviewProblems: [] });
  };
  const confirm = (field: "lots" | "lotSize") => set({ draft: { ...draft, confirmed: { ...draft.confirmed, [field]: true } } });

  const stillNeeded: { label: string; message: string; href: string }[] = [
    ...missing.map((m) => ({
      label: m.label,
      message: m.key === "lots" || m.key === "lot_size" ? "please confirm" : "not set",
      href: m.key === "lots" || m.key === "lot_size" ? "#rules" : `/build?step=${m.step}&from=review`,
    })),
    ...(draft.pending.length ? [{ label: "Upload questions", message: "please answer the remaining questions", href: "/upload" }] : []),
    ...problems.map((p) => {
      const st = stepFor(p);
      return { label: p.field_label, message: p.message, href: st === "settings" ? "#settings" : `/build?step=${st}&from=review` };
    }),
    ...serverProblems.map((p) => {
      const st = stepFor(p);
      return { label: p.field_label, message: p.message, href: st === "settings" ? "#settings" : `/build?step=${st}&from=review` };
    }),
    ...(evalSettings ? [] : [{ label: "Costs and period", message: "every cost needs a value and the period needs dates", href: "#settings" }]),
    ...(settings.checked ? [] : [{ label: "Costs and period", message: "please tick “I've checked the costs and period”", href: "#settings" }]),
  ];
  const canEvaluate = stillNeeded.length === 0 && metaStatus === "ready" && !!evalSettings;
  const fourHourNote = s.timeframe_min === 240 && s.holding === "INTRADAY";

  return (
    <main id="main" className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to={reviewBack(draft.origin)} />
        {heldReport && <ButtonLink href="/report" variant="secondary">View report</ButtonLink>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Review your strategy</h1>
        <Badge tone="caution">Premiums modelled, not actual</Badge>
      </div>

      <Card>
        <h2 id="rules" className="mb-3 text-lg font-semibold">1. Rules</h2>
        <RuleTable
          rows={rows}
          editHref={(r) => `/build?step=${r.step}&from=review`}
          extra={(r) =>
            r.key === "lots" ? (
              <ConfirmPrefill label="Number of lots" value={pos.lots} confirmed={draft.confirmed.lots} onChange={(v) => setPosition("lots", v)} onConfirm={() => confirm("lots")} max={1000} />
            ) : r.key === "lot_size" ? (
              <ConfirmPrefill label="Lot size" value={pos.lot_size} confirmed={draft.confirmed.lotSize} onChange={(v) => setPosition("lot_size", v)} onConfirm={() => confirm("lotSize")} max={100000} note={inst?.lot_size_note} />
            ) : null
          }
        />
        {draft.leftOut.length > 0 && (
          <div className="mt-4" data-testid="left-out">
            <h3 className="font-semibold">Left out (can&apos;t be tested)</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {draft.leftOut.map((l, i) => (
                <li key={i}>&ldquo;{l.quote}&rdquo; — {l.reason}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <h2 id="settings" className="mb-3 text-lg font-semibold">2. Evaluation settings</h2>
        {!inst ? (
          <p className="text-sm text-ink-muted">Loading settings…</p>
        ) : (
          <div className="space-y-5 text-sm">
            <fieldset>
              <legend className="font-medium">Backtest period</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {CHOICES.map((c) => (
                  <label key={c.key} className="flex items-center gap-1.5">
                    <input type="radio" name="period" checked={settings.periodChoice === c.key} onChange={() => updateSettings({ periodChoice: c.key, period: periodFor(c.key, inst, kind) })} />
                    {c.label}
                  </label>
                ))}
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="period" checked={settings.periodChoice === "custom"} onChange={() => updateSettings({ periodChoice: "custom" })} />
                  Custom dates
                </label>
              </div>
              {settings.periodChoice === "custom" && k && (
                <div className="mt-2 flex flex-wrap gap-3">
                  <label>From <input type="date" className="ml-1 rounded-md border border-line px-2 py-1" min={k.available_from} max={inst.data_range.last.slice(0, 10)} value={settings.period?.start ?? ""} onChange={(e) => updateSettings({ period: { start: e.target.value, end: settings.period?.end ?? inst.data_range.last.slice(0, 10) } })} /></label>
                  <label>To <input type="date" className="ml-1 rounded-md border border-line px-2 py-1" min={k.available_from} max={inst.data_range.last.slice(0, 10)} value={settings.period?.end ?? ""} onChange={(e) => updateSettings({ period: { start: settings.period?.start ?? k.available_from, end: e.target.value } })} /></label>
                </div>
              )}
              <p className="mt-2 text-ink-muted" data-testid="period-text">
                {settings.period ? fmtPeriod(settings.period.start, settings.period.end) : "Choose a period"}
                {k && ` · ${kind === "WEEKLY" ? "weekly" : "monthly"} options are available from ${day(k.available_from)}`}
              </p>
            </fieldset>

            <div>
              <p className="font-medium">Costs</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead><tr className="border-b border-line text-xs uppercase text-ink-muted"><th className="py-1">Charge</th><th>Value</th><th>Applies to</th><th>Source</th></tr></thead>
                  <tbody>
                    {inst.default_costs.items.map((item) => (
                      <tr key={item.key} className="border-b border-line">
                        <td className="py-1.5 pr-2">{item.label}</td>
                        <td className="pr-2">
                          <label className="sr-only" htmlFor={`cost-${item.key}`}>{item.label}</label>
                          <input id={`cost-${item.key}`} type="number" min={0} step="any" className="num w-24 rounded-md border border-line px-2 py-1"
                            value={settings.costs[item.key as CostKey] ?? ""}
                            onChange={(e) => updateSettings({ costs: { ...settings.costs, [item.key]: e.target.value === "" ? null : Number(e.target.value) } })} />
                        </td>
                        <td className="pr-2 text-ink-muted">{item.applies_to}</td>
                        <td className="text-ink-muted">{item.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <label className="block">
              <span className="font-medium">Capital (optional)</span>
              <InfoTip label="capital" text="Adds % return and % drawdown to the report. Leave it empty to see results in ₹ only." />
              <input type="number" min={1} step="any" className="num ml-2 w-36 rounded-md border border-line px-2 py-1" placeholder="₹"
                value={settings.capital ?? ""} onChange={(e) => set({ settings: { ...settings, capital: e.target.value === "" ? null : Number(e.target.value) } })} />
              <span className="ml-2 text-ink-muted">Adds % return and % drawdown</span>
            </label>

            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" checked={settings.checked} onChange={(e) => set({ settings: { ...settings, checked: e.target.checked } })} />
              I&apos;ve checked the costs and period
            </label>
          </div>
        )}
      </Card>

      {fourHourNote && (
        <Callout tone="info">With 4-hour candles and intraday holding, only the 13:14 candle close can trigger entries, because the day&apos;s second candle closes after the {inst?.intraday_squareoff ?? "15:15"} square-off.</Callout>
      )}

      {stillNeeded.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold">Still needed</h2>
          <ul className="mt-2 space-y-1 text-sm" data-testid="still-needed">
            {stillNeeded.map((n, i) => (
              <li key={i}>• <a href={n.href} className="font-medium text-info underline">{n.label}</a> — {n.message}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">Premiums are modelled, not actual.</p>
        <Button
          disabled={!canEvaluate}
          onClick={() => {
            if (!evalSettings) return;
            void startEvaluation({ strategy: asStrategy(draft), settings: evalSettings }, (p) => router.push(p));
          }}
        >
          Evaluate Strategy
        </Button>
      </div>
      <DisclaimerShort />
    </main>
  );
}

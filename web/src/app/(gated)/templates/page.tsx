"use client";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { useReplaceGuard } from "@/components/ReplaceGuard";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Card";
import { RuleTable } from "@/components/RuleTable";
import { useMeta } from "@/hooks/useMeta";
import { period } from "@/lib/format";
import { BACK } from "@/lib/navigation";
import { useStore, emptyWhatIf } from "@/store";
import { describeStrategy } from "@/strategy/describe";
import { clone, emptyDraft } from "@/strategy/draft";
import { costSummary, prefilledSettings, templateSettings } from "@/strategy/settings";
import { AVAILABLE_TEMPLATES, type TemplateMeta } from "@/templates";

function TemplateCard({ t }: { t: TemplateMeta }) {
  const { inst, status } = useMeta();
  const router = useRouter();
  const set = useStore((s) => s.set);
  const settings = inst ? templateSettings(inst, t.strategy) : null;
  const pos = t.strategy.position;

  const [guard, dialog] = useReplaceGuard();
  const load = async (confirmed: boolean) => {
    if (!inst || !(await guard())) return;
    set({
      draft: { ...emptyDraft("TEMPLATE"), strategy: clone(t.strategy) as never, confirmed: { lots: confirmed, lotSize: confirmed } },
      settings: confirmed ? templateSettings(inst, t.strategy) : prefilledSettings(inst, t.strategy),
      evaluation: { status: "idle" },
      whatIf: emptyWhatIf(),
      suggestions: { status: "idle", notOffered: null, runs: [], message: null },
      reviewProblems: [],
    });
    router.push(confirmed ? "/review" : "/build?step=basics");
  };

  return (
    <article className="rounded-lg border border-line bg-surface p-5" data-testid={`template-${t.id}`}>
      <h2 className="text-lg font-semibold">{t.name}</h2>
      <p className="mt-2 text-sm">{t.explanation}</p>
      <div className="mt-3">
        {t.prominentRisk ? (
          <Callout tone="risk" title="Risk:">{t.riskNote}</Callout>
        ) : (
          <p className="text-sm text-ink-muted"><strong>Risk:</strong> {t.riskNote}</p>
        )}
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-info">Rules</summary>
        <div className="mt-2">
          <RuleTable rows={describeStrategy(t.strategy as never, inst, t.whatItMeans)} />
        </div>
      </details>
      <div className="mt-4 rounded-md bg-bg p-3 text-sm" data-testid="template-values">
        <p className="font-medium">You&apos;ll evaluate with:</p>
        <p>{pos.lots} lot{pos.lots === 1 ? "" : "s"} × {pos.lot_size} = {pos.lots * pos.lot_size} quantity</p>
        <p>Costs: {inst ? costSummary(inst, settings!.costs) : "loading…"}</p>
        <p>Period: {settings?.period ? `${period(settings.period.start, settings.period.end)} (full range)` : "loading…"}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => void load(true)} disabled={status !== "ready"}>Use this template</Button>
        <Button variant="secondary" onClick={() => void load(false)} disabled={status !== "ready"}>Customize</Button>
        {dialog}
      </div>
    </article>
  );
}

export default function TemplatesPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-8">
      <BackLink to={BACK["/templates"]!} className="mb-4" />
      <h1 className="text-2xl font-semibold">Templates</h1>
      <p className="mt-2 text-sm text-ink-muted">Ready-made strategies, explained in plain words. Use one as it is, or customize it in the builder.</p>
      <div className="mt-6 grid gap-6">
        {AVAILABLE_TEMPLATES.map((t) => <TemplateCard key={t.id} t={t} />)}
      </div>
    </main>
  );
}

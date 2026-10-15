"use client";
// Guided builder (feature 03; REQ-INP-04…07).
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { BackLink } from "@/components/BackLink";
import { RuleTable } from "@/components/RuleTable";
import { Button } from "@/components/ui/Button";
import { useMeta } from "@/hooks/useMeta";
import { builderBack } from "@/lib/navigation";
import { useStore } from "@/store";
import type { StepId } from "@/strategy/completeness";
import { describeStrategy } from "@/strategy/describe";
import { emptyDraft, type Draft } from "@/strategy/draft";
import { Advanced } from "@/builder/advanced";
import { STEPS, canOpen, firstIncomplete, stepIssues } from "@/builder/progress";
import { Basics, Entry, Exit, Strike, type StepProps } from "@/builder/steps";

const ORDER: StepId[] = ["basics", "strike", "entry", "exit", "advanced"];

function Builder() {
  const router = useRouter();
  const params = useSearchParams();
  const fromReview = params.get("from") === "review";
  const requested = (params.get("step") as StepId | null) ?? "basics";
  const { data: meta, inst } = useMeta();
  const draft = useStore((s) => s.draft);
  const set = useStore((s) => s.set);

  useEffect(() => {
    if (!draft) {
      const d = emptyDraft("BUILDER");
      d.strategy.position = { lots: 1, lot_size: inst?.lot_size_suggested ?? 65 }; // shown pre-filled, confirmed by the user
      set({ draft: d });
    }
  }, [draft, inst, set]);

  const issues = useMemo(() => (draft ? stepIssues(draft, meta) : null), [draft, meta]);
  const step: StepId = ORDER.includes(requested) ? requested : "basics";

  useEffect(() => {
    if (issues && !canOpen(step, issues)) {
      const first = firstIncomplete(issues) ?? "basics";
      router.replace(`/build?step=${first}${fromReview ? "&from=review" : ""}`);
    }
  }, [issues, step, router, fromReview]);

  if (!draft || !issues) return <div className="mx-auto mt-12 h-48 max-w-3xl animate-pulse rounded-lg bg-surface" aria-busy="true" />;

  const setDraft = (d: Draft) => set({ draft: d, reviewProblems: [] });
  const update: StepProps["update"] = (fn) => {
    const d: Draft = JSON.parse(JSON.stringify(draft));
    fn(d.strategy as Record<string, unknown>, d);
    setDraft(d);
  };
  const problem = (label: string) => issues[step].find((i) => i.label === label)?.message;
  const go = (s: StepId) => router.push(`/build?step=${s}${fromReview ? "&from=review" : ""}`);
  const idx = ORDER.indexOf(step);
  const complete = !firstIncomplete(issues);
  const props: StepProps = { draft, update, setDraft, inst, problem };

  return (
    <main id="main" className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[13rem_1fr_20rem]">
      <BackLink to={builderBack(step, fromReview)} className="lg:col-span-3" />
      <nav aria-label="Builder steps" className="space-y-1">
        {[...STEPS, { id: "advanced" as StepId, label: "Advanced options" }].map((s, i) => {
          const done = issues[s.id].length === 0;
          const open = canOpen(s.id, issues);
          return (
            <button key={s.id} type="button" disabled={!open} onClick={() => go(s.id)} aria-current={s.id === step ? "step" : undefined}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${s.id === step ? "bg-surface font-semibold shadow-sm" : ""} disabled:opacity-40`}>
              <span aria-hidden>{s.id === "advanced" ? "⌄" : done ? "✓" : s.id === step ? "●" : "○"}</span>
              {s.id === "advanced" ? s.label : `${i + 1} ${s.label}`}
              <span className="sr-only">{done ? "(complete)" : "(not complete)"}</span>
            </button>
          );
        })}
      </nav>

      <section aria-labelledby="step-title" className="rounded-lg border border-line bg-surface p-5">
        <p className="text-xs text-ink-muted">{step === "advanced" ? "Optional" : `Step ${idx + 1} of 4`}</p>
        <h1 id="step-title" className="mb-4 text-xl font-semibold">{step === "advanced" ? "Advanced options" : STEPS[idx]!.label}</h1>
        {step === "basics" && <Basics {...props} />}
        {step === "strike" && <Strike {...props} />}
        {step === "entry" && <Entry {...props} />}
        {step === "exit" && <Exit {...props} />}
        {step === "advanced" && <Advanced {...props} />}

        {issues[step].length > 0 && (
          <div className="mt-5 rounded-md bg-bg p-3 text-sm" data-testid="step-needed">
            <p className="font-medium">Still needed on this step</p>
            <ul className="mt-1 list-disc pl-5">{issues[step].map((i, k) => <li key={k}>{i.label} — {i.message}</li>)}</ul>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {idx > 0 && <Button variant="secondary" onClick={() => go(ORDER[idx - 1]!)}>Back</Button>}
          {idx < 3 && <Button disabled={issues[step].length > 0} onClick={() => go(ORDER[idx + 1]!)}>Next</Button>}
          {idx === 3 && <Button variant="secondary" disabled={issues.exit.length > 0} onClick={() => go("advanced")}>Advanced options (optional)</Button>}
          {complete && <Button onClick={() => router.push("/review")}>Review strategy</Button>}
        </div>
      </section>

      <aside aria-label="Your strategy so far" className="hidden rounded-lg border border-line bg-surface p-4 lg:block">
        <h2 className="mb-2 text-sm font-semibold">Your strategy so far</h2>
        <RuleTable rows={describeStrategy(draft.strategy, inst).filter((r) => !r.advanced || r.used)} />
      </aside>
    </main>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={null}>
      <Builder />
    </Suspense>
  );
}

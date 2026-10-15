"use client";
// "Continue where you left off" (REQ-BEG-20): leaving the strategy pages never loses work.
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useReplaceGuard } from "@/components/ReplaceGuard";
import { clearedWork, continueTarget, hasWork, workName } from "@/lib/work";
import { useStore } from "@/store";

export function ContinuePanel({ className = "" }: { className?: string }) {
  const router = useRouter();
  const draft = useStore((s) => s.draft);
  const evaluation = useStore((s) => s.evaluation);
  const set = useStore((s) => s.set);
  const [guard, dialog] = useReplaceGuard();
  if (!hasWork(draft, evaluation)) return null;
  const go = continueTarget(draft, evaluation);
  const startNew = async () => {
    if (!(await guard())) return;
    set(clearedWork());
    router.push("/start");
  };
  return (
    <section aria-labelledby="continue-title" data-testid="continue-panel" className={`rounded-lg border border-accent bg-surface p-4 ${className}`}>
      <h2 id="continue-title" className="text-base font-semibold">Continue where you left off</h2>
      <p className="mt-1 text-sm text-ink-muted">You have {workName(draft, evaluation)} in progress in this tab. Nothing has been lost.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <ButtonLink href={go.href}>{go.label}</ButtonLink>
        {draft && go.href !== "/review" && <ButtonLink href="/review" variant="secondary">Review your strategy</ButtonLink>}
        <Button variant="quiet" onClick={() => void startNew()}>Start a new strategy</Button>
      </div>
      {dialog}
    </section>
  );
}

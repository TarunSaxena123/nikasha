"use client";
// Progress screen (feature 02 design §1.3; REQ-EVL-09, 11; REQ-BEG-13).
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorPanel } from "@/components/ui/Card";
import { cancelEvaluation, startEvaluation } from "@/evaluation/run";
import { KEEP_OPEN, stageFor } from "@/evaluation/progress";
import { articleBySlug, PROGRESS_ARTICLES } from "@/learn/articles";
import { useStore } from "@/store";
import { asStrategy } from "@/strategy/draft";
import { toEvaluationSettings } from "@/strategy/settings";

export default function EvaluatePage() {
  const router = useRouter();
  const evaluation = useStore((s) => s.evaluation);
  const draft = useStore((s) => s.draft);
  const settings = useStore((s) => s.settings);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  if (evaluation.status === "error") {
    const retry = () => {
      const s = toEvaluationSettings(settings);
      if (draft && s) void startEvaluation({ strategy: asStrategy(draft), settings: s }, (p) => router.push(p));
    };
    return (
      <main id="main" className="mx-auto max-w-2xl px-4 py-12">
        <ErrorPanel message={evaluation.message} onRetry={retry} extra={<ButtonLink href="/review" variant="secondary">Back to review</ButtonLink>} />
      </main>
    );
  }
  if (evaluation.status !== "running") {
    return (
      <main id="main" className="px-4 py-12">
        <EmptyState title="Nothing is running." action={<ButtonLink href={evaluation.status === "done" ? "/report" : "/start"}>{evaluation.status === "done" ? "Open the report" : "Choose a path"}</ButtonLink>}>
          Nikasha doesn&apos;t store anything, so a refreshed or closed tab starts fresh.
        </EmptyState>
      </main>
    );
  }

  const elapsed = now - evaluation.startedAt;
  const seconds = Math.max(5, Math.round(evaluation.estimateMs / 1000 / 5) * 5);
  const article = open ? articleBySlug(open) : undefined;
  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="rounded-lg border border-line bg-surface p-6 text-center">
        <div aria-hidden className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-line border-t-accent" />
        <p aria-live="polite" className="text-lg font-medium" data-testid="stage">{stageFor(elapsed, evaluation.estimateMs)}</p>
        <p className="mt-1 text-sm text-ink-muted">About {seconds} seconds (estimate)</p>
        <p className="mt-4 rounded-md border-l-4 border-caution bg-bg p-3 text-sm font-medium" role="note">{KEEP_OPEN}</p>
        <Button variant="secondary" className="mt-4" onClick={() => cancelEvaluation((p) => router.push(p))}>Cancel</Button>
      </div>
      <section>
        <h2 className="text-base font-semibold">While you wait</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3" data-testid="learning-cards">
          {PROGRESS_ARTICLES.map((slug) => {
            const a = articleBySlug(slug)!;
            return (
              <li key={slug} className="rounded-lg border border-line bg-surface p-4 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-ink-muted">{a.summary}</p>
                <button type="button" className="mt-2 text-info underline" onClick={() => setOpen(slug)}>Read</button>
              </li>
            );
          })}
        </ul>
      </section>
      <Dialog.Root open={!!article} onOpenChange={(o) => !o && setOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed inset-x-4 top-8 bottom-8 mx-auto max-w-2xl overflow-y-auto rounded-lg bg-surface p-6 shadow-lg">
            <Dialog.Title className="text-xl font-semibold">{article?.title}</Dialog.Title>
            <Dialog.Description className="sr-only">{article?.summary}</Dialog.Description>
            <div className="mt-3">{article && <Markdown source={article.body} />}</div>
            <Dialog.Close asChild><Button variant="secondary" className="mt-4">Close</Button></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

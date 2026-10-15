"use client";
// Document upload (feature 04 design §1; REQ-UPL-01…03, 11…19).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiFailure, extractFile, extractText } from "@/api/client";
import type { ExtractionResult, Question } from "@/api/types";
import { BackLink } from "@/components/BackLink";
import { useReplaceGuard } from "@/components/ReplaceGuard";
import { UploadPrivacyNotice } from "@/components/legal/Legal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, ErrorPanel } from "@/components/ui/Card";
import { BACK } from "@/lib/navigation";
import { applyPatch } from "@/lib/patch";
import { emptyWhatIf, useStore } from "@/store";
import { completeness, MANDATORY_ORDER, type MissingItem } from "@/strategy/completeness";
import { applyToDraft, emptyDraft, type Draft, type StrategyDraft } from "@/strategy/draft";
import { prefilledSettings } from "@/strategy/settings";
import { useMeta } from "@/hooks/useMeta";
import { EXT, MAX_CHARS, MESSAGES, checkFile } from "@/upload/logic";

interface Q {
  id: string;
  source: "vague" | "missing";
  key?: string; // completeness key for missing questions
  question: Question;
  quote?: string;
}

type Answer = { kind: "option"; index: number } | { kind: "number"; value: number } | { kind: "time"; value: string };

function applyAnswer(d: Draft, q: Q, a: Answer): Draft {
  let next: Draft = d;
  const patcher = (s: StrategyDraft, ops: never[]) => applyPatch(s as Record<string, unknown>, ops) as StrategyDraft;
  if (a.kind === "option") {
    const opt = q.question.options?.[a.index];
    if (opt) next = applyToDraft(d, opt.patch as never, patcher);
  } else if (a.kind === "number" && q.question.number) {
    const ops = q.question.number.targets.map((t) => ({ op: "add" as const, path: t.path, value: a.value * (t.multiplier ?? 1) }));
    next = applyToDraft(d, ops, patcher);
  } else if (a.kind === "time" && q.question.time) {
    next = applyToDraft(d, [{ op: "add", path: q.question.time.path, value: a.value }], patcher);
  }
  if (q.key === "lots") next = { ...next, confirmed: { ...next.confirmed, lots: true } };
  if (q.key === "lot_size") next = { ...next, confirmed: { ...next.confirmed, lotSize: true } };
  return next;
}

export default function UploadPage() {
  const router = useRouter();
  const { data: meta, inst } = useMeta();
  const set = useStore((s) => s.set);
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  // Coming back from review (REQ-BEG-19) restores the result and answers held in this tab.
  const saved = useStore((s) => s.extraction);
  const restored = saved.status === "questions" && saved.result ? saved : null;
  const [phase, setPhase] = useState<"input" | "reading" | "results" | "questions" | "unsupported">(restored ? "results" : "input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(restored?.result ?? null);
  const [answers, setAnswers] = useState<Record<string, Answer>>((restored?.answers ?? {}) as Record<string, Answer>);
  const [step, setStep] = useState(0);
  const [ack, setAck] = useState(false);
  const request = useRef<{ id: number; abort: AbortController | null }>({ id: 0, abort: null });
  const [guard, replaceDialog] = useReplaceGuard();
  useEffect(() => {
    if (result) set({ extraction: { status: "questions", result, answers, message: null } });
  }, [result, answers, set]);

  const original: Draft | null = useMemo(() => (result ? { ...emptyDraft("UPLOAD"), strategy: result.draft as StrategyDraft } : null), [result]);

  // Questions: vague (document order) then missing (product.md §6.1 order). Missing questions are
  // recomputed after every answer so new ones (e.g. the positional exit question) are appended.
  const { questions, draft } = useMemo(() => {
    if (!original || !result) return { questions: [] as Q[], draft: null as Draft | null };
    const vague: Q[] = result.questions.map((q) => ({ id: q.id, source: "vague", question: q, quote: result.items.find((i) => i.id === q.item_id)?.quote }));
    let d = original;
    const list: Q[] = [...vague];
    const asked = new Set<string>();
    // An input already covered by a vague question (e.g. "Your title says weekly. Which expiry?")
    // isn't asked again as missing.
    const vagueLabels = new Set(result.items.filter((i) => i.status === "VAGUE").map((i) => i.field_label));
    const addMissing = (dd: Draft) => {
      const items = completeness(dd, meta).filter((m) => m.question && !asked.has(m.key) && !vagueLabels.has(m.label));
      items.sort((a, b) => MANDATORY_ORDER.indexOf(a.key) - MANDATORY_ORDER.indexOf(b.key));
      for (const m of items) {
        asked.add(m.key);
        list.push({ id: `missing:${m.key}`, source: "missing", key: m.key, question: m.question! });
      }
    };
    addMissing(d);
    for (let i = 0; i < list.length; i++) {
      const a = answers[list[i]!.id];
      if (!a) break;
      d = applyAnswer(d, list[i]!, a);
      addMissing(d);
    }
    return { questions: list, draft: d };
  }, [original, result, answers, meta]);

  const builderOnly: MissingItem[] = useMemo(() => (draft ? completeness(draft, meta).filter((m) => !m.question) : []), [draft, meta]);
  const unsupported = result?.items.filter((i) => i.status === "UNSUPPORTED") ?? [];
  const allAnswered = questions.every((q) => answers[q.id]);

  const submit = async () => {
    setRefusal(null);
    setError(null);
    let call: (signal: AbortSignal) => Promise<ExtractionResult>;
    if (tab === "file") {
      if (!file) return setRefusal("Choose a file first.");
      const why = checkFile(file);
      if (why) return setRefusal(why);
      const ext = EXT[file.name.toLowerCase().split(".").pop() ?? ""]!;
      call = (signal) => extractFile(file, ext, signal);
    } else {
      if (!text.trim()) return setRefusal("Paste your strategy first.");
      if (text.length > MAX_CHARS) return setRefusal(`This text is too long (max ${MAX_CHARS.toLocaleString("en-IN")} characters).`);
      call = (signal) => extractText(text, signal);
    }
    if (!(await guard())) return; // reading a new strategy replaces the one held in this tab (REQ-BEG-21)
    const id = ++request.current.id;
    request.current.abort = new AbortController();
    setPhase("reading");
    set({ extraction: { status: "reading", result: null, answers: {}, message: null } });
    try {
      const r = await call(request.current.abort.signal);
      if (request.current.id !== id) return; // cancelled or superseded
      setResult(r);
      setAnswers({});
      setStep(0);
      setPhase("results");
      set({ extraction: { status: "questions", result: r, answers: {}, message: null } });
    } catch (e) {
      if (request.current.id !== id) return;
      const f = e instanceof ApiFailure ? e : null;
      if (f?.kind === "aborted") return;
      const code = f?.kind === "network" ? "NETWORK" : f?.code ?? "EXTRACTION_FAILED";
      setError(code in MESSAGES ? code : "EXTRACTION_FAILED");
      setPhase("input");
    }
  };

  const cancel = () => {
    request.current.id++;
    request.current.abort?.abort();
    setPhase("input");
  };

  const handOff = () => {
    if (!draft || !inst) return;
    const d: Draft = { ...draft, origin: "UPLOAD", pending: [], leftOut: unsupported.map((u) => ({ quote: u.quote ?? "", reason: u.text })) };
    set({
      draft: d,
      settings: prefilledSettings(inst, d.strategy as never),
      evaluation: { status: "idle" },
      whatIf: emptyWhatIf(),
      reviewProblems: [],
    });
    router.push(builderOnly.length ? `/build?step=${builderOnly[0]!.step}` : "/review");
  };

  const finish = () => (unsupported.length ? setPhase("unsupported") : handOff());

  if (phase === "reading") {
    return (
      <main id="main" className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div aria-hidden className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-line border-t-accent" />
        <p aria-live="polite" className="font-medium">Reading your strategy… this usually takes 10–40 seconds</p>
        <Button variant="secondary" className="mt-4" onClick={cancel}>Cancel</Button>
      </main>
    );
  }

  if (phase === "input") {
    const err = error ? MESSAGES[error]! : null;
    return (
      <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <BackLink to={BACK["/upload"]!} />
        <h1 className="text-2xl font-semibold">Upload your strategy</h1>
        <UploadPrivacyNotice />
        <div role="tablist" aria-label="Upload or paste" className="flex gap-2">
          {(["file", "paste"] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-brand text-white" : "border border-line"}`}>
              {t === "file" ? "Upload a file" : "Paste text"}
            </button>
          ))}
        </div>
        <Card>
          {tab === "file" ? (
            <label className="block text-sm">
              <span className="font-medium">PDF, Word (.docx) or text file, up to 4 MB</span>
              <input type="file" accept=".pdf,.docx,.txt" className="mt-2 block" data-testid="file-input"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRefusal(null); }} />
            </label>
          ) : (
            <label className="block text-sm">
              <span className="font-medium">Paste your strategy</span>
              <textarea className="mt-2 h-48 w-full rounded-md border border-line p-2" value={text} onChange={(e) => setText(e.target.value)} data-testid="paste" />
              <span className={`text-xs ${text.length > MAX_CHARS ? "text-risk" : "text-ink-muted"}`}>{text.length.toLocaleString("en-IN")} / {MAX_CHARS.toLocaleString("en-IN")} characters</span>
            </label>
          )}
          {refusal && <p role="alert" className="mt-2 text-sm text-risk">{refusal}</p>}
          <Button className="mt-4" onClick={() => void submit()}>Read my strategy</Button>
          {replaceDialog}
        </Card>
        {err && (
          <ErrorPanel message={err.text} onRetry={err.next === "retry" ? () => void submit() : undefined}
            extra={<>
              {err.next === "paste" && <Button variant="secondary" onClick={() => { setTab("paste"); setError(null); }}>Paste the text instead</Button>}
              {err.next === "shorter" && <span className="text-sm">Try a smaller file or shorter text.</span>}
              {err.next === "builder" && <span className="text-sm">Try shorter text, or </span>}
              <ButtonLink href="/build" variant="secondary">Use the guided builder</ButtonLink>
            </>} />
        )}
      </main>
    );
  }

  if (!result || !draft) return null;
  const found = result.items.filter((i) => i.status === "FOUND");
  const vagueItems = result.items.filter((i) => i.status === "VAGUE");
  const missing = questions.filter((q) => q.source === "missing");
  const noRules = result.items.length === 0;

  if (phase === "results") {
    return (
      <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <BackLink to={BACK["/upload"]!} />
        <h1 className="text-2xl font-semibold">What we found</h1>
        {noRules ? (
          <Card>
            <p className="text-sm">We couldn&apos;t find trading rules in this text.</p>
            <div className="mt-3 flex gap-3"><ButtonLink href="/build">Use the builder</ButtonLink><Button variant="secondary" onClick={() => setPhase("input")}>Try again</Button></div>
          </Card>
        ) : (
          <>
            <Group title="Understood" icon="✓" testid="found" items={found.map((i) => ({ label: i.field_label, text: i.text, quote: i.quote }))} />
            <Group title="Needs an answer" icon="?" testid="needs-answer" items={[
              ...vagueItems.map((i) => ({ label: i.field_label, text: i.text, quote: i.quote })),
              ...missing.map((m) => ({ label: completenessLabel(m.key), text: "Not in your document" })),
              ...builderOnly.map((m) => ({ label: m.label, text: "Not in your document: set it in the builder" })),
            ]} />
            {unsupported.length > 0 && <Group title="Can't be tested" icon="⊘" testid="unsupported" items={unsupported.map((i) => ({ label: i.field_label, text: i.text, quote: i.quote }))} />}
            {result.ignored_text_found && <p className="text-sm text-ink-muted">Some text that wasn&apos;t a trading rule was ignored.</p>}
            <Button onClick={() => (questions.length ? setPhase("questions") : finish())}>
              {questions.length ? `Answer ${questions.length} question${questions.length === 1 ? "" : "s"}` : "Continue"}
            </Button>
          </>
        )}
      </main>
    );
  }

  if (phase === "unsupported") {
    return (
      <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <BackLink to={BACK["/upload"]!} />
        <h1 className="text-2xl font-semibold">Rules that can&apos;t be tested</h1>
        <ul className="space-y-2 text-sm">{unsupported.map((u) => <li key={u.id} className="rounded-md border border-line bg-surface p-3">&ldquo;{u.quote}&rdquo; — {u.text}</li>)}</ul>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I understand these rules will be left out of the test.
        </label>
        <Button disabled={!ack} onClick={handOff}>Continue</Button>
      </main>
    );
  }

  // Questions, one at a time.
  const q = questions[Math.min(step, questions.length - 1)]!;
  return (
    <main id="main" className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_20rem]">
      <BackLink to={BACK["/upload"]!} className="lg:col-span-2" />
      <section aria-labelledby="qtitle" className="rounded-lg border border-line bg-surface p-5">
        <p className="text-xs text-ink-muted" aria-live="polite">Question {step + 1} of {questions.length}</p>
        <QuestionCard key={q.id} q={q} answer={answers[q.id]} onAnswer={(a) => setAnswers((prev) => {
          // Changing an answer re-applies everything after it from the original draft.
          const next: Record<string, Answer> = {};
          for (const x of questions) {
            if (x.id === q.id) { next[x.id] = a; break; }
            if (prev[x.id]) next[x.id] = prev[x.id]!;
          }
          return next;
        })} />
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          {step < questions.length - 1 ? (
            <Button disabled={!answers[q.id]} onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            allAnswered && <Button onClick={finish}>{builderOnly.length ? "Continue in the builder" : unsupported.length ? "Continue" : "Review & Evaluate"}</Button>
          )}
        </div>
      </section>
      <aside className="hidden text-sm lg:block">
        <p className="font-medium">From your document</p>
        {q.quote ? <blockquote className="mt-2 border-l-4 border-accent pl-3 text-ink-muted">&ldquo;{q.quote}&rdquo;</blockquote> : <p className="mt-2 text-ink-muted">Not in your document.</p>}
      </aside>
    </main>
  );
}

function completenessLabel(key?: string): string {
  const labels: Record<string, string> = {
    action: "Buy or sell", option_type: "Option type", moneyness: "Strike", distance: "Strike distance", expiry: "Expiry",
    timeframe: "Candle timeframe", holding: "Holding", lots: "Number of lots", lot_size: "Lot size", stop_loss: "Stop-loss",
    stop_loss_value: "Stop-loss", exit_rule: "Exit rule", target_value: "Target", time_exit_at: "Exit time", exit_after_candles: "Exit after N candles",
    instrument: "Instrument",
  };
  return labels[key ?? ""] ?? "Missing input";
}

function Group({ title, icon, items, testid }: { title: string; icon: string; items: { label: string; text: string; quote?: string }[]; testid: string }) {
  if (!items.length) return null;
  return (
    <Card>
      <h2 className="font-semibold"><span aria-hidden className="mr-2">{icon}</span>{title}</h2>
      <ul className="mt-2 space-y-2 text-sm" data-testid={testid}>
        {items.map((i, k) => (
          <li key={k}>
            <strong>{i.label}:</strong> {i.text}
            {i.quote && <span className="block text-xs text-ink-muted">From your document: &ldquo;{i.quote}&rdquo;</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuestionCard({ q, answer, onAnswer }: { q: Q; answer: Answer | undefined; onAnswer: (a: Answer) => void }) {
  const kind = q.question.kind;
  const rec = q.question.recommended_option_index;
  const [pending, setPending] = useState<number | null>(answer?.kind === "option" ? answer.index : kind === "CONFIRM" && rec != null ? rec : null);
  const prefill = q.question.number?.prefill;
  const [num, setNum] = useState<string>(answer?.kind === "number" ? String(answer.value) : prefill != null ? String(prefill) : "");
  const [time, setTime] = useState<string>(answer?.kind === "time" ? answer.value : "");
  return (
    <div data-testid="question">
      <h2 id="qtitle" className="text-lg font-semibold">{q.question.prompt}</h2>
      {q.question.help && <p className="mt-1 text-sm text-ink-muted">{q.question.help}</p>}
      {(kind === "CHOICE" || kind === "CONFIRM") && (
        <div role="radiogroup" aria-labelledby="qtitle" className="mt-3 space-y-2">
          {q.question.options?.map((o, i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="radio" name={q.id} checked={pending === i} onChange={() => { setPending(i); if (kind === "CHOICE") onAnswer({ kind: "option", index: i }); }} />
              {o.label}{kind === "CONFIRM" && rec === i && <span className="text-xs text-ink-muted">(suggested reading)</span>}
            </label>
          ))}
          {kind === "CONFIRM" && (
            <Button variant="secondary" disabled={pending === null} onClick={() => pending !== null && onAnswer({ kind: "option", index: pending })}>
              {answer?.kind === "option" && answer.index === pending ? "✓ Confirmed" : "Confirm"}
            </Button>
          )}
        </div>
      )}
      {kind === "NUMBER" && q.question.number && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input type="number" aria-label={q.question.prompt} className="num w-32 rounded-md border border-line px-2 py-1" min={q.question.number.min} max={q.question.number.max} step={q.question.number.step ?? "any"}
            value={num} onChange={(e) => setNum(e.target.value)} />
          <span>{q.question.number.unit_label}</span>
          <Button variant="secondary" disabled={num === "" || Number.isNaN(Number(num)) || (q.question.number.min != null && Number(num) < q.question.number.min)}
            onClick={() => onAnswer({ kind: "number", value: Number(num) })}>
            {answer?.kind === "number" && answer.value === Number(num) ? "✓ Saved" : prefill != null ? "Confirm" : "Save"}
          </Button>
        </div>
      )}
      {kind === "TIME" && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <input type="time" aria-label={q.question.prompt} className="rounded-md border border-line px-2 py-1" min="09:15" max="15:29" value={time} onChange={(e) => setTime(e.target.value)} />
          <Button variant="secondary" disabled={!time} onClick={() => onAnswer({ kind: "time", value: time })}>{answer?.kind === "time" && answer.value === time ? "✓ Saved" : "Save"}</Button>
        </div>
      )}
    </div>
  );
}

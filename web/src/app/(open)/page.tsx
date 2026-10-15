"use client";
import Link from "next/link";
import { ContinuePanel } from "@/components/ContinuePanel";
import { ButtonLink } from "@/components/ui/Button";
import { RichText } from "@/components/ui/Glossary";
import { DataSourceLine } from "@/components/legal/Legal";
import { INTRO } from "@/copy/intro";
import { useMeta } from "@/hooks/useMeta";
import { day } from "@/lib/format";

export default function IntroPage() {
  const { dates } = useMeta();
  const range = typeof dates === "object" ? `from ${day(dates.first)} to ${day(dates.last)}` : "";
  return (
    <main id="main">
      <div className="mx-auto max-w-5xl px-4 pt-6 empty:hidden"><ContinuePanel /></div>
      <section className="flex min-h-[70vh] flex-col items-center justify-center bg-surface px-4 text-center" data-section="hero">
        <h1 className="text-2xl font-semibold sm:text-[40px] sm:leading-tight">
          {INTRO.heroTitle} <span className="block text-xl font-normal text-ink-muted sm:text-2xl">{INTRO.tagline}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base sm:text-lg">{INTRO.heroSentence}</p>
        <ButtonLink href="/start" className="mt-8 px-6 py-3 text-base">{INTRO.getStarted}</ButtonLink>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12">
        <section data-section="what">
          <h2 className="text-xl font-semibold">{INTRO.whatTitle}</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-4">
            {INTRO.steps.map((s, i) => (
              <li key={s.title} className="rounded-lg border border-line bg-surface p-4 text-sm">
                <span aria-hidden className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent font-semibold text-white">{i + 1}</span>
                <strong>{s.title}</strong> <RichText text={s.text.replace(" {range}", range ? ` ${range}` : "")} />
              </li>
            ))}
          </ol>
        </section>

        <section data-section="helps">
          <h2 className="text-xl font-semibold">{INTRO.helpsTitle}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTRO.helps.map((h) => (
              <li key={h.title} className="rounded-lg border border-line bg-surface p-4 text-sm"><strong>{h.title}</strong> {h.text}</li>
            ))}
          </ul>
        </section>

        <section data-section="tips">
          <h2 className="text-xl font-semibold">{INTRO.tipsTitle}</h2>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            {INTRO.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <Link href="/learn/how-to-use-nikasha" className="mt-3 inline-block text-sm text-info underline">{INTRO.guideLink}</Link>
        </section>

        <section data-section="not">
          <h2 className="text-xl font-semibold">{INTRO.notTitle}</h2>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            {INTRO.nots.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section data-section="data">
          <h2 className="text-xl font-semibold">{INTRO.dataTitle}</h2>
          <p className="mt-3 text-sm">{INTRO.dataText}</p>
          <DataSourceLine className="mt-2" />
          <Link href="/disclaimer" className="mt-2 inline-block text-sm text-info underline">Read the full disclaimer</Link>
        </section>

        <section data-section="cta" className="text-center">
          <ButtonLink href="/start" className="px-6 py-3 text-base">{INTRO.getStarted}</ButtonLink>
        </section>
      </div>
    </main>
  );
}

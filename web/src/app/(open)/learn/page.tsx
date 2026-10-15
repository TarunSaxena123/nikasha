import Link from "next/link";
import { GLOSSARY } from "@/copy/glossary";
import { ARTICLES } from "@/learn/articles";

export const metadata = { title: "Learn — Nikasha" };

export default function LearnPage() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  const letters = [...new Set(sorted.map((g) => g.term[0]!.toUpperCase()))];
  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Learn</h1>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Articles</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {ARTICLES.map((a) => (
            <li key={a.slug} className="rounded-lg border border-line bg-surface p-4">
              <Link href={`/learn/${a.slug}`} className="font-medium text-info underline">{a.title}</Link>
              <p className="mt-1 text-sm text-ink-muted">{a.summary} · {a.minutes} min read</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10" aria-labelledby="glossary">
        <h2 id="glossary" className="text-lg font-semibold">Glossary</h2>
        <nav aria-label="Glossary letters" className="mt-2 flex flex-wrap gap-2 text-sm">
          {letters.map((l) => <a key={l} href={`#letter-${l}`} className="rounded border border-line px-2 py-0.5">{l}</a>)}
        </nav>
        {letters.map((letter) => (
          <div key={letter} className="mt-4">
            <h3 id={`letter-${letter}`} className="text-sm font-semibold text-ink-muted">{letter}</h3>
            <dl className="mt-2 space-y-3">
              {sorted.filter((g) => g.term[0]!.toUpperCase() === letter).map((g) => (
                <div key={g.slug} id={g.slug} className="rounded-lg border border-line bg-surface p-3">
                  <dt className="font-semibold">{g.term}</dt>
                  <dd className="text-sm">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </section>
    </main>
  );
}

"use client";
import { BackLink } from "@/components/BackLink";
import { ButtonLink } from "@/components/ui/Button";
import { BACK } from "@/lib/navigation";
import { START } from "@/copy/intro";

export default function StartPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-8">
      <BackLink to={BACK["/start"]!} className="mb-4" />
      <h1 className="text-2xl font-semibold">{START.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{START.intro}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {START.cards.map((c) => (
          <section key={c.title} className="flex flex-col rounded-lg border border-line bg-surface p-5" data-testid="path-card">
            <h2 className="text-lg font-semibold">{c.title}</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-accent">{c.suits}</p>
            <p className="mt-3 flex-1 text-sm">{c.text}</p>
            <ButtonLink href={c.href} className="mt-4 self-start">{c.cta}</ButtonLink>
          </section>
        ))}
      </div>
    </main>
  );
}

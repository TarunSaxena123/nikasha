"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { label: "Choose", paths: ["/start", "/templates"] },
  { label: "Rules", paths: ["/build", "/upload"] },
  { label: "Review", paths: ["/review"] },
  { label: "Evaluate", paths: ["/evaluate"] },
  { label: "Report", paths: ["/report"] },
];

export function Header() {
  const pathname = usePathname() ?? "/";
  const current = STEPS.findIndex((s) => s.paths.some((p) => pathname.startsWith(p)));
  return (
    <header className="border-b border-line bg-surface">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-brand">Nikasha</span>
          <span className="hidden text-sm text-ink-muted sm:inline">The touchstone for your trading strategy</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm">
          <Link href="/learn" className="hover:underline">Learn</Link>
          <Link href="/start" className="rounded-md bg-brand px-3 py-1.5 font-medium text-white">Get started</Link>
        </nav>
      </div>
      {current >= 0 && (
        <ol aria-label="Progress" className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 text-xs">
          {STEPS.map((s, i) => (
            <li key={s.label} aria-current={i === current ? "step" : undefined}
              className={`whitespace-nowrap rounded-full border px-2 py-0.5 ${i === current ? "border-accent font-semibold text-ink" : i < current ? "border-line text-ink" : "border-line text-ink-muted"}`}>
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>
      )}
    </header>
  );
}

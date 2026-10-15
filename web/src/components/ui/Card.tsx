import type { ReactNode } from "react";

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={`rounded-lg border border-line bg-surface p-4 sm:p-6 ${className}`}>{children}</Tag>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "caution" | "info" | "risk" }) {
  const t = {
    neutral: "border-line text-ink-muted",
    caution: "border-caution text-caution",
    info: "border-info text-info",
    risk: "border-risk text-risk",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function Callout({ children, tone = "info", title }: { children: ReactNode; tone?: "info" | "risk" | "caution"; title?: string }) {
  const t = { info: "border-info", risk: "border-risk", caution: "border-caution" }[tone];
  const icon = tone === "info" ? "ℹ" : "⚠";
  return (
    <div role={tone === "info" ? "note" : "alert"} className={`rounded-md border-l-4 ${t} bg-surface p-3 text-sm`}>
      <span aria-hidden className="mr-2">{icon}</span>
      {title && <strong className="mr-1">{title}</strong>}
      {children}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-dashed border-line bg-surface p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="mt-2 text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorPanel({ message, onRetry, extra }: { message: string; onRetry?: () => void; extra?: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-risk bg-surface p-4 text-sm">
      <p>
        <span aria-hidden className="mr-2">⚠</span>
        {message}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-md bg-brand px-3 py-1.5 text-sm text-white">
            Try again
          </button>
        )}
        {extra}
      </div>
    </div>
  );
}

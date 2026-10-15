"use client";
import Link from "next/link";
import { useMeta } from "@/hooks/useMeta";
import { AI_PROVIDER, AI_RETENTION_DAYS, FULL_DISCLAIMER, FULL_TITLE, SHORT_DISCLAIMER, fillDates } from "@/legal/disclaimer";
import { day } from "@/lib/format";

export function DisclaimerText() {
  const { dates } = useMeta();
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <h2 className="text-lg font-semibold">{FULL_TITLE}</h2>
      {FULL_DISCLAIMER.map((b, i) => (
        <p key={i}>
          {b.lead && <strong>{b.lead} </strong>}
          {fillDates(b.text, dates)}
        </p>
      ))}
    </div>
  );
}

export function DisclaimerShort({ className = "" }: { className?: string }) {
  const { dates } = useMeta();
  return (
    <p className={`text-xs text-ink-muted ${className}`} data-testid="short-disclaimer">
      {fillDates(SHORT_DISCLAIMER, dates)}{" "}
      <Link href="/disclaimer" className="underline">
        Full disclaimer
      </Link>
    </p>
  );
}

/** "Data: Kaggle — … (unofficial, not an NSE feed), first–last" from meta (REQ-PRV-16). */
export function DataSourceLine({ className = "" }: { className?: string }) {
  const { data, status } = useMeta();
  const src = data?.instruments[0]?.data_source;
  if (!src) {
    return <p className={`text-sm text-ink-muted ${className}`}>Data: {status === "error" ? "source details unavailable" : "loading…"}</p>;
  }
  return (
    <p className={`text-sm text-ink-muted ${className}`} data-testid="data-source">
      Data: {src.name} (unofficial, not an NSE feed), {day(src.first)} – {day(src.last)}.{" "}
      <a href={src.url} className="underline" rel="noreferrer noopener" target="_blank">
        Source
      </a>
    </p>
  );
}

/** Above every upload or paste control (REQ-PRV-29, 30). */
export function UploadPrivacyNotice() {
  return (
    <div role="note" className="rounded-md border-l-4 border-info bg-surface p-3 text-sm" data-testid="upload-privacy">
      To read your strategy, its text is sent to a third-party AI service ({AI_PROVIDER}), which may keep it for up to{" "}
      {AI_RETENTION_DAYS} days under its API policy. Nikasha itself stores nothing. Don&apos;t upload personal or confidential
      information.{" "}
      <Link href="/disclaimer" className="underline">
        Read the disclaimer
      </Link>
    </div>
  );
}

export function Footer() {
  const { data } = useMeta();
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-6">
        <DisclaimerShort />
        <p className="flex flex-wrap gap-4 text-xs text-ink-muted">
          <Link href="/disclaimer" className="underline">Full disclaimer</Link>
          <Link href="/disclaimer#data-source" className="underline">Data source</Link>
          <Link href="/learn" className="underline">Learn</Link>
          {data?.engine_version && <span>Engine version {data.engine_version}</span>}
        </p>
      </div>
    </footer>
  );
}

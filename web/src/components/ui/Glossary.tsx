"use client";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useState, type ReactNode } from "react";
import { GLOSSARY_BY_SLUG, parseTerms } from "@/copy/glossary";

/** A glossary term: dotted underline; definition on hover, focus or tap (REQ-BEG-10). */
export function GlossaryTerm({ slug, children }: { slug: string; children?: ReactNode }) {
  const entry = GLOSSARY_BY_SLUG[slug];
  const [open, setOpen] = useState(false);
  if (!entry) return <>{children}</>;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="cursor-help border-b border-dotted border-ink-muted text-left"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          aria-describedby={open ? `gloss-${slug}` : undefined}
        >
          {children ?? entry.term}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          id={`gloss-${slug}`}
          role="tooltip"
          side="top"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-w-xs rounded-md border border-line bg-surface p-3 text-sm shadow-md"
        >
          <strong>{entry.term}.</strong> {entry.definition}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Renders copy containing [[slug]] / [[slug|text]] markers. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseTerms(text).map((p, i) =>
        "slug" in p ? (
          <GlossaryTerm key={i} slug={p.slug}>
            {p.text}
          </GlossaryTerm>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** "ⓘ" tooltip for a field or metric (REQ-BEG-11). */
export function InfoTip({ text, label }: { text: string; label: string }) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button type="button" aria-label={`About ${label}`} className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs text-ink-muted">
            i
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6} className="z-50 max-w-xs rounded-md border border-line bg-surface p-2 text-sm shadow-md">
            {text}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

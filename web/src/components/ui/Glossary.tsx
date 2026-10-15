"use client";
import * as Popover from "@radix-ui/react-popover";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { GLOSSARY_BY_SLUG, parseTerms } from "@/copy/glossary";

type TriggerProps = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  "aria-describedby"?: string;
};

/**
 * Shared hint behaviour for glossary terms and ⓘ tips: opens on hover, focus or tap; closes when the
 * pointer leaves, focus moves away, Esc is pressed or anything else is clicked (frontend.md §6).
 */
function Hint({ id, content, trigger }: { id: string; content: ReactNode; trigger: (p: TriggerProps) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const props: TriggerProps = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onClick: () => setOpen(true), // a tap on a phone opens it; it never toggles shut under the pointer
    onKeyDown: (e) => {
      if (e.key === "Escape") setOpen(false);
    },
    "aria-describedby": open ? id : undefined,
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>{trigger(props)}</Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          id={id}
          role="tooltip"
          side="top"
          sideOffset={6}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-w-xs rounded-md border border-line bg-surface p-3 text-sm shadow-md"
          data-testid="hint"
        >
          {content}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** A glossary term: dotted underline; definition on hover, focus or tap (REQ-BEG-10). */
export function GlossaryTerm({ slug, children }: { slug: string; children?: ReactNode }) {
  const entry = GLOSSARY_BY_SLUG[slug];
  const id = `gloss-${slug}-${useId().replace(/:/g, "")}`;
  if (!entry) return <>{children}</>;
  return (
    <Hint
      id={id}
      content={<><strong>{entry.term}.</strong> {entry.definition}</>}
      trigger={(p) => (
        <button type="button" className="cursor-help border-b border-dotted border-ink-muted text-left" {...p}>
          {children ?? entry.term}
        </button>
      )}
    />
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
  const id = `tip-${useId().replace(/:/g, "")}`;
  return (
    <Hint
      id={id}
      content={text}
      trigger={(p) => (
        <button type="button" aria-label={`About ${label}`} className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs text-ink-muted" {...p}>
          i
        </button>
      )}
    />
  );
}

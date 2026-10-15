"use client";
// Small form controls for the builder. Every field has a visible label and a tooltip (REQ-BEG-11).
import type { ReactNode } from "react";
import { InfoTip } from "@/components/ui/Glossary";
import { FIELD_TOOLTIPS, type BuilderFieldId } from "@/copy/tooltips";

export function Field({ id, label, children, problem, note }: { id: BuilderFieldId; label: string; children: ReactNode; problem?: string; note?: ReactNode }) {
  return (
    <div className="space-y-1" data-field={id}>
      <div className="flex items-center text-sm font-medium">
        <span id={`lbl-${id}`}>{label}</span>
        <InfoTip label={label} text={FIELD_TOOLTIPS[id]} />
      </div>
      {children}
      {note && <div className="text-xs text-ink-muted">{note}</div>}
      {problem && <p className="text-xs text-risk" role="alert">{problem}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ id, value, options, onChange }: { id: string; value: T | undefined; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-labelledby={`lbl-${id}`} className="inline-flex flex-wrap gap-1 rounded-md border border-line p-1">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-sm ${value === o.value ? "bg-brand text-white" : "text-ink"} disabled:opacity-40`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NumberInput({ value, onChange, label, min, max, step, className = "w-28" }: { value: number | undefined; onChange: (v: number | undefined) => void; label: string; min?: number; max?: number; step?: number | "any"; className?: string }) {
  return (
    <input type="number" aria-label={label} className={`num rounded-md border border-line px-2 py-1 ${className}`} min={min} max={max} step={step ?? "any"}
      value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
  );
}

export function TimeInput({ value, onChange, label, min = "09:15", max = "15:29" }: { value: string | undefined; onChange: (v: string | undefined) => void; label: string; min?: string; max?: string }) {
  return (
    <input type="time" aria-label={label} className="num rounded-md border border-line px-2 py-1" min={min} max={max} step={60}
      value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} />
  );
}

export function Chips({ values, onPick, label }: { values: (string | number)[]; onPick: (v: string) => void; label: string }) {
  return (
    <span className="ml-2 inline-flex flex-wrap gap-1" aria-label={`Suggestions for ${label}`}>
      {values.map((v) => (
        <button key={String(v)} type="button" onClick={() => onPick(String(v))} className="rounded-full border border-line px-2 py-0.5 text-xs hover:border-accent">
          {v}
        </button>
      ))}
    </span>
  );
}

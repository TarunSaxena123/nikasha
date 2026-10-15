"use client";
// A pre-filled value with an explicit Confirm control; editing the value counts as confirming it.
export function ConfirmPrefill({
  label, value, confirmed, onChange, onConfirm, min = 1, max, note,
}: {
  label: string; value: number | undefined; confirmed: boolean; onChange: (v: number | undefined) => void;
  onConfirm: () => void; min?: number; max?: number; note?: string;
}) {
  const id = `prefill-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid={id}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Math.floor(Number(e.target.value)))}
        className="num w-24 rounded-md border border-line px-2 py-1"
        aria-describedby={note ? `${id}-note` : undefined}
      />
      {confirmed ? (
        <span className="text-xs text-gain">✓ Confirmed</span>
      ) : (
        <button type="button" onClick={onConfirm} disabled={value === undefined} className="rounded-md border border-accent px-2 py-1 text-xs font-medium disabled:opacity-40">
          Confirm
        </button>
      )}
      {note && <span id={`${id}-note`} className="w-full text-xs text-ink-muted">{note}</span>}
    </div>
  );
}

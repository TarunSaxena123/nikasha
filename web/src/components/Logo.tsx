// The Nikasha mark (owner's choice, 2026-10-15): a gold line on the touchstone. Decorative next to the name.
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <circle cx="32" cy="32" r="28" fill="#2B2F36" />
      <path d="M14 42l10-9 8 5 16-17" stroke="#B08A2E" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="48" cy="21" r="4" fill="#D9B65A" />
    </svg>
  );
}

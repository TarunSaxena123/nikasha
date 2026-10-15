// "← Back to <page>" at the top of every page but the intro (REQ-BEG-19).
import Link from "next/link";
import type { Back } from "@/lib/navigation";

export function BackLink({ to, className = "" }: { to: Back; className?: string }) {
  return (
    <Link href={to.href} prefetch={false} data-testid="back-link" className={`inline-block text-sm text-info underline ${className}`}>
      <span aria-hidden>← </span>Back to {to.label}
    </Link>
  );
}

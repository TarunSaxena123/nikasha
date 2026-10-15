import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "quiet";
const styles: Record<Variant, string> = {
  primary: "bg-brand text-white hover:opacity-90 disabled:opacity-40",
  secondary: "border border-line bg-surface text-ink hover:border-ink-muted disabled:opacity-40",
  quiet: "text-info underline-offset-2 hover:underline disabled:opacity-40",
};
const base = "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ href, variant = "primary", children, className = "" }: { href: string; variant?: Variant; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

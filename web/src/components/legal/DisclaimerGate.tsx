"use client";
// Wraps every gated route (feature 07 design §1.1). Nothing of the page renders before the consent
// check; until accepted, the full disclaimer is drawn in place at the requested URL.
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMeta } from "@/hooks/useMeta";
import { accept, CONSENT_KEY, read } from "@/legal/consent";
import { DisclaimerText } from "./Legal";

export function DisclaimerGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "accepted" | "gate">("checking");
  const [ticked, setTicked] = useState(false);
  const { status, reload } = useMeta();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setState(read() === "accepted" ? "accepted" : "gate");
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY) setState(read() === "accepted" ? "accepted" : "gate");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pathname]);

  if (state === "checking") {
    return <div aria-busy="true" className="mx-auto mt-12 h-48 max-w-3xl animate-pulse rounded-lg bg-surface" />;
  }
  if (state === "accepted") return <>{children}</>;

  const canContinue = ticked && status === "ready";
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-lg border border-line bg-surface p-6" data-testid="disclaimer-gate">
        <p className="mb-4 text-sm text-ink-muted">Before you start, please read and accept the disclaimer.</p>
        <DisclaimerText />
        {status === "error" && (
          <p className="mt-4 text-sm text-risk" role="alert">
            The data dates couldn&apos;t be loaded.{" "}
            <button type="button" className="underline" onClick={() => void reload()}>
              Try again
            </button>
          </p>
        )}
        <label className="mt-6 flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={ticked} onChange={(e) => setTicked(e.target.checked)} />
          <span>I understand and agree</span>
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              accept();
              setState("accepted");
            }}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
          <button type="button" onClick={() => router.push("/")} className="rounded-md border border-line px-4 py-2 text-sm">
            Back to intro
          </button>
        </div>
        {status === "loading" && <p className="mt-2 text-xs text-ink-muted">Loading the data dates…</p>}
      </div>
    </main>
  );
}

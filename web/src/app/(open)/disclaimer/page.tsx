import { DataSourceLine, DisclaimerText } from "@/components/legal/Legal";

export const metadata = { title: "Disclaimer — Nikasha" };

export default function DisclaimerPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-lg border border-line bg-surface p-6">
        <DisclaimerText />
        <h2 id="data-source" className="mt-8 text-base font-semibold">Data source</h2>
        <DataSourceLine className="mt-2" />
      </div>
    </main>
  );
}

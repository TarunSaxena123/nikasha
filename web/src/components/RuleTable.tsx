"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import type { RuleLine, TextNode } from "@/strategy/describe";
import { RichText } from "./ui/Glossary";

const TERMS: Record<string, string> = {
  strike: "[[atm-itm-otm|Strike]]",
  expiry: "[[expiry|Expiry]]",
  lot_size: "[[lot-size|Lot size]]",
  stop_loss: "[[stop-loss|Stop-loss]]",
  holding: "[[intraday-positional|Holding]]",
};

function Tree({ nodes }: { nodes: TextNode[] }) {
  return (
    <ul className="ml-4 list-disc space-y-0.5">
      {nodes.map((n, i) => (
        <li key={i}>
          {n.text}
          {n.children && n.children.length > 0 && <Tree nodes={n.children} />}
        </li>
      ))}
    </ul>
  );
}

export function RuleTable({
  rows,
  editHref,
  extra,
  caption,
  compact = false,
}: {
  rows: RuleLine[];
  editHref?: (row: RuleLine) => string;
  extra?: (row: RuleLine) => ReactNode;
  caption?: string;
  /** Narrow panels (the builder's preview): rule and setting only; the review screen shows the meaning. */
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-left text-sm ${compact ? "" : "min-w-[560px]"}`}>
        {caption && <caption className="mb-2 text-left text-sm text-ink-muted">{caption}</caption>}
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
            <th scope="col" className="py-2 pr-3">Rule</th>
            <th scope="col" className="py-2 pr-3">Setting</th>
            {!compact && <th scope="col" className="py-2 pr-3">What it means</th>}
            {(editHref || extra) && <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-line align-top" data-rule={r.key}>
              <th scope="row" className="py-2 pr-3 font-medium">
                <RichText text={TERMS[r.key] ?? r.rule} />
              </th>
              <td className={`py-2 pr-3 ${r.setting === "Not used" ? "text-ink-muted" : ""} ${r.setting === "Not set yet" ? "text-risk" : ""}`}>
                {r.setting}
                {r.tree && <div className="mt-1"><Tree nodes={r.tree} /></div>}
              </td>
              {!compact && <td className="py-2 pr-3 text-ink-muted">{r.meaning}</td>}
              {(editHref || extra) && (
                <td className="whitespace-nowrap py-2 text-right">
                  {extra?.(r)}
                  {editHref && (
                    <Link href={editHref(r)} className="ml-3 text-info underline" aria-label={`Edit ${r.rule}`}>Edit</Link>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

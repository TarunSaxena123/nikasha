// A tiny Markdown renderer for the bundled Learn articles: ## headings, paragraphs, "- " lists,
// **bold**, and [[glossary]] terms. No remote content, no HTML injection.
import { Fragment, type ReactNode } from "react";
import { RichText } from "./ui/Glossary";

function inline(text: string, key: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={`${key}-${i}`}><RichText text={p.slice(2, -2)} /></strong> : <RichText key={`${key}-${i}`} text={p} />,
  );
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.split(/\n\s*\n/);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.trim().split("\n");
        if (lines[0]!.startsWith("## ")) {
          return (
            <Fragment key={i}>
              <h2 className="pt-2 text-base font-semibold">{lines[0]!.slice(3)}</h2>
              {lines.length > 1 && <p>{inline(lines.slice(1).join(" "), `${i}`)}</p>}
            </Fragment>
          );
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}>{inline(l.slice(2), `${i}-${j}`)}</li>)}
            </ul>
          );
        }
        return <p key={i}>{inline(lines.join(" "), `${i}`)}</p>;
      })}
    </div>
  );
}

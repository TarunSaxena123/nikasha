// Client-side validation: the contract's JSON Schema (Ajv, compiled at build) then SEM-01…20.
// Problems are plain English with a field label, never a path (REQ-INP-03, 21; frontend.md §7).
import validateSchema from "@/generated/validateStrategy";
import type { Strategy } from "@/api/types";
import { semanticProblems, type Problem, type RuleContext } from "./strategyRules";

// Same order and wording as the engine's schema-problem mapping (validation/semantic.py).
const SCHEMA_LABELS: [string, string, string][] = [
  ["legs/*/strike", "Strike", "Choose one way to pick the strike."],
  ["indicators", "Indicator settings", "One of the indicators isn't set up in a way Nikasha supports."],
  ["timeframe_min", "Candle timeframe", "Choose one of the candle timeframes Nikasha offers."],
  ["holding", "Holding", "Choose Intraday or Positional."],
  ["position", "Position size", "Enter whole numbers of lots and a lot size."],
  ["legs", "Options to trade", "Each option leg needs a buy/sell action, option type, expiry and strike."],
  ["entry", "Entry conditions", "The entry rule isn't complete or uses something Nikasha doesn't support."],
  ["exit/stop_loss", "Stop-loss", "The stop-loss isn't set up in a way Nikasha supports."],
  ["exit/target", "Target", "The target isn't set up in a way Nikasha supports."],
  ["exit/time_exit", "Exit rule", "The time exit needs a time and a day."],
  ["exit", "Exit rule", "The exit rule isn't set up in a way Nikasha supports."],
  ["advanced", "Advanced options", "One of the advanced options isn't set up in a way Nikasha supports."],
  ["underlying", "Instrument", "This instrument isn't available in Nikasha yet."],
  ["schema_version", "Strategy", "This strategy was made by a different version of Nikasha."],
  ["", "Strategy", "Your strategy has a part Nikasha can't read."],
];

function keyOf(instancePath: string): string {
  return instancePath
    .split("/")
    .filter(Boolean)
    .map((p) => (/^\d+$/.test(p) ? "*" : p))
    .join("/");
}

export function schemaProblems(strategy: unknown): Problem[] {
  if (validateSchema(strategy)) return [];
  const problems: Problem[] = [];
  const seen = new Set<string>();
  for (const err of validateSchema.errors ?? []) {
    let key = keyOf(err.instancePath);
    if (!key && err.keyword === "required") key = String((err.params as { missingProperty?: string }).missingProperty ?? "");
    for (const [prefix, label, message] of SCHEMA_LABELS) {
      if (prefix && key !== prefix && !key.startsWith(prefix + "/")) continue;
      if (!seen.has(label)) {
        seen.add(label);
        problems.push({ rule: prefix === "legs/*/strike" ? "SEM-19" : null, field_label: label, message });
      }
      break;
    }
  }
  return problems;
}

/** Schema first; SEM rules only for a schema-valid strategy (as in the engine). */
export function validate(strategy: unknown, ctx: RuleContext): Problem[] {
  const sp = schemaProblems(strategy);
  if (sp.length) return sp;
  return semanticProblems(strategy as Strategy, ctx);
}

export type { Problem };

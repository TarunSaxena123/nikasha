// Problems → where to fix them (feature 03 design §1.12): field label / SEM rule → builder step.
import type { StepId } from "./completeness";

const BY_RULE: Record<string, StepId> = {
  "SEM-01": "basics", "SEM-02": "basics", "SEM-03": "entry", "SEM-04": "entry", "SEM-05": "entry",
  "SEM-06": "strike", "SEM-07": "exit", "SEM-08": "exit", "SEM-09": "entry", "SEM-10": "entry",
  "SEM-11": "advanced", "SEM-12": "advanced", "SEM-13": "basics", "SEM-14": "basics", "SEM-15": "entry",
  "SEM-16": "exit", "SEM-17": "exit", "SEM-18": "advanced", "SEM-19": "strike", "SEM-20": "basics",
};

const BY_LABEL: Record<string, StepId> = {
  Instrument: "basics", "Candle timeframe": "basics", Holding: "basics", "Position size": "basics",
  "Options to trade": "basics", Strike: "strike", "Entry conditions": "entry", "Indicator settings": "entry",
  "Entry trigger": "entry", Times: "entry", "Stop-loss": "exit", Target: "exit", "Exit rule": "exit",
  "Advanced options": "advanced", "Volatility sizing": "advanced", Legs: "advanced", "Entry timing": "advanced",
  Expiry: "basics",
};

/** Builder step for a problem. Period problems belong to the review screen's settings, not the builder. */
export function stepFor(p: { rule?: string | null; field_label: string }): StepId | "settings" {
  if (p.rule === "SEM-13" || p.rule === "SEM-14" || p.field_label === "Backtest period") return "settings";
  if (p.rule && BY_RULE[p.rule]) return BY_RULE[p.rule]!;
  return BY_LABEL[p.field_label] ?? "basics";
}

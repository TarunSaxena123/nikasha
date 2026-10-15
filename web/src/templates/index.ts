// Templates (feature 05 design §1.3). Each strategy.json is identical to its shared fixture in
// specs/contracts/fixtures/strategies/valid (a test checks), so both test suites validate it.
import type { Strategy } from "@/api/types";
import stf from "./simple-trend-follower/strategy.json";
import htf from "./higher-timeframe-trend/strategy.json";
import straddle from "./simple-short-straddle/strategy.json";

export interface TemplateMeta {
  id: string;
  name: string;
  priority: "P0" | "P1" | "P2";
  fixture: string; // file name of the shared fixture
  explanation: string;
  riskNote: string;
  prominentRisk?: boolean;
  whatItMeans: Record<string, string>;
  strategy: Strategy;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "simple-trend-follower",
    name: "Simple Trend Follower",
    priority: "P0",
    fixture: "simple-trend-follower",
    explanation:
      "When the short-term average price crosses above the longer-term average, buy a call; when it crosses below, buy a put. Exit at a fixed loss or profit, and never hold overnight.",
    riskNote: "Trend signals often reverse quickly on sideways days, which can mean several small losses in a row.",
    whatItMeans: {
      entry: "A call when the 9-candle average rises above the 21-candle average; a put when it falls below",
      stop_loss: "Bought at ₹100 → exit at ₹70",
      exit_rule: "Bought at ₹100 → exit at ₹150; anything still open closes at 15:15",
    },
    strategy: stf as unknown as Strategy,
  },
  {
    id: "higher-timeframe-trend",
    name: "Higher-Timeframe Trend",
    priority: "P1",
    fixture: "higher-timeframe-trend",
    explanation:
      "The same crossover idea on 1-hour candles, used only when the trend is strong (ADX above 20). Trades are held overnight until a stop, a target, or midday on expiry day.",
    riskNote: "Holding overnight means gaps: the market can open far beyond your stop-loss.",
    whatItMeans: {
      stop_loss: "Bought at ₹100 → exit at ₹70",
      exit_rule: "Bought at ₹100 → exit at ₹160, or at 12:00 on expiry day, whichever comes first",
    },
    strategy: htf as unknown as Strategy,
  },
  {
    id: "simple-short-straddle",
    name: "Simple short straddle",
    priority: "P2",
    fixture: "short-straddle",
    explanation:
      "Sell both an at-the-money call and put at 09:20 to collect premium, betting the market stays quiet. Both close together at a combined stop-loss or at 15:15.",
    riskNote: "Selling options can lose much more than the premium you receive. A single big move can wipe out many small gains.",
    prominentRisk: true,
    whatItMeans: {
      stop_loss: "Sold a call and a put for ₹200 in total → both close if their combined value reaches ₹260",
    },
    strategy: straddle as unknown as Strategy,
  },
];

/** Only built templates appear (a template cut for time would simply be left out of this list). */
export const AVAILABLE_TEMPLATES = TEMPLATES;

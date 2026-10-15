// The full and short disclaimers — one source for the gate, the /disclaimer page, the footer, report,
// suggestion panels and downloads (feature 07 design §1.3). Text = product.md §11.1 / §11.2 exactly;
// a unit test compares them, so the app can't drift from the approved spec.
import { sha256Hex } from "@/lib/sha256";
import { day } from "@/lib/format";

export interface Block {
  lead?: string; // bold lead-in, e.g. "Not SEBI-registered."
  text: string;
}

export const FULL_TITLE = "Disclaimer";

export const FULL_DISCLAIMER: Block[] = [
  { text: "Nikasha is an educational and research tool. It is provided solely to help users learn how trading strategies might have behaved on historical data." },
  { lead: "Not SEBI-registered.", text: "The creator of Nikasha is not registered with the Securities and Exchange Board of India (SEBI) as an Investment Adviser, Research Analyst or in any other capacity, and is not a stockbroker or financial planner." },
  { lead: "Not investment advice.", text: "Nothing on this platform, including reports, summaries, suggestions, templates and alternative strategies, is investment, financial, trading, tax or legal advice, or a recommendation or solicitation to buy, sell or hold any security, derivative or commodity. Suggestions describe how changes to hypothetical rules would have affected past simulated results; they are not trade recommendations." },
  { lead: "Hypothetical results.", text: "All results are simulated backtests on historical data. Option premiums are modelled, not actual market prices, and may differ materially from real prices. Backtests do not account for every real-world factor (including liquidity, slippage, order execution, margin requirements, and regulatory or market changes). Past or simulated performance does not guarantee future results." },
  { lead: "Data source.", text: "Historical Nifty 50 and India VIX 1-minute data covering {firstDate} to {lastDate} (filled in automatically from the data) is taken from the publicly available Kaggle dataset \"NSE - Nifty 50 Index Minute data (2015 to 2026)\" (https://www.kaggle.com/datasets/debashis74017/nifty-50-minute-data). As stated by its uploader, this dataset was collected from various internet sources and is provided for research purposes only; it is not an official NSE data feed. Nikasha uses it solely for non-commercial, educational purposes. The data has not been independently verified and may contain errors, gaps or inaccuracies, and all results depend on it." },
  { lead: "Trademarks.", text: "NIFTY 50 and India VIX are trademarks of NSE Indices Limited / National Stock Exchange of India Limited. Nikasha is not affiliated with, endorsed by or sponsored by NSE, NSE Indices Limited or SEBI." },
  { lead: "Your data and privacy.", text: "Nikasha does not store your strategies, uploaded files, evaluation results, session data or any personal data on its servers. Uploaded files are processed in memory only and discarded once your strategy has been read. To read uploaded strategy text, it is sent to a third-party AI service (Anthropic), which, under its published policy for API use, automatically deletes inputs and outputs within 30 days, except where longer retention is needed to enforce its usage policy or comply with the law; do not upload personal or confidential information. Results exist only in your open browser tab until you download them. The only thing remembered is your acceptance of this disclaimer, stored in your own browser on your device." },
  { lead: "High risk.", text: "Trading in derivatives (futures and options) involves substantial risk and can result in losses exceeding your initial capital. Such trading is not suitable for everyone." },
  { lead: "Your responsibility.", text: "You are solely responsible for your trading and investment decisions and for any resulting profits or losses. Before trading, consult a SEBI-registered investment adviser or other qualified professional." },
  { lead: "No liability.", text: "To the maximum extent permitted by law, the creator and contributors of Nikasha accept no liability for any direct, indirect, incidental or consequential loss or damage, including trading losses or lost profits, arising from the use of, or reliance on, this platform or its outputs." },
  { lead: "No warranty.", text: "The platform, data and results are provided \"as is\" and \"as available\", without warranties of any kind, including accuracy, completeness, or fitness for a particular purpose." },
  { text: "By using Nikasha, you acknowledge that you have read, understood and agreed to this disclaimer." },
];

export const SHORT_DISCLAIMER =
  "Educational use only. Not SEBI-registered; not investment advice. Not affiliated with NSE. Results are simulated backtests on unofficial Nifty 50 and India VIX data from Kaggle ({firstDate} – {lastDate}, read from the data) with modelled option prices, and do not guarantee future returns. Nikasha stores none of your data. You are solely responsible for your trading decisions and any profits or losses.";

/** AI provider and its API retention, shown next to every upload control (REQ-PRV-29, 30). */
export const AI_PROVIDER = "Anthropic";
export const AI_RETENTION_DAYS = 30;

export type DateState = { first: string; last: string } | "loading" | "unavailable";

/** Fill {firstDate}/{lastDate}. Never falls back to a literal date (REQ-PRV-09, 10, 15). */
export function fillDates(template: string, range: DateState): string {
  if (range === "loading") {
    return template.replace(/\s*\(?\{firstDate\}( to | – )\{lastDate\}([^)]*)\)?/, " (loading dates…)");
  }
  if (range === "unavailable") {
    return template.replace(/\s*\(?\{firstDate\}( to | – )\{lastDate\}([^)]*)\)?/, " (dates unavailable)");
  }
  return template.replace("{firstDate}", day(range.first)).replace("{lastDate}", day(range.last));
}

export function fullTemplateText(): string {
  return [FULL_TITLE, ...FULL_DISCLAIMER.map((b) => (b.lead ? `${b.lead} ${b.text}` : b.text))].join("\n\n");
}

/** Hash of the unfilled full text: a text change asks for acceptance again; a date change doesn't. */
export const DISCLAIMER_VERSION = sha256Hex(fullTemplateText());

// Glossary (REQ-BEG-09): every product.md §16 term, in plain English. Copy elsewhere marks terms
// with [[slug]] or [[slug|shown text]]; an unknown slug fails the tests, so it never ships broken.
export interface GlossaryEntry {
  slug: string;
  term: string;
  definition: string;
}

export const VWAP_NOTE =
  "VWAP isn't available for Nifty 50. VWAP is calculated from traded volume, and Nifty 50 is an index, not a traded stock, so its chart has no volume and no VWAP.";

export const GLOSSARY: GlossaryEntry[] = [
  { slug: "option", term: "Option", definition: "A contract giving the right to buy (call) or sell (put) the underlying at a set price (the strike) on expiry." },
  { slug: "ce-pe", term: "CE / PE", definition: "CE is a call option, which gains when the index rises. PE is a put option, which gains when the index falls." },
  { slug: "premium", term: "Premium", definition: "The price of an option. A buyer pays it; a seller receives it." },
  { slug: "strike", term: "Strike", definition: "The price at which the option can be exercised." },
  { slug: "atm-itm-otm", term: "ATM / ITM / OTM", definition: "At, in or out of the money: the strike is at the current price, favourably beyond it, or unfavourably beyond it." },
  { slug: "strike-interval", term: "Strike interval", definition: "The gap between available strikes. For Nifty 50 it is 50 points." },
  { slug: "expiry", term: "Expiry", definition: "The date an option contract ends. Nifty 50 has weekly and monthly expiries." },
  { slug: "lot-size", term: "Lot / lot size", definition: "Options trade in lots. The lot size is the quantity in one lot (65 for Nifty 50 today)." },
  { slug: "india-vix", term: "India VIX", definition: "NSE's index of expected 30-day Nifty volatility. Nikasha uses it as the option's implied volatility." },
  { slug: "implied-volatility", term: "Implied volatility (IV)", definition: "The volatility the market prices into an option. Higher volatility means higher premiums." },
  { slug: "black-scholes", term: "Black-Scholes", definition: "The formula Nikasha uses to model option premiums from the index level, strike, time to expiry, interest rate and volatility." },
  { slug: "intraday-positional", term: "Intraday / Positional", definition: "Intraday trades are closed the same day. Positional trades may be held overnight." },
  { slug: "stop-loss", term: "Stop-loss (SL)", definition: "An exit level that limits the loss on a trade." },
  { slug: "target", term: "Target", definition: "An exit level that takes profit." },
  { slug: "trailing-sl", term: "Trailing SL", definition: "A stop-loss that moves in the trade's favour, for example to the entry price (cost)." },
  { slug: "risk-reward", term: "R:R (risk-reward)", definition: "The target distance divided by the stop distance. 1.5 means the target is 1.5 times as far as the stop." },
  { slug: "square-off", term: "Square-off", definition: "Closing an open position. Intraday positions are squared off at 15:15." },
  { slug: "slippage", term: "Slippage", definition: "The difference between the expected price and the price you actually get." },
  { slug: "backtest", term: "Backtest", definition: "Simulating a strategy on past data to see how it would have behaved." },
  { slug: "equity-curve", term: "Equity curve", definition: "The running total of profit and loss, trade by trade." },
  { slug: "drawdown", term: "Drawdown / max drawdown", definition: "A fall from a previous peak of the equity curve. The max drawdown is the largest such fall." },
  { slug: "win-rate", term: "Win rate", definition: "The share of trades that made money after costs." },
  { slug: "expectancy", term: "Expectancy", definition: "The average profit or loss per trade, after costs." },
  { slug: "losing-streak", term: "Losing streak", definition: "A run of losing trades in a row." },
  { slug: "in-sample-out-of-sample", term: "In-sample / out-of-sample", definition: "The earlier period a strategy could have been tuned on, and the unseen recent period used to check it." },
  { slug: "overfitting", term: "Overfitting", definition: "Rules that fit past noise rather than a real pattern, so they tend to fail on unseen data." },
  { slug: "regime", term: "Regime", definition: "The market's condition, such as trending or sideways, or low or high volatility." },
  { slug: "theta-decay", term: "Theta decay", definition: "The loss of an option's time value as expiry gets closer. It speeds up near expiry." },
  { slug: "ema-sma", term: "EMA / SMA", definition: "Exponential and simple moving averages of price. The EMA reacts faster to recent prices." },
  { slug: "rsi", term: "RSI", definition: "Relative Strength Index, a momentum measure from 0 to 100." },
  { slug: "adx", term: "ADX", definition: "Average Directional Index, a measure of trend strength (not direction). Higher means a stronger trend." },
  { slug: "supertrend", term: "Supertrend", definition: "A trend indicator built from price bands. \"Green\" means up, \"red\" means down." },
  { slug: "macd", term: "MACD", definition: "Moving Average Convergence Divergence: the gap between a fast and a slow EMA, with a signal line." },
  { slug: "vwap", term: "VWAP", definition: `Volume-weighted average price. ${VWAP_NOTE}` },
  { slug: "bollinger-bands", term: "Bollinger Bands", definition: "A moving average with bands a set number of standard deviations above and below it." },
  { slug: "stt", term: "STT", definition: "Securities Transaction Tax, charged on option sales and on exercised options." },
];

export const GLOSSARY_BY_SLUG: Record<string, GlossaryEntry> = Object.fromEntries(GLOSSARY.map((g) => [g.slug, g]));

/** Split copy into text and glossary-term parts. Throws on an unknown slug (caught by tests). */
export function parseTerms(text: string): ({ text: string } | { slug: string; text: string })[] {
  const parts: ({ text: string } | { slug: string; text: string })[] = [];
  const re = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const slug = m[1]!;
    const entry = GLOSSARY_BY_SLUG[slug];
    if (!entry) throw new Error(`Unknown glossary term: ${slug}`);
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ slug, text: m[2] ?? entry.term });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Plain text with the term markers removed (PDF, banned-phrase scans). */
export function plainTerms(text: string): string {
  return parseTerms(text).map((p) => p.text).join("");
}

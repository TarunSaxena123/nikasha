// One tooltip per report metric and builder field (REQ-BEG-11). Keys are typed so a test can
// prove every key has text.
export const REPORT_METRIC_KEYS = [
  "max_drawdown", "worst_losing_streak", "largest_loss", "net_pnl", "win_rate_pct", "avg_win", "avg_loss",
  "expectancy", "trades", "return_pct", "max_drawdown_pct", "total_costs", "total_slippage", "gross_pnl",
] as const;
export type ReportMetricKey = (typeof REPORT_METRIC_KEYS)[number];

export const METRIC_LABELS: Record<ReportMetricKey, string> = {
  max_drawdown: "Max drawdown",
  worst_losing_streak: "Worst losing streak",
  largest_loss: "Largest loss",
  net_pnl: "Net P&L",
  win_rate_pct: "Win rate",
  avg_win: "Average win",
  avg_loss: "Average loss",
  expectancy: "Expectancy",
  trades: "Trades",
  return_pct: "Return",
  max_drawdown_pct: "Max drawdown %",
  total_costs: "Costs",
  total_slippage: "Slippage",
  gross_pnl: "Gross P&L",
};

export const METRIC_TOOLTIPS: Record<ReportMetricKey, string> = {
  max_drawdown: "The largest fall from a previous peak of the running profit and loss.",
  worst_losing_streak: "The most losing trades in a row.",
  largest_loss: "The single worst trade, after costs.",
  net_pnl: "The total profit or loss after all costs and slippage.",
  win_rate_pct: "The share of trades that made money after costs.",
  avg_win: "The average result of the winning trades.",
  avg_loss: "The average result of the losing trades.",
  expectancy: "The average result per trade, winners and losers together.",
  trades: "How many trades were taken in the selected period.",
  return_pct: "Net profit or loss as a percentage of the capital you entered.",
  max_drawdown_pct: "The largest fall as a percentage of the capital you entered plus the profit at that peak.",
  total_costs: "Brokerage, taxes and exchange charges added up over all trades.",
  total_slippage: "The cost of the assumed slippage on every fill, already included in the result.",
  gross_pnl: "The profit or loss before charges (slippage is already in the prices).",
};

export const BUILDER_FIELD_IDS = [
  "instrument", "action", "option_type", "expiry", "timeframe", "holding", "lots", "lot_size", "moneyness",
  "distance", "entry_mode", "at_time", "indicators", "conditions", "stop_loss", "target", "time_exit",
  "positional_exit", "sl_cap", "trigger_candle_sl", "rr_target", "trail_to_cost", "exit_after_candles",
  "vix_sizing", "entry_windows", "no_entry_windows", "expiry_day_cutoff", "daily_limits", "multiple_legs",
  "strike_by_delta_premium",
] as const;
export type BuilderFieldId = (typeof BUILDER_FIELD_IDS)[number];

export const FIELD_TOOLTIPS: Record<BuilderFieldId, string> = {
  instrument: "Nifty 50 is the only instrument in Nikasha for now.",
  action: "Buying an option costs the premium; selling one earns it but can lose much more.",
  option_type: "A call gains when the index rises, a put when it falls. Both: a call on the call signal, a put on the put signal.",
  expiry: "Which contract to trade: the nearest weekly, the one after it, or the monthly.",
  timeframe: "The candle length used to check your entry conditions.",
  holding: "Intraday positions close by 15:15. Positional ones can be held overnight.",
  lots: "How many lots in every trade. Please confirm the pre-filled value.",
  lot_size: "The quantity in one lot. Pre-filled with today's lot size; please confirm or change it.",
  moneyness: "At the money is the strike nearest the index; in the money is favourable, out of the money is unfavourable.",
  distance: "How far from the at-the-money strike, in steps of 50 points.",
  entry_mode: "Start a trade when conditions are met, at a fixed time, or at a fixed time only if conditions are met.",
  at_time: "The time of day to enter, in market hours.",
  indicators: "Indicators your conditions use. Add the same type more than once with different settings if you need to.",
  conditions: "Every condition in an All of group must be true together; Any of needs at least one.",
  stop_loss: "Where a losing trade is closed: a % of the premium or a number of premium points.",
  target: "Where a winning trade is closed: a % of the premium or a number of premium points.",
  time_exit: "Close the trade at a set time.",
  positional_exit: "A positional trade needs a way to end: hold until expiry, a time on expiry day, a target, or a number of candles.",
  sl_cap: "The stop-loss is never further than this many premium points from the entry.",
  trigger_candle_sl: "The stop sits at the signal candle's lowest (bought) or highest (sold) modelled premium.",
  rr_target: "The target is this many times the stop distance away from the entry.",
  trail_to_cost: "After the trade gains this multiple of its initial risk, the stop moves to the entry price.",
  exit_after_candles: "Close the trade after this many candles if neither the stop nor the target is hit.",
  vix_sizing: "Trade a different share of your lots depending on India VIX. Bands must cover every VIX level.",
  entry_windows: "New trades only start inside these times.",
  no_entry_windows: "No new trades start inside these times.",
  expiry_day_cutoff: "On the contract's expiry day, no new trades start at or after this time.",
  daily_limits: "Stop taking new trades for the day after a number of trades, stop-losses or a loss amount.",
  multiple_legs: "Open 2 to 4 options together, with one combined stop-loss and target.",
  strike_by_delta_premium: "Choose the strike whose modelled delta or premium is closest to your target.",
};

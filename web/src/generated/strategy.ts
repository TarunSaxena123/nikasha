// Generated from specs/contracts by web/scripts/codegen.mjs. Do not edit by hand.

export type Indicator = MovingAverageEMAOrSMA | RSIOrADX | Supertrend | MACD | BollingerBands;
export type PriceField = "open" | "high" | "low" | "close";
export type StrikeSelection = ByMoneynessMandatoryInputs4And5 | ByDeltaAdvanced | ByPremiumAdvanced;
/**
 * Evaluated on each candle close. Groups nest (max depth 4, SEM-15).
 */
export type Condition = AllGroup | AnyGroup | Compare | Cross | State | Turns | Slope;
export type Operand = IndicatorOutput | UnderlyingCandlePrice | VolatilityIndexValueOnTheCandle | ConstantNumber;
export type IndicatorId = string;
/**
 * Shifts an operand, e.g. EMA 21 + 10 points, to express thresholds such as 'closes decisively above'.
 */
export type Offset =
  | {
      pts: number;
    }
  | {
      pct: number;
    };
/**
 * Clock time HH:MM, IST.
 */
export type Time = string;

/**
 * Internal strategy format. Never shown to users (constitution §4). Structural rules live here; rules JSON Schema cannot express are in strategy-rules.md (SEM-xx) and are enforced identically by the web app and the engine. Mandatory inputs (product.md §6.1) are the required top-level fields. Every advanced option (product.md §6.2) is OFF when absent and has no default.
 */
export interface Strategy {
  schema_version: "1.0";
  name?: string;
  /**
   * Which entry path produced this strategy. Informational only; does not change evaluation.
   */
  origin?: "TEMPLATE" | "BUILDER" | "UPLOAD";
  template_id?: string;
  /**
   * Instrument symbol from the instrument registry (mandatory input 1).
   */
  underlying: string;
  /**
   * Candle timeframe in minutes (mandatory input 7). Also limited by the instrument profile's allowed_timeframes_min.
   */
  timeframe_min: 1 | 3 | 5 | 15 | 30 | 60 | 240;
  /**
   * Mandatory input 8. INTRADAY positions are squared off at the profile's intraday_squareoff time.
   */
  holding: "INTRADAY" | "POSITIONAL";
  /**
   * Mandatory inputs 9 and 10. Applied uniformly to every trade in the backtest.
   */
  position: {
    lots: number;
    lot_size: number;
  };
  /**
   * Indicator instances referenced by conditions, keyed by an id such as ema9. May be empty for fixed-time strategies.
   */
  indicators: {
    [k: string]: Indicator;
  };
  /**
   * Mandatory inputs 2–6 (action, option type, moneyness, distance, expiry). More than one leg is an advanced option.
   *
   * @minItems 1
   * @maxItems 4
   */
  legs: [Leg] | [Leg, Leg] | [Leg, Leg, Leg] | [Leg, Leg, Leg, Leg];
  entry: Entry;
  exit: Exit;
  advanced?: Advanced;
}
export interface MovingAverageEMAOrSMA {
  type: "EMA" | "SMA";
  period: number;
  source: PriceField;
}
/**
 * RSI outputs: value. ADX outputs: value (ADX), plus_di, minus_di.
 */
export interface RSIOrADX {
  type: "RSI" | "ADX";
  period: number;
}
/**
 * Outputs: value (the Supertrend line) and direction (up = green, down = red), used by state/turns conditions.
 */
export interface Supertrend {
  type: "SUPERTREND";
  period: number;
  multiplier: number;
}
/**
 * Outputs: value (MACD line), signal, hist.
 */
export interface MACD {
  type: "MACD";
  fast: number;
  slow: number;
  signal: number;
}
/**
 * Outputs: upper, middle, lower.
 */
export interface BollingerBands {
  type: "BBANDS";
  period: number;
  stddev: number;
  source: PriceField;
}
export interface Leg {
  /**
   * Mandatory input 2.
   */
  action: "BUY" | "SELL";
  /**
   * Mandatory input 3. SIGNAL = CE when the CE entry condition is met, PE when the PE entry condition is met (option type 'both').
   */
  option_type: "CE" | "PE" | "SIGNAL";
  /**
   * Mandatory input 6.
   */
  expiry: "CURRENT_WEEKLY" | "NEXT_WEEKLY" | "MONTHLY";
  strike: StrikeSelection;
}
export interface ByMoneynessMandatoryInputs4And5 {
  method: "MONEYNESS";
  moneyness: "ATM" | "ITM" | "OTM";
  distance_pts: number;
}
export interface ByDeltaAdvanced {
  method: "DELTA";
  target_delta: number;
}
export interface ByPremiumAdvanced {
  method: "PREMIUM";
  target_premium: number;
}
/**
 * Mandatory input 11. An entry happens only when the entire strategy is satisfied (product.md §7.2). Triggers present together must all hold (at_time AND the side's conditions).
 */
export interface Entry {
  /**
   * Fixed entry time; with conditions it is an additional requirement.
   */
  at_time?: string;
  /**
   * Conditions that open CE (and SIGNAL-as-CE) legs.
   */
  ce?: AllGroup | AnyGroup | Compare | Cross | State | Turns | Slope;
  /**
   * Evaluated on each candle close. Groups nest (max depth 4, SEM-15).
   */
  pe?: AllGroup | AnyGroup | Compare | Cross | State | Turns | Slope;
  /**
   * Evaluated on each candle close. Groups nest (max depth 4, SEM-15).
   */
  all_legs?: AllGroup | AnyGroup | Compare | Cross | State | Turns | Slope;
}
/**
 * True when every condition is true (AND).
 */
export interface AllGroup {
  type: "all";
  /**
   * @minItems 1
   * @maxItems 20
   */
  conditions:
    | [Condition]
    | [Condition, Condition]
    | [Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ];
}
/**
 * True when at least one condition is true (OR). Only used where the user's rule says 'or' (product.md §6.4).
 */
export interface AnyGroup {
  type: "any";
  /**
   * @minItems 2
   * @maxItems 20
   */
  conditions:
    | [Condition, Condition]
    | [Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition]
    | [Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition, Condition]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ]
    | [
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition,
        Condition
      ];
}
export interface Compare {
  type: "compare";
  left: Operand;
  op: "gt" | "gte" | "lt" | "lte";
  right: Operand;
}
export interface IndicatorOutput {
  ind: IndicatorId;
  output: "value" | "signal" | "hist" | "upper" | "middle" | "lower" | "plus_di" | "minus_di";
  offset?: Offset;
}
export interface UnderlyingCandlePrice {
  price: PriceField;
  offset?: Offset;
}
export interface VolatilityIndexValueOnTheCandle {
  vix: "open" | "close";
}
export interface ConstantNumber {
  const: number;
}
/**
 * left crosses above/below right on this candle (was on the other side, or equal, on the previous candle).
 */
export interface Cross {
  type: "cross";
  left: Operand;
  direction: "above" | "below";
  right: Operand;
}
/**
 * A direction indicator is currently up/down (e.g. Supertrend is green), on any candle while it holds.
 */
export interface State {
  type: "state";
  ind: IndicatorId;
  is: "up" | "down";
}
/**
 * A direction indicator flips to up/down on this candle only (e.g. Supertrend turns green).
 */
export interface Turns {
  type: "turns";
  ind: IndicatorId;
  to: "up" | "down";
}
/**
 * Operand is higher (up) / lower (down) now than lookback candles ago.
 */
export interface Slope {
  type: "slope";
  operand: Operand;
  direction: "up" | "down";
  lookback: number;
}
/**
 * Mandatory inputs 12 and 13. INTRADAY: the square-off time is the time exit. POSITIONAL: needs target, time_exit, hold_to_expiry or advanced.exit_after_candles, chosen by the user (SEM-07). A position still open on its expiry day is settled at intrinsic value. For multi-leg strategies, stop_loss and target apply to the combined position.
 */
export interface Exit {
  stop_loss:
    | PercentOfEntryPremium
    | PremiumPoints
    | TriggerCandleAdvancedLowBoughtHighSoldOfTheTriggerCandleOnTheModelledOptionPremium;
  target?:
    | {
        type: "PCT_PREMIUM" | "POINTS";
        value: number;
      }
    | RiskRewardAdvancedTargetDistanceValueStopDistance;
  time_exit?: {
    at: Time;
    on: "ENTRY_DAY" | "EXPIRY_DAY";
  };
  /**
   * Positional only, chosen by the user: hold until expiry and settle at intrinsic value. Only the value true is meaningful; absence means not chosen.
   */
  hold_to_expiry?: true;
}
export interface PercentOfEntryPremium {
  type: "PCT_PREMIUM";
  value: number;
}
export interface PremiumPoints {
  type: "POINTS";
  value: number;
}
export interface TriggerCandleAdvancedLowBoughtHighSoldOfTheTriggerCandleOnTheModelledOptionPremium {
  type: "TRIGGER_CANDLE";
}
export interface RiskRewardAdvancedTargetDistanceValueStopDistance {
  type: "RR";
  value: number;
}
/**
 * Every property is OFF when absent. No property has a default (constitution §3).
 */
export interface Advanced {
  /**
   * Maximum stop distance in premium points.
   */
  sl_cap_pts?: number;
  /**
   * Move stop to entry price once profit reaches this multiple of the initial risk.
   */
  trail_to_cost_at_r?: number;
  /**
   * Exit if neither stop nor target is hit within N candles after entry.
   */
  exit_after_candles?: number;
  /**
   * Position size per VIX band, as % of the set lots. Bands must cover all VIX values without gaps or overlaps (SEM-12). Result rounded down, minimum 1 lot.
   */
  vix_sizing?: {
    /**
     * DAY_OPEN = the day's first VIX value (09:15; used for 'pre-market' rules). ENTRY = VIX at the entry minute.
     */
    measured_at: "DAY_OPEN" | "ENTRY";
    /**
     * @minItems 1
     * @maxItems 6
     */
    bands:
      | [
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          }
        ]
      | [
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          }
        ]
      | [
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          }
        ]
      | [
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          }
        ]
      | [
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          }
        ]
      | [
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          },
          {
            /**
             * Inclusive lower edge; absent = no lower edge.
             */
            vix_from?: number;
            /**
             * Exclusive upper edge; absent = no upper edge.
             */
            vix_to?: number;
            size_pct: number;
          }
        ];
  };
  /**
   * New entries only inside these windows.
   *
   * @minItems 1
   * @maxItems 6
   */
  entry_windows?:
    | [TimeWindow]
    | [TimeWindow, TimeWindow]
    | [TimeWindow, TimeWindow, TimeWindow]
    | [TimeWindow, TimeWindow, TimeWindow, TimeWindow]
    | [TimeWindow, TimeWindow, TimeWindow, TimeWindow, TimeWindow]
    | [TimeWindow, TimeWindow, TimeWindow, TimeWindow, TimeWindow, TimeWindow];
  /**
   * No new entries inside these windows.
   *
   * @minItems 1
   * @maxItems 6
   */
  no_entry_windows?:
    | [TimeWindow]
    | [TimeWindow, TimeWindow]
    | [TimeWindow, TimeWindow, TimeWindow]
    | [TimeWindow, TimeWindow, TimeWindow, TimeWindow]
    | [TimeWindow, TimeWindow, TimeWindow, TimeWindow, TimeWindow]
    | [TimeWindow, TimeWindow, TimeWindow, TimeWindow, TimeWindow, TimeWindow];
  /**
   * Clock time HH:MM, IST.
   */
  expiry_day_cutoff?: string;
  daily?: {
    max_trades?: number;
    stop_after_sl_hits?: number;
    max_daily_loss_rupees?: number;
  };
}
export interface TimeWindow {
  from: Time;
  to: Time;
}

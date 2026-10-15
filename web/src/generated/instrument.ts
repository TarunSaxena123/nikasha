// Generated from specs/contracts by web/scripts/codegen.mjs. Do not edit by hand.

export type Time = string;

/**
 * One instrument's configuration (product.md §8). The engine contains no instrument-specific logic; everything that differs between instruments is here (constitution §10). Profiles live in /instruments/*.json.
 */
export interface InstrumentProfile {
  profile_version: "1.0";
  identity: {
    symbol: string;
    name: string;
    exchange: "NSE" | "BSE" | "MCX" | "TEST";
    segment: string;
    timezone?: "Asia/Kolkata";
  };
  /**
   * Regular session(s). Several sessions allow e.g. MCX evening trading.
   */
  session: {
    /**
     * @minItems 1
     * @maxItems 3
     */
    sessions:
      | [
          {
            open: Time;
            close: Time;
          }
        ]
      | [
          {
            open: Time;
            close: Time;
          },
          {
            open: Time;
            close: Time;
          }
        ]
      | [
          {
            open: Time;
            close: Time;
          },
          {
            open: Time;
            close: Time;
          },
          {
            open: Time;
            close: Time;
          }
        ];
    /**
     * Label of the first 1-minute bar of the day.
     */
    first_bar: string;
    /**
     * Label of the last 1-minute bar of the day.
     */
    last_bar: string;
    /**
     * Intraday positions are closed at this minute's open.
     */
    intraday_squareoff: string;
  };
  contract: {
    strike_interval: number;
    /**
     * Pre-fill only; the user confirms or changes it.
     */
    lot_size_suggested: number;
    /**
     * Plain-English note shown next to the pre-fill.
     */
    lot_size_note: string;
    multiplier: number;
    tick_size: number;
    settlement: "CASH_INTRINSIC_LAST_BAR_CLOSE";
  };
  /**
   * Dated expiry rules (product.md §7.4). Rules are matched by the scheduled expiry date.
   */
  expiry: {
    /**
     * Time of day at which contracts expire, used for time to expiry.
     */
    expiry_time: string;
    /**
     * @minItems 1
     */
    rules: [
      {
        kind: "WEEKLY" | "MONTHLY";
        weekday: "MON" | "TUE" | "WED" | "THU" | "FRI";
        /**
         * MONTHLY only: which weekday of the month.
         */
        position?: "LAST";
        /**
         * First scheduled expiry date this rule applies to (inclusive).
         */
        valid_from: string;
        /**
         * Last scheduled expiry date this rule applies to (inclusive); absent = still in force.
         */
        valid_to?: string;
        source?: string;
      },
      ...{
        kind: "WEEKLY" | "MONTHLY";
        weekday: "MON" | "TUE" | "WED" | "THU" | "FRI";
        /**
         * MONTHLY only: which weekday of the month.
         */
        position?: "LAST";
        /**
         * First scheduled expiry date this rule applies to (inclusive).
         */
        valid_from: string;
        /**
         * Last scheduled expiry date this rule applies to (inclusive); absent = still in force.
         */
        valid_to?: string;
        source?: string;
      }[]
    ];
    holiday_rule: "PREVIOUS_TRADING_DAY";
    /**
     * Regular trading days absent from the data (e.g. sessions removed during cleaning). Counted as trading days so they never shift an expiry.
     */
    extra_trading_days: string[];
  };
  underlying_type: "SPOT_INDEX" | "FUTURES";
  volatility: {
    source: "INDEX_FILE" | "HISTORICAL";
    /**
     * Display name, e.g. India VIX.
     */
    name: string;
    /**
     * HISTORICAL only.
     */
    historical_window_days?: number;
  };
  pricing: {
    provider: "BLACK_SCHOLES_VIX" | "BLACK_76" | "HISTORICAL_VOL";
    /**
     * Annual, continuously compounded (e.g. 0.065).
     */
    risk_free_rate: number;
    /**
     * Volatility shift for the sensitivity reruns (± this many points).
     */
    sensitivity_shift_pts: number;
  };
  /**
   * Pre-filled evaluation-settings values (product.md §7.6); always shown for confirmation, never applied silently.
   */
  default_costs: {
    verified_on: string;
    items: {
      brokerage_per_order: CostItem;
      stt_sell_pct: CostItem;
      stt_exercise_pct: CostItem;
      exchange_txn_pct: CostItem;
      sebi_per_crore: CostItem;
      stamp_buy_pct: CostItem;
      gst_pct: CostItem;
      slippage_pts: CostItem;
    };
  };
  /**
   * Default backtest periods and the overfitting split per expiry kind (product.md §7.7). Dates absent at the end mean 'last date in the data'.
   */
  periods: {
    WEEKLY: PeriodConfig;
    MONTHLY: PeriodConfig;
  };
  report: {
    /**
     * Ascending edges, e.g. [12, 18, 25] → <12, 12–18, 18–25, >25.
     *
     * @minItems 1
     * @maxItems 6
     */
    vol_band_edges:
      | [number]
      | [number, number]
      | [number, number, number]
      | [number, number, number, number]
      | [number, number, number, number, number]
      | [number, number, number, number, number, number];
    regime: {
      adx_period: number;
      trending_min: number;
      sideways_max: number;
    };
  };
  /**
   * @minItems 1
   */
  allowed_timeframes_min: [1 | 3 | 5 | 15 | 30 | 60 | 240, ...(1 | 3 | 5 | 15 | 30 | 60 | 240)[]];
  data: {
    /**
     * Path inside the engine image, relative to the data root.
     */
    underlying_file: string;
    /**
     * Required when volatility.source is INDEX_FILE.
     */
    volatility_file?: string;
    source: {
      name: string;
      url: string;
      /**
       * Plain-English provenance and licence note shown in reports.
       */
      note: string;
    };
  };
}
export interface CostItem {
  value: number;
  /**
   * Plain-English name shown to the user.
   */
  label: string;
  /**
   * Plain-English description, e.g. 'Sell side, on premium'.
   */
  applies_to: string;
  /**
   * Where the rate comes from, shown to the user.
   */
  source: string;
}
export interface PeriodConfig {
  /**
   * Earliest date this expiry kind can be backtested (e.g. weekly options launch).
   */
  available_from: string;
  in_sample: {
    from: string;
    to: string;
  };
  out_of_sample_from: string;
}

// Generated from specs/contracts by web/scripts/codegen.mjs. Do not edit by hand.
export interface paths {
    "/v1/meta": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Data range, instrument summary and pre-filled settings
         * @description Called once per tab on app load. All dates come from the loaded data, never hardcoded (product.md §9.2).
         */
        get: operations["getMeta"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/evaluate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Run one backtest (with the volatility sensitivity reruns) and return the report
         * @description One call = one strategy variant (architecture.md §3.3). Used for Evaluate Strategy, each what-if value,
         *     and each suggestion variant. The engine validates again (schema + SEM rules) before running.
         */
        post: operations["evaluate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/suggestions/plan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Propose edited copies of the strategy to evaluate
         * @description Planning only; no backtests are run here. The browser then calls /v1/evaluate once per variant
         *     (concurrency cap 4) and compares results. Selection rules (tuning on the in-sample period,
         *     judging on the out-of-sample period) are specified in features/06-suggestions.
         */
        post: operations["planSuggestions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/extract": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Read a strategy document or pasted text into rule items and questions for vague rules
         * @description The only endpoint that uses an LLM (backend.md §9). Served by the extraction function, not the engine.
         *     The file is read in memory and discarded. The response never echoes the document except short
         *     quotes per rule item. Missing mandatory inputs are not reported here: the browser finds and asks
         *     for them with the same check the builder uses (architecture.md decision A9).
         */
        post: operations["extract"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** Format: date */
        Date: string;
        Time: string;
        /** @description IST, minute precision, no offset */
        Timestamp: string;
        /** @description Amount in ₹, 2 decimals */
        Rupees: number;
        Period: {
            start: components["schemas"]["Date"];
            end: components["schemas"]["Date"];
        };
        Strategy: components["schemas"]["strategy.schema"];
        Error: {
            error: {
                /** @enum {unknown} */
                code: "BAD_REQUEST" | "PAYLOAD_TOO_LARGE" | "VALIDATION_FAILED" | "PERIOD_INVALID" | "BUSY" | "ENGINE_ERROR" | "UNSUPPORTED_FILE" | "UNREADABLE_FILE" | "EXTRACTION_FAILED" | "EXTRACTION_BUSY";
                /** @description Plain English */
                message: string;
                problems?: {
                    /** @description Semantic rule id; not shown to users */
                    rule?: string;
                    /** @description Plain-English field name, e.g. 'Stop-loss' */
                    field_label: string;
                    message: string;
                }[];
            };
        };
        MetaResponse: {
            engine_version: string;
            instruments: components["schemas"]["InstrumentSummary"][];
        };
        InstrumentSummary: {
            symbol: string;
            name: string;
            /** @description Actual first and last timestamps read from the loaded data */
            data_range: {
                first: components["schemas"]["Timestamp"];
                last: components["schemas"]["Timestamp"];
            };
            /** @example India VIX */
            volatility_name: string;
            lot_size_suggested: number;
            lot_size_note: string;
            strike_interval: number;
            allowed_timeframes_min: number[];
            intraday_squareoff: components["schemas"]["Time"];
            session: {
                first_bar: components["schemas"]["Time"];
                last_bar: components["schemas"]["Time"];
            };
            expiry_kinds: {
                /** @enum {unknown} */
                kind: "WEEKLY" | "MONTHLY";
                available_from: components["schemas"]["Date"];
                default_period: components["schemas"]["Period"];
                in_sample: components["schemas"]["Period"];
                out_of_sample_from: components["schemas"]["Date"];
            }[];
            default_costs: {
                verified_on: components["schemas"]["Date"];
                items: {
                    /** @enum {unknown} */
                    key: "brokerage_per_order" | "stt_sell_pct" | "stt_exercise_pct" | "exchange_txn_pct" | "sebi_per_crore" | "stamp_buy_pct" | "gst_pct" | "slippage_pts";
                    value: number;
                    label: string;
                    applies_to: string;
                    source: string;
                }[];
            };
            risk_free_rate: number;
            data_source: components["schemas"]["DataSource"];
            data_gaps: {
                days_without_volatility: components["schemas"]["Date"][];
                minutes_missing_underlying: number;
                minutes_missing_volatility: number;
            };
        };
        DataSource: {
            name: string;
            /** Format: uri */
            url: string;
            note: string;
            first: components["schemas"]["Date"];
            last: components["schemas"]["Date"];
        };
        /** @description Pre-filled from /v1/meta and confirmed by the user; the engine applies no defaults of its own. */
        EvaluationSettings: {
            period: components["schemas"]["Period"];
            costs: {
                brokerage_per_order: number;
                stt_sell_pct: number;
                stt_exercise_pct: number;
                exchange_txn_pct: number;
                sebi_per_crore: number;
                stamp_buy_pct: number;
                gst_pct: number;
                slippage_pts: number;
            };
            /** @description Optional. When present, % return and % drawdown are also reported. */
            capital_rupees?: number | null;
        };
        EvaluateRequest: {
            strategy: components["schemas"]["strategy.schema"];
            settings: components["schemas"]["EvaluationSettings"];
        };
        /** @description Computed only over trades in the selected period (or the stated sub-period). */
        Metrics: {
            trades: number;
            wins: number;
            losses: number;
            /** @description Wins ÷ trades × 100; null when there are no trades */
            win_rate_pct: number | null;
            net_pnl: components["schemas"]["Rupees"];
            gross_pnl: components["schemas"]["Rupees"];
            total_costs: components["schemas"]["Rupees"];
            total_slippage: components["schemas"]["Rupees"];
            avg_win: number | null;
            avg_loss: number | null;
            /** @description Average net P&L per trade */
            expectancy: number | null;
            largest_win: number | null;
            largest_loss: number | null;
            max_drawdown: components["schemas"]["Rupees"];
            /** @description Only when capital was given */
            max_drawdown_pct?: number | null;
            /** @description Only when capital was given */
            return_pct?: number | null;
            worst_losing_streak: number;
        };
        BreakdownRow: {
            key: string;
            /** @description Plain English, e.g. 'VIX 12–18', 'Trending days', 'Mar 2024' */
            label: string;
            trades: number;
            wins: number;
            win_rate_pct: number | null;
            net_pnl: components["schemas"]["Rupees"];
            expectancy: number | null;
        };
        Trade: {
            n: number;
            /** @enum {unknown} */
            side: "CE" | "PE" | "MULTI";
            legs: {
                /** @enum {unknown} */
                action: "BUY" | "SELL";
                /** @enum {unknown} */
                option_type: "CE" | "PE";
                strike: number;
                expiry: components["schemas"]["Date"];
                entry_premium: number;
                exit_premium: number;
            }[];
            signal_time?: components["schemas"]["Timestamp"];
            entry_time: components["schemas"]["Timestamp"];
            exit_time: components["schemas"]["Timestamp"];
            spot_at_entry?: number;
            /** @enum {unknown} */
            exit_reason: "STOP_LOSS" | "TARGET" | "TRAIL_TO_COST" | "TIME_EXIT" | "SQUARE_OFF" | "N_CANDLES" | "EXPIRY_SETTLEMENT";
            exit_reason_text: string;
            quantity: number;
            gross_pnl: components["schemas"]["Rupees"];
            costs: components["schemas"]["Rupees"];
            net_pnl: components["schemas"]["Rupees"];
            vol_at_entry: number;
            vol_band: string;
            /** @enum {unknown} */
            regime: "TRENDING" | "MIXED" | "SIDEWAYS" | "UNKNOWN";
            expiry_day: boolean;
        };
        Report: {
            engine_version: string;
            generated_at: components["schemas"]["Timestamp"];
            instrument: {
                symbol: string;
                name: string;
            };
            /** @description The period the user selected; every figure below covers only this period. */
            period: {
                start: components["schemas"]["Date"];
                end: components["schemas"]["Date"];
                trading_days: number;
            };
            metrics: components["schemas"]["Metrics"];
            /** @description One point per closed trade, in order */
            equity_curve: {
                t: components["schemas"]["Timestamp"];
                equity: components["schemas"]["Rupees"];
                drawdown: components["schemas"]["Rupees"];
            }[];
            breakdowns: {
                by_year: components["schemas"]["BreakdownRow"][];
                by_month: components["schemas"]["BreakdownRow"][];
                by_vol_band: components["schemas"]["BreakdownRow"][];
                by_regime: components["schemas"]["BreakdownRow"][];
                by_weekday: components["schemas"]["BreakdownRow"][];
                by_expiry_day: components["schemas"]["BreakdownRow"][];
                by_side: components["schemas"]["BreakdownRow"][];
            };
            overfit: {
                /** @enum {unknown} */
                status: "OK" | "POSSIBLY_OVERFIT" | "TOO_FEW_TRADES" | "NOT_APPLICABLE";
                /** @description Plain-English explanation */
                status_text: string;
                in_sample?: {
                    period: components["schemas"]["Period"];
                    metrics: components["schemas"]["Metrics"];
                };
                out_of_sample?: {
                    period: components["schemas"]["Period"];
                    metrics: components["schemas"]["Metrics"];
                };
            };
            /** @description Same backtest with volatility shifted down and up (e.g. −2 and +2 points) */
            sensitivity: {
                vol_shift_pts: number;
                metrics: components["schemas"]["Metrics"];
            }[];
            skipped: {
                /** @description Days skipped for missing data in the period, with reasons */
                data_days: {
                    date: components["schemas"]["Date"];
                    reason_text: string;
                }[];
                data_minutes: {
                    missing_underlying: number;
                    missing_volatility: number;
                };
                /** @description Signals that did not become trades, grouped by reason (product.md §7.2). A signal is counted once, under the first failing check in the order of this enum (feature 01, REQ-ENG-20). */
                signals: {
                    /** @enum {unknown} */
                    reason: "CONFLICTING_SIGNALS" | "POSITION_OPEN" | "OUTSIDE_ENTRY_WINDOW" | "IN_NO_ENTRY_WINDOW" | "AFTER_EXPIRY_CUTOFF" | "MAX_TRADES" | "SL_HITS_LIMIT" | "MAX_DAILY_LOSS" | "AFTER_SQUAREOFF" | "NEXT_DAY_FILL" | "NO_CONTRACT" | "EXPIRY_AFTER_DATA_END" | "UNPRICEABLE" | "EXIT_LEVELS_UNAVAILABLE";
                    reason_text: string;
                    count: number;
                }[];
            };
            settings_used: {
                /** @example 2 lots × 65 = 130 quantity per trade */
                quantity_text: string;
                holding_text: string;
                timeframe_text: string;
                expiry_text: string;
                period_text: string;
                costs: {
                    label: string;
                    value_text: string;
                    source: string;
                }[];
                risk_free_rate_pct: number;
                capital_text: string;
                /** @description Every advanced option, used or "Not used" */
                advanced: {
                    label: string;
                    used: boolean;
                    /** @description "Not used" when off */
                    value_text: string;
                }[];
                no_effect_rules: {
                    text: string;
                    trades_affected: number;
                }[];
            };
            /** @description Plain-English paragraphs built from fixed templates over computed numbers; risk first */
            summary: string[];
            /** @description Short "How this was simulated" lines (product.md §7) */
            simulation_notes: string[];
            disclosures: {
                modelled_premiums_text: string;
                volatility_limitation_text: string;
                costs_note_text: string;
            };
            data_source: components["schemas"]["DataSource"];
            trades: components["schemas"]["Trade"][];
        };
        SuggestionPlanRequest: {
            strategy: components["schemas"]["strategy.schema"];
            settings: components["schemas"]["EvaluationSettings"];
            /** @description Parts of the base report the planner uses to choose regime filters */
            base: {
                metrics: components["schemas"]["Metrics"];
                by_vol_band: components["schemas"]["BreakdownRow"][];
                by_regime: components["schemas"]["BreakdownRow"][];
                by_side: components["schemas"]["BreakdownRow"][];
            };
        };
        SuggestionPlanResponse: {
            variants: {
                id: string;
                /** @enum {unknown} */
                kind: "PARAMETER_SWEEP" | "REGIME_FILTER" | "ALTERNATIVE";
                /** @description Variants in one sweep share a group, e.g. 'Stop-loss %' */
                group?: string;
                /** @description Plain English, e.g. 'Stop-loss 25% instead of 30%' */
                change_text: string;
                /** @description Plain-English reason this variant is worth testing, from past simulated results, e.g. "Trades taken when India VIX was below 12 lost ₹85 on average (42 trades)." Never advice. */
                reason_text: string;
                strategy: components["schemas"]["strategy.schema"];
            }[];
            /** @description When no variants are planned (e.g. fewer than 30 trades in the base report), a plain-English explanation; otherwise null. */
            not_offered_text: string | null;
        };
        ExtractionResult: {
            /** @description One per rule found, vague or unsupported. Missing mandatory inputs are added in the browser (status MISSING there), not returned here. */
            items: {
                id: string;
                /** @enum {unknown} */
                status: "FOUND" | "VAGUE" | "UNSUPPORTED";
                /** @description Plain English, e.g. 'Stop-loss' */
                field_label: string;
                /** @description Plain-English statement of what was understood or what is needed */
                text: string;
                /** @description Short quote from the document, if any */
                quote?: string;
                mandatory?: boolean;
            }[];
            /** @description Partial strategy in the shape of strategy.schema.json, possibly missing required fields. Answers to questions are applied to it in the browser; it is validated in full on the review screen. */
            draft: Record<string, never>;
            /** @description Questions for VAGUE items only */
            questions: components["schemas"]["Question"][];
            /** @description True when text that is not a trading rule was ignored (e.g. an unrelated footer) */
            ignored_text_found: boolean;
        };
        Question: {
            id: string;
            item_id: string;
            /** @enum {unknown} */
            kind: "CHOICE" | "NUMBER" | "TIME" | "CONFIRM";
            /** @example SL cap: 30 or 35 points? */
            prompt: string;
            help?: string;
            /** @description CONFIRM questions only: index into `options` of the recommended reading, shown pre-selected but applied only when the user confirms (feature 04 D5). Null or absent for other kinds. */
            recommended_option_index?: number | null;
            /** @description CHOICE and CONFIRM. Each option carries the change to apply to the draft. */
            options?: {
                label: string;
                patch: components["schemas"]["JsonPatch"];
            }[];
            /** @description NUMBER only */
            number?: {
                /**
                 * @example points
                 * @example %
                 */
                unit_label: string;
                min?: number;
                max?: number;
                step?: number;
                /** @description Only for inputs with a product-defined pre-fill (lots, lot size); must still be confirmed */
                prefill?: number;
                /** @description Where the answer is written. Usually one path; several when one answer sets several places (e.g. a 'decisively above' margin applied to both EMAs on the CE side as +x and on the PE side as −x). */
                targets: {
                    /** @description JSON Pointer into the draft */
                    path: string;
                    /** @description Value written = answer × multiplier; absent means 1 */
                    multiplier?: number;
                }[];
            };
            /** @description TIME only */
            time?: {
                path: string;
            };
        };
        /** @description RFC 6902 operations applied to the draft strategy in the browser */
        JsonPatch: {
            /** @enum {unknown} */
            op: "add" | "replace" | "remove";
            path: string;
            value?: unknown;
        }[];
        /** @description Clock time HH:MM, IST. */
        "$defs-Time": string;
        /** @enum {unknown} */
        PriceField: "open" | "high" | "low" | "close";
        IndicatorId: string;
        /** @description Shifts an operand, e.g. EMA 21 + 10 points, to express thresholds such as 'closes decisively above'. */
        Offset: {
            pts: number;
        } | {
            pct: number;
        };
        /** @description Evaluated on each candle close. Groups nest (max depth 4, SEM-15). */
        Condition: components["schemas"]["AllGroup"] | components["schemas"]["AnyGroup"] | components["schemas"]["Compare"] | components["schemas"]["Cross"] | components["schemas"]["State"] | components["schemas"]["Turns"] | components["schemas"]["Slope"];
        /** @description True when every condition is true (AND). */
        AllGroup: {
            /** @constant */
            type: "all";
            conditions: components["schemas"]["Condition"][];
        };
        /** @description True when at least one condition is true (OR). Only used where the user's rule says 'or' (product.md §6.4). */
        AnyGroup: {
            /** @constant */
            type: "any";
            conditions: components["schemas"]["Condition"][];
        };
        Operand: {
            ind: components["schemas"]["IndicatorId"];
            /** @enum {unknown} */
            output: "value" | "signal" | "hist" | "upper" | "middle" | "lower" | "plus_di" | "minus_di";
            offset?: components["schemas"]["Offset"];
        } | {
            price: components["schemas"]["PriceField"];
            offset?: components["schemas"]["Offset"];
        } | {
            /** @enum {unknown} */
            vix: "open" | "close";
        } | {
            const: number;
        };
        Compare: {
            /** @constant */
            type: "compare";
            left: components["schemas"]["Operand"];
            /** @enum {unknown} */
            op: "gt" | "gte" | "lt" | "lte";
            right: components["schemas"]["Operand"];
        };
        /** @description left crosses above/below right on this candle (was on the other side, or equal, on the previous candle). */
        Cross: {
            /** @constant */
            type: "cross";
            left: components["schemas"]["Operand"];
            /** @enum {unknown} */
            direction: "above" | "below";
            right: components["schemas"]["Operand"];
        };
        /** @description A direction indicator is currently up/down (e.g. Supertrend is green), on any candle while it holds. */
        State: {
            /** @constant */
            type: "state";
            ind: components["schemas"]["IndicatorId"];
            /** @enum {unknown} */
            is: "up" | "down";
        };
        /** @description A direction indicator flips to up/down on this candle only (e.g. Supertrend turns green). */
        Turns: {
            /** @constant */
            type: "turns";
            ind: components["schemas"]["IndicatorId"];
            /** @enum {unknown} */
            to: "up" | "down";
        };
        /** @description Operand is higher (up) / lower (down) now than lookback candles ago. */
        Slope: {
            /** @constant */
            type: "slope";
            operand: components["schemas"]["Operand"];
            /** @enum {unknown} */
            direction: "up" | "down";
            lookback: number;
        };
        StrikeSelection: {
            /** @constant */
            method: "MONEYNESS";
            /** @enum {unknown} */
            moneyness: "ATM" | "ITM" | "OTM";
            distance_pts: number;
        } | {
            /** @constant */
            method: "DELTA";
            target_delta: number;
        } | {
            /** @constant */
            method: "PREMIUM";
            target_premium: number;
        };
        TimeWindow: {
            from: components["schemas"]["$defs-Time"];
            to: components["schemas"]["$defs-Time"];
        };
        Indicator: {
            /** @enum {unknown} */
            type: "EMA" | "SMA";
            period: number;
            source: components["schemas"]["PriceField"];
        } | {
            /** @enum {unknown} */
            type: "RSI" | "ADX";
            period: number;
        } | {
            /** @constant */
            type: "SUPERTREND";
            period: number;
            multiplier: number;
        } | {
            /** @constant */
            type: "MACD";
            fast: number;
            slow: number;
            signal: number;
        } | {
            /** @constant */
            type: "BBANDS";
            period: number;
            stddev: number;
            source: components["schemas"]["PriceField"];
        };
        Leg: {
            /**
             * @description Mandatory input 2.
             * @enum {unknown}
             */
            action: "BUY" | "SELL";
            /**
             * @description Mandatory input 3. SIGNAL = CE when the CE entry condition is met, PE when the PE entry condition is met (option type 'both').
             * @enum {unknown}
             */
            option_type: "CE" | "PE" | "SIGNAL";
            /**
             * @description Mandatory input 6.
             * @enum {unknown}
             */
            expiry: "CURRENT_WEEKLY" | "NEXT_WEEKLY" | "MONTHLY";
            strike: components["schemas"]["StrikeSelection"];
        };
        /** @description Mandatory input 11. An entry happens only when the entire strategy is satisfied (product.md §7.2). Triggers present together must all hold (at_time AND the side's conditions). */
        Entry: {
            /** @description Fixed entry time; with conditions it is an additional requirement. */
            at_time?: components["schemas"]["$defs-Time"];
            /** @description Conditions that open CE (and SIGNAL-as-CE) legs. */
            ce?: components["schemas"]["Condition"];
            /** @description Conditions that open PE (and SIGNAL-as-PE) legs. */
            pe?: components["schemas"]["Condition"];
            /** @description Conditions that open all legs together (multi-leg, non-directional). */
            all_legs?: components["schemas"]["Condition"];
        };
        /** @description Mandatory inputs 12 and 13. INTRADAY: the square-off time is the time exit. POSITIONAL: needs target, time_exit, hold_to_expiry or advanced.exit_after_candles, chosen by the user (SEM-07). A position still open on its expiry day is settled at intrinsic value. For multi-leg strategies, stop_loss and target apply to the combined position. */
        Exit: {
            stop_loss: {
                /** @constant */
                type: "PCT_PREMIUM";
                value: number;
            } | {
                /** @constant */
                type: "POINTS";
                value: number;
            } | {
                /** @constant */
                type: "TRIGGER_CANDLE";
            };
            target?: {
                /** @enum {unknown} */
                type: "PCT_PREMIUM" | "POINTS";
                value: number;
            } | {
                /** @constant */
                type: "RR";
                value: number;
            };
            time_exit?: {
                at: components["schemas"]["$defs-Time"];
                /** @enum {unknown} */
                on: "ENTRY_DAY" | "EXPIRY_DAY";
            };
            /**
             * @description Positional only, chosen by the user: hold until expiry and settle at intrinsic value. Only the value true is meaningful; absence means not chosen.
             * @constant
             */
            hold_to_expiry?: true;
        };
        /** @description Every property is OFF when absent. No property has a default (constitution §3). */
        Advanced: {
            /** @description Maximum stop distance in premium points. */
            sl_cap_pts?: number;
            /** @description Move stop to entry price once profit reaches this multiple of the initial risk. */
            trail_to_cost_at_r?: number;
            /** @description Exit if neither stop nor target is hit within N candles after entry. */
            exit_after_candles?: number;
            /** @description Position size per VIX band, as % of the set lots. Bands must cover all VIX values without gaps or overlaps (SEM-12). Result rounded down, minimum 1 lot. */
            vix_sizing?: {
                /**
                 * @description DAY_OPEN = the day's first VIX value (09:15; used for 'pre-market' rules). ENTRY = VIX at the entry minute.
                 * @enum {unknown}
                 */
                measured_at: "DAY_OPEN" | "ENTRY";
                bands: {
                    /** @description Inclusive lower edge; absent = no lower edge. */
                    vix_from?: number;
                    /** @description Exclusive upper edge; absent = no upper edge. */
                    vix_to?: number;
                    size_pct: number;
                }[];
            };
            /** @description New entries only inside these windows. */
            entry_windows?: components["schemas"]["TimeWindow"][];
            /** @description No new entries inside these windows. */
            no_entry_windows?: components["schemas"]["TimeWindow"][];
            /** @description No new entries at or after this time on the traded contract's expiry day. */
            expiry_day_cutoff?: components["schemas"]["$defs-Time"];
            daily?: {
                max_trades?: number;
                stop_after_sl_hits?: number;
                max_daily_loss_rupees?: number;
            };
        };
        /**
         * Strategy
         * @description Internal strategy format. Never shown to users (constitution §4). Structural rules live here; rules JSON Schema cannot express are in strategy-rules.md (SEM-xx) and are enforced identically by the web app and the engine. Mandatory inputs (product.md §6.1) are the required top-level fields. Every advanced option (product.md §6.2) is OFF when absent and has no default.
         * @example {
         *       "schema_version": "1.0",
         *       "name": "Simple Trend Follower",
         *       "origin": "TEMPLATE",
         *       "template_id": "simple-trend-follower",
         *       "underlying": "NIFTY50",
         *       "timeframe_min": 15,
         *       "holding": "INTRADAY",
         *       "position": {
         *         "lots": 1,
         *         "lot_size": 65
         *       },
         *       "indicators": {
         *         "ema9": {
         *           "type": "EMA",
         *           "period": 9,
         *           "source": "close"
         *         },
         *         "ema21": {
         *           "type": "EMA",
         *           "period": 21,
         *           "source": "close"
         *         }
         *       },
         *       "legs": [
         *         {
         *           "action": "BUY",
         *           "option_type": "SIGNAL",
         *           "expiry": "CURRENT_WEEKLY",
         *           "strike": {
         *             "method": "MONEYNESS",
         *             "moneyness": "ATM",
         *             "distance_pts": 0
         *           }
         *         }
         *       ],
         *       "entry": {
         *         "ce": {
         *           "type": "cross",
         *           "left": {
         *             "ind": "ema9",
         *             "output": "value"
         *           },
         *           "direction": "above",
         *           "right": {
         *             "ind": "ema21",
         *             "output": "value"
         *           }
         *         },
         *         "pe": {
         *           "type": "cross",
         *           "left": {
         *             "ind": "ema9",
         *             "output": "value"
         *           },
         *           "direction": "below",
         *           "right": {
         *             "ind": "ema21",
         *             "output": "value"
         *           }
         *         }
         *       },
         *       "exit": {
         *         "stop_loss": {
         *           "type": "PCT_PREMIUM",
         *           "value": 30
         *         },
         *         "target": {
         *           "type": "PCT_PREMIUM",
         *           "value": 50
         *         }
         *       },
         *       "advanced": {
         *         "entry_windows": [
         *           {
         *             "from": "09:30",
         *             "to": "14:30"
         *           }
         *         ],
         *         "daily": {
         *           "max_trades": 2
         *         }
         *       }
         *     }
         * @example {
         *       "schema_version": "1.0",
         *       "name": "Nifty 15-min weekly option buying (sample, with example answers to its vague rules)",
         *       "origin": "UPLOAD",
         *       "underlying": "NIFTY50",
         *       "timeframe_min": 15,
         *       "holding": "INTRADAY",
         *       "position": {
         *         "lots": 2,
         *         "lot_size": 65
         *       },
         *       "indicators": {
         *         "st": {
         *           "type": "SUPERTREND",
         *           "period": 10,
         *           "multiplier": 2
         *         },
         *         "ema9": {
         *           "type": "EMA",
         *           "period": 9,
         *           "source": "close"
         *         },
         *         "ema21": {
         *           "type": "EMA",
         *           "period": 21,
         *           "source": "close"
         *         },
         *         "rsi14": {
         *           "type": "RSI",
         *           "period": 14
         *         },
         *         "adx14": {
         *           "type": "ADX",
         *           "period": 14
         *         }
         *       },
         *       "legs": [
         *         {
         *           "action": "BUY",
         *           "option_type": "SIGNAL",
         *           "expiry": "CURRENT_WEEKLY",
         *           "strike": {
         *             "method": "MONEYNESS",
         *             "moneyness": "ITM",
         *             "distance_pts": 100
         *           }
         *         }
         *       ],
         *       "entry": {
         *         "ce": {
         *           "type": "all",
         *           "conditions": [
         *             {
         *               "type": "turns",
         *               "ind": "st",
         *               "to": "up"
         *             },
         *             {
         *               "type": "compare",
         *               "left": {
         *                 "ind": "ema9",
         *                 "output": "value"
         *               },
         *               "op": "gt",
         *               "right": {
         *                 "ind": "ema21",
         *                 "output": "value"
         *               }
         *             },
         *             {
         *               "type": "compare",
         *               "left": {
         *                 "price": "close"
         *               },
         *               "op": "gt",
         *               "right": {
         *                 "ind": "ema9",
         *                 "output": "value",
         *                 "offset": {
         *                   "pts": 10
         *                 }
         *               }
         *             },
         *             {
         *               "type": "compare",
         *               "left": {
         *                 "price": "close"
         *               },
         *               "op": "gt",
         *               "right": {
         *                 "ind": "ema21",
         *                 "output": "value",
         *                 "offset": {
         *                   "pts": 10
         *                 }
         *               }
         *             },
         *             {
         *               "type": "compare",
         *               "left": {
         *                 "ind": "rsi14",
         *                 "output": "value"
         *               },
         *               "op": "gt",
         *               "right": {
         *                 "const": 55
         *               }
         *             },
         *             {
         *               "type": "any",
         *               "conditions": [
         *                 {
         *                   "type": "all",
         *                   "conditions": [
         *                     {
         *                       "type": "compare",
         *                       "left": {
         *                         "ind": "adx14",
         *                         "output": "value"
         *                       },
         *                       "op": "gt",
         *                       "right": {
         *                         "const": 20
         *                       }
         *                     },
         *                     {
         *                       "type": "slope",
         *                       "operand": {
         *                         "ind": "adx14",
         *                         "output": "value"
         *                       },
         *                       "direction": "up",
         *                       "lookback": 1
         *                     }
         *                   ]
         *                 },
         *                 {
         *                   "type": "compare",
         *                   "left": {
         *                     "ind": "adx14",
         *                     "output": "value"
         *                   },
         *                   "op": "gt",
         *                   "right": {
         *                     "const": 30
         *                   }
         *                 }
         *               ]
         *             }
         *           ]
         *         },
         *         "pe": {
         *           "type": "all",
         *           "conditions": [
         *             {
         *               "type": "turns",
         *               "ind": "st",
         *               "to": "down"
         *             },
         *             {
         *               "type": "compare",
         *               "left": {
         *                 "ind": "ema9",
         *                 "output": "value"
         *               },
         *               "op": "lt",
         *               "right": {
         *                 "ind": "ema21",
         *                 "output": "value"
         *               }
         *             },
         *             {
         *               "type": "compare",
         *               "left": {
         *                 "price": "close"
         *               },
         *               "op": "lt",
         *               "right": {
         *                 "ind": "ema9",
         *                 "output": "value",
         *                 "offset": {
         *                   "pts": -10
         *                 }
         *               }
         *             },
         *             {
         *               "type": "compare",
         *               "left": {
         *                 "price": "close"
         *               },
         *               "op": "lt",
         *               "right": {
         *                 "ind": "ema21",
         *                 "output": "value",
         *                 "offset": {
         *                   "pts": -10
         *                 }
         *               }
         *             },
         *             {
         *               "type": "compare",
         *               "left": {
         *                 "ind": "rsi14",
         *                 "output": "value"
         *               },
         *               "op": "lt",
         *               "right": {
         *                 "const": 45
         *               }
         *             },
         *             {
         *               "type": "any",
         *               "conditions": [
         *                 {
         *                   "type": "all",
         *                   "conditions": [
         *                     {
         *                       "type": "compare",
         *                       "left": {
         *                         "ind": "adx14",
         *                         "output": "value"
         *                       },
         *                       "op": "gt",
         *                       "right": {
         *                         "const": 20
         *                       }
         *                     },
         *                     {
         *                       "type": "slope",
         *                       "operand": {
         *                         "ind": "adx14",
         *                         "output": "value"
         *                       },
         *                       "direction": "up",
         *                       "lookback": 1
         *                     }
         *                   ]
         *                 },
         *                 {
         *                   "type": "compare",
         *                   "left": {
         *                     "ind": "adx14",
         *                     "output": "value"
         *                   },
         *                   "op": "gt",
         *                   "right": {
         *                     "const": 30
         *                   }
         *                 }
         *               ]
         *             }
         *           ]
         *         }
         *       },
         *       "exit": {
         *         "stop_loss": {
         *           "type": "TRIGGER_CANDLE"
         *         },
         *         "target": {
         *           "type": "RR",
         *           "value": 1.5
         *         }
         *       },
         *       "advanced": {
         *         "sl_cap_pts": 30,
         *         "trail_to_cost_at_r": 1,
         *         "exit_after_candles": 4,
         *         "vix_sizing": {
         *           "measured_at": "DAY_OPEN",
         *           "bands": [
         *             {
         *               "vix_to": 12,
         *               "size_pct": 50
         *             },
         *             {
         *               "vix_from": 12,
         *               "vix_to": 18,
         *               "size_pct": 100
         *             },
         *             {
         *               "vix_from": 18,
         *               "size_pct": 50
         *             }
         *           ]
         *         },
         *         "no_entry_windows": [
         *           {
         *             "from": "11:00",
         *             "to": "13:30"
         *           }
         *         ],
         *         "expiry_day_cutoff": "12:00",
         *         "daily": {
         *           "max_trades": 2,
         *           "stop_after_sl_hits": 2
         *         }
         *       }
         *     }
         * @example {
         *       "schema_version": "1.0",
         *       "name": "Simple short straddle",
         *       "origin": "TEMPLATE",
         *       "template_id": "simple-short-straddle",
         *       "underlying": "NIFTY50",
         *       "timeframe_min": 5,
         *       "holding": "INTRADAY",
         *       "position": {
         *         "lots": 1,
         *         "lot_size": 65
         *       },
         *       "indicators": {},
         *       "legs": [
         *         {
         *           "action": "SELL",
         *           "option_type": "CE",
         *           "expiry": "CURRENT_WEEKLY",
         *           "strike": {
         *             "method": "MONEYNESS",
         *             "moneyness": "ATM",
         *             "distance_pts": 0
         *           }
         *         },
         *         {
         *           "action": "SELL",
         *           "option_type": "PE",
         *           "expiry": "CURRENT_WEEKLY",
         *           "strike": {
         *             "method": "MONEYNESS",
         *             "moneyness": "ATM",
         *             "distance_pts": 0
         *           }
         *         }
         *       ],
         *       "entry": {
         *         "at_time": "09:20"
         *       },
         *       "exit": {
         *         "stop_loss": {
         *           "type": "PCT_PREMIUM",
         *           "value": 30
         *         }
         *       }
         *     }
         */
        "strategy.schema": {
            /** @constant */
            schema_version: "1.0";
            name?: string;
            /**
             * @description Which entry path produced this strategy. Informational only; does not change evaluation.
             * @enum {unknown}
             */
            origin?: "TEMPLATE" | "BUILDER" | "UPLOAD";
            template_id?: string;
            /** @description Instrument symbol from the instrument registry (mandatory input 1). */
            underlying: string;
            /**
             * @description Candle timeframe in minutes (mandatory input 7). Also limited by the instrument profile's allowed_timeframes_min.
             * @enum {unknown}
             */
            timeframe_min: 1 | 3 | 5 | 15 | 30 | 60 | 240;
            /**
             * @description Mandatory input 8. INTRADAY positions are squared off at the profile's intraday_squareoff time.
             * @enum {unknown}
             */
            holding: "INTRADAY" | "POSITIONAL";
            /** @description Mandatory inputs 9 and 10. Applied uniformly to every trade in the backtest. */
            position: {
                lots: number;
                lot_size: number;
            };
            /** @description Indicator instances referenced by conditions, keyed by an id such as ema9. May be empty for fixed-time strategies. */
            indicators: {
                [key: string]: components["schemas"]["Indicator"];
            };
            /** @description Mandatory inputs 2–6 (action, option type, moneyness, distance, expiry). More than one leg is an advanced option. */
            legs: components["schemas"]["Leg"][];
            entry: components["schemas"]["Entry"];
            exit: components["schemas"]["Exit"];
            advanced?: components["schemas"]["Advanced"];
            $defs: {
                /** @description Clock time HH:MM, IST. */
                Time: string;
                TimeWindow: {
                    from: components["schemas"]["$defs-Time"];
                    to: components["schemas"]["$defs-Time"];
                };
                IndicatorId: string;
                /** @enum {unknown} */
                PriceField: "open" | "high" | "low" | "close";
                Indicator: {
                    /** @enum {unknown} */
                    type: "EMA" | "SMA";
                    period: number;
                    source: components["schemas"]["PriceField"];
                } | {
                    /** @enum {unknown} */
                    type: "RSI" | "ADX";
                    period: number;
                } | {
                    /** @constant */
                    type: "SUPERTREND";
                    period: number;
                    multiplier: number;
                } | {
                    /** @constant */
                    type: "MACD";
                    fast: number;
                    slow: number;
                    signal: number;
                } | {
                    /** @constant */
                    type: "BBANDS";
                    period: number;
                    stddev: number;
                    source: components["schemas"]["PriceField"];
                };
                /** @description Shifts an operand, e.g. EMA 21 + 10 points, to express thresholds such as 'closes decisively above'. */
                Offset: {
                    pts: number;
                } | {
                    pct: number;
                };
                Operand: {
                    ind: components["schemas"]["IndicatorId"];
                    /** @enum {unknown} */
                    output: "value" | "signal" | "hist" | "upper" | "middle" | "lower" | "plus_di" | "minus_di";
                    offset?: components["schemas"]["Offset"];
                } | {
                    price: components["schemas"]["PriceField"];
                    offset?: components["schemas"]["Offset"];
                } | {
                    /** @enum {unknown} */
                    vix: "open" | "close";
                } | {
                    const: number;
                };
                /** @description Evaluated on each candle close. Groups nest (max depth 4, SEM-15). */
                Condition: components["schemas"]["AllGroup"] | components["schemas"]["AnyGroup"] | components["schemas"]["Compare"] | components["schemas"]["Cross"] | components["schemas"]["State"] | components["schemas"]["Turns"] | components["schemas"]["Slope"];
                /** @description True when every condition is true (AND). */
                AllGroup: {
                    /** @constant */
                    type: "all";
                    conditions: components["schemas"]["Condition"][];
                };
                /** @description True when at least one condition is true (OR). Only used where the user's rule says 'or' (product.md §6.4). */
                AnyGroup: {
                    /** @constant */
                    type: "any";
                    conditions: components["schemas"]["Condition"][];
                };
                Compare: {
                    /** @constant */
                    type: "compare";
                    left: components["schemas"]["Operand"];
                    /** @enum {unknown} */
                    op: "gt" | "gte" | "lt" | "lte";
                    right: components["schemas"]["Operand"];
                };
                /** @description left crosses above/below right on this candle (was on the other side, or equal, on the previous candle). */
                Cross: {
                    /** @constant */
                    type: "cross";
                    left: components["schemas"]["Operand"];
                    /** @enum {unknown} */
                    direction: "above" | "below";
                    right: components["schemas"]["Operand"];
                };
                /** @description A direction indicator is currently up/down (e.g. Supertrend is green), on any candle while it holds. */
                State: {
                    /** @constant */
                    type: "state";
                    ind: components["schemas"]["IndicatorId"];
                    /** @enum {unknown} */
                    is: "up" | "down";
                };
                /** @description A direction indicator flips to up/down on this candle only (e.g. Supertrend turns green). */
                Turns: {
                    /** @constant */
                    type: "turns";
                    ind: components["schemas"]["IndicatorId"];
                    /** @enum {unknown} */
                    to: "up" | "down";
                };
                /** @description Operand is higher (up) / lower (down) now than lookback candles ago. */
                Slope: {
                    /** @constant */
                    type: "slope";
                    operand: components["schemas"]["Operand"];
                    /** @enum {unknown} */
                    direction: "up" | "down";
                    lookback: number;
                };
                Leg: {
                    /**
                     * @description Mandatory input 2.
                     * @enum {unknown}
                     */
                    action: "BUY" | "SELL";
                    /**
                     * @description Mandatory input 3. SIGNAL = CE when the CE entry condition is met, PE when the PE entry condition is met (option type 'both').
                     * @enum {unknown}
                     */
                    option_type: "CE" | "PE" | "SIGNAL";
                    /**
                     * @description Mandatory input 6.
                     * @enum {unknown}
                     */
                    expiry: "CURRENT_WEEKLY" | "NEXT_WEEKLY" | "MONTHLY";
                    strike: components["schemas"]["StrikeSelection"];
                };
                StrikeSelection: {
                    /** @constant */
                    method: "MONEYNESS";
                    /** @enum {unknown} */
                    moneyness: "ATM" | "ITM" | "OTM";
                    distance_pts: number;
                } | {
                    /** @constant */
                    method: "DELTA";
                    target_delta: number;
                } | {
                    /** @constant */
                    method: "PREMIUM";
                    target_premium: number;
                };
                /** @description Mandatory input 11. An entry happens only when the entire strategy is satisfied (product.md §7.2). Triggers present together must all hold (at_time AND the side's conditions). */
                Entry: {
                    /** @description Fixed entry time; with conditions it is an additional requirement. */
                    at_time?: components["schemas"]["$defs-Time"];
                    /** @description Conditions that open CE (and SIGNAL-as-CE) legs. */
                    ce?: components["schemas"]["Condition"];
                    /** @description Conditions that open PE (and SIGNAL-as-PE) legs. */
                    pe?: components["schemas"]["Condition"];
                    /** @description Conditions that open all legs together (multi-leg, non-directional). */
                    all_legs?: components["schemas"]["Condition"];
                };
                /** @description Mandatory inputs 12 and 13. INTRADAY: the square-off time is the time exit. POSITIONAL: needs target, time_exit, hold_to_expiry or advanced.exit_after_candles, chosen by the user (SEM-07). A position still open on its expiry day is settled at intrinsic value. For multi-leg strategies, stop_loss and target apply to the combined position. */
                Exit: {
                    stop_loss: {
                        /** @constant */
                        type: "PCT_PREMIUM";
                        value: number;
                    } | {
                        /** @constant */
                        type: "POINTS";
                        value: number;
                    } | {
                        /** @constant */
                        type: "TRIGGER_CANDLE";
                    };
                    target?: {
                        /** @enum {unknown} */
                        type: "PCT_PREMIUM" | "POINTS";
                        value: number;
                    } | {
                        /** @constant */
                        type: "RR";
                        value: number;
                    };
                    time_exit?: {
                        at: components["schemas"]["$defs-Time"];
                        /** @enum {unknown} */
                        on: "ENTRY_DAY" | "EXPIRY_DAY";
                    };
                    /**
                     * @description Positional only, chosen by the user: hold until expiry and settle at intrinsic value. Only the value true is meaningful; absence means not chosen.
                     * @constant
                     */
                    hold_to_expiry?: true;
                };
                /** @description Every property is OFF when absent. No property has a default (constitution §3). */
                Advanced: {
                    /** @description Maximum stop distance in premium points. */
                    sl_cap_pts?: number;
                    /** @description Move stop to entry price once profit reaches this multiple of the initial risk. */
                    trail_to_cost_at_r?: number;
                    /** @description Exit if neither stop nor target is hit within N candles after entry. */
                    exit_after_candles?: number;
                    /** @description Position size per VIX band, as % of the set lots. Bands must cover all VIX values without gaps or overlaps (SEM-12). Result rounded down, minimum 1 lot. */
                    vix_sizing?: {
                        /**
                         * @description DAY_OPEN = the day's first VIX value (09:15; used for 'pre-market' rules). ENTRY = VIX at the entry minute.
                         * @enum {unknown}
                         */
                        measured_at: "DAY_OPEN" | "ENTRY";
                        bands: {
                            /** @description Inclusive lower edge; absent = no lower edge. */
                            vix_from?: number;
                            /** @description Exclusive upper edge; absent = no upper edge. */
                            vix_to?: number;
                            size_pct: number;
                        }[];
                    };
                    /** @description New entries only inside these windows. */
                    entry_windows?: components["schemas"]["TimeWindow"][];
                    /** @description No new entries inside these windows. */
                    no_entry_windows?: components["schemas"]["TimeWindow"][];
                    /** @description No new entries at or after this time on the traded contract's expiry day. */
                    expiry_day_cutoff?: components["schemas"]["$defs-Time"];
                    daily?: {
                        max_trades?: number;
                        stop_after_sl_hits?: number;
                        max_daily_loss_rupees?: number;
                    };
                };
            };
        };
    };
    responses: {
        /** @description Malformed request (BAD_REQUEST) */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Request too large (PAYLOAD_TOO_LARGE) */
        PayloadTooLarge: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Strategy or settings invalid (VALIDATION_FAILED, PERIOD_INVALID) */
        ValidationFailed: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Throttled or overloaded (BUSY); retry with backoff */
        Busy: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Unexpected failure (ENGINE_ERROR) */
        EngineError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getMeta: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Metadata */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MetaResponse"];
                };
            };
            500: components["responses"]["EngineError"];
            503: components["responses"]["Busy"];
        };
    };
    evaluate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EvaluateRequest"];
            };
        };
        responses: {
            /** @description Report */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Report"];
                };
            };
            400: components["responses"]["BadRequest"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            429: components["responses"]["Busy"];
            500: components["responses"]["EngineError"];
            503: components["responses"]["Busy"];
        };
    };
    planSuggestions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SuggestionPlanRequest"];
            };
        };
        responses: {
            /** @description Variants to evaluate */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuggestionPlanResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            422: components["responses"]["ValidationFailed"];
            429: components["responses"]["Busy"];
            500: components["responses"]["EngineError"];
            503: components["responses"]["Busy"];
        };
    };
    extract: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description .pdf, .docx or .txt, at most 4 MB
                     */
                    file: string;
                };
                "application/json": {
                    text: string;
                };
            };
        };
        responses: {
            /** @description Extraction result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExtractionResult"];
                };
            };
            400: components["responses"]["BadRequest"];
            413: components["responses"]["PayloadTooLarge"];
            /** @description File type not supported (UNSUPPORTED_FILE) */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description No readable text (UNREADABLE_FILE) or the strategy could not be read (EXTRACTION_FAILED) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description The AI service is busy (EXTRACTION_BUSY) */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
}

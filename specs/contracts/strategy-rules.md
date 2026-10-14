# Strategy semantic rules (SEM-xx)

Status: **Approved 2026-10-14** · Created 2026-10-14 · Part of the contracts

[`strategy.schema.json`](strategy.schema.json) defines the shape of a strategy. These rules cover what JSON Schema cannot express. The web app (`strategyRules.ts`) and the engine (`validation/semantic.py`) implement **every rule identically**, proven by shared fixtures in `contracts/fixtures/strategies/` (each invalid fixture names the rule it breaks; both test suites must agree on every fixture).

Each rule has a plain-English message shown to the user (constitution §4) and a field label (never a path). `{…}` values are filled in from the instrument profile or the data.

Context needed: the strategy, the instrument profile for `underlying`, and (for SEM-13/14) the evaluation settings and the data range from `/v1/meta`.

| ID | Rule | Field label | Message |
|---|---|---|---|
| SEM-01 | `underlying` is a registered instrument | Instrument | "This instrument isn't available in Nikasha yet." |
| SEM-02 | `timeframe_min` is in the profile's `allowed_timeframes_min` | Candle timeframe | "Choose one of these candle timeframes: {list}." |
| SEM-03 | Every indicator id used in a condition is defined in `indicators`, and the requested output exists for that indicator type (EMA/SMA/RSI: value · ADX: value, plus_di, minus_di · SUPERTREND: value · MACD: value, signal, hist · BBANDS: upper, middle, lower) | Entry conditions | "A condition uses an indicator that hasn't been set up: {indicator}." |
| SEM-04 | `state` and `turns` conditions refer only to SUPERTREND indicators | Entry conditions | "'Turns green/red' only works with Supertrend." |
| SEM-05 | MACD `fast` < `slow` | Indicator settings | "MACD fast period must be shorter than the slow period." |
| SEM-06 | Strike by moneyness: ATM → `distance_pts` = 0; ITM/OTM → `distance_pts` > 0 and a multiple of the profile's `strike_interval` | Strike | "For ITM or OTM, enter a distance in steps of {strike_interval} points (e.g. 100)." |
| SEM-07 | Exit rule completeness: **INTRADAY** — always satisfied (the {intraday_squareoff} square-off is the time exit). **POSITIONAL** — at least one of `exit.target`, `exit.time_exit`, `exit.hold_to_expiry`, `advanced.exit_after_candles`; otherwise the user is asked (product.md §6.1, input 13). (Briefly retired and reinstated on 2026-10-14.) | Exit rule | "Choose what should happen to an open positional trade: hold until expiry, exit at a set time on expiry day, set a target, or exit after a number of candles." |
| SEM-08 | INTRADAY: `hold_to_expiry` absent; `time_exit.on` = ENTRY_DAY; `time_exit.at` earlier than {intraday_squareoff} | Exit rule | "Intraday positions close by {intraday_squareoff}, so this exit can't apply." |
| SEM-09 | All times (`at_time`, windows, cutoff, `time_exit.at`) fall inside the session ({first_bar}–{last_bar}); each window has `from` < `to`; INTRADAY `at_time` < {intraday_squareoff} | Times | "Times must be within market hours ({first_bar}–{last_bar}), and a window must start before it ends." |
| SEM-10 | Entry triggers match legs: a `SIGNAL` leg needs `entry.ce` and/or `entry.pe` and must be the only leg; a fixed `CE` leg needs `entry.ce`, `entry.all_legs` or `entry.at_time`; a fixed `PE` leg needs `entry.pe`, `entry.all_legs` or `entry.at_time`; `entry.ce` is only allowed when some leg can be a CE (CE or SIGNAL), likewise `entry.pe` | Entry trigger | "The entry rule doesn't match the options you chose to trade." |
| SEM-11 | Multi-leg (more than one leg): no `SIGNAL` legs; entry via `entry.all_legs` and/or `entry.at_time`; all legs share the same `expiry`; stop-loss is not `TRIGGER_CANDLE` (stop-loss and target apply to the combined position) | Legs | "Multi-leg strategies open all legs together on the same expiry, with one combined stop-loss." |
| SEM-12 | `vix_sizing.bands` cover every VIX value exactly once: sorted by edge, first band has no `vix_from` (or 0), last has no `vix_to`, each `vix_to` equals the next band's `vix_from` | Volatility sizing | "Volatility sizing must say what to do for every VIX level, with no gaps or overlaps." |
| SEM-13 | Expiry exists in the period: `CURRENT_WEEKLY` / `NEXT_WEEKLY` need a period starting on or after the profile's `periods.WEEKLY.available_from` ({date}) | Expiry | "Weekly options only exist from {date}. Choose a later start date or monthly expiry." |
| SEM-14 | Period inside the data: `settings.period.start` ≥ first data date, `end` ≤ last data date, `start` < `end` | Backtest period | "Choose dates between {first} and {last}." |
| SEM-15 | Condition depth ≤ 4 nested groups; total conditions per side ≤ 30 | Entry conditions | "This entry rule is too complex. Please simplify it." |
| SEM-16 | `TRIGGER_CANDLE` stop-loss needs a condition-based entry (`entry.ce`, `entry.pe` or `entry.all_legs`), not a fixed time alone | Stop-loss | "'Trigger candle' stop-loss needs an entry signal candle; a fixed-time entry has none." |
| SEM-17 | `hold_to_expiry` and `time_exit.on = EXPIRY_DAY` only with POSITIONAL | Exit rule | "This exit only applies to positional strategies." |
| SEM-18 | `expiry_day_cutoff` and `entry_windows`/`no_entry_windows` leave at least one minute where an entry is possible | Entry timing | "Your time windows leave no time to enter a trade." |
| SEM-19 | Strike by DELTA or PREMIUM is allowed on any leg; ATM/ITM/OTM fields must then be absent (enforced by schema `oneOf`) — listed here so both sides show the same message | Strike | "Choose one way to pick the strike." |
| SEM-20 | `position.lots × position.lot_size` ≤ 100,000 quantity | Position size | "That position size is too large to simulate." |

## Notes

- **Missing mandatory inputs are not SEM rules.** They are reported by the shared completeness module (feature 03) as named missing inputs, e.g. "Stop-loss", so the Evaluate button can say what is still needed (product.md §6.5). SEM rules apply to inputs that are present but inconsistent.
- **Vague values never reach this stage.** Upload questions must be answered first (feature 04).
- New rules get the next free ID; IDs are never reused (product.md §14).

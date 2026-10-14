# Feature 01 — Data and Engine: Requirements

Status: **Approved 2026-10-14** · Created 2026-10-14 · Prefixes: **REQ-DAT** (data, instruments, calendar) and **REQ-ENG** (simulation) · Priority: **P0** · Layer: **backend only**

Implements [`product.md`](../../product.md) §7 (simulation rules), §8 (instruments) and §9 (data), within [`backend.md`](../../backend.md) §2–§5 and §8, and obeys [`constitution.md`](../../constitution.md) §2, §3, §7 and §10, and feature 07 (logging, no storage).

**Boundary with feature 02:** this feature produces the **simulated trades, skipped-signal counts, data-gap inventory and the `/v1/meta` response**. Turning trades into metrics, breakdowns, the overfitting check, sensitivity tables and summary text is feature 02 (REQ-RPT), although that code also runs in the engine.

EARS patterns as in feature 07. "The engine" means the engine Lambda function and its local HTTP adapter.

---

## 1. User stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-DAT-1 | trader | results computed only from real market data, with gaps skipped, not filled | I can trust nothing was invented |
| US-DAT-2 | trader | the correct expiry for every trade, including holiday shifts and the 2025 weekday change | option prices and expiry-day behaviour are realistic |
| US-ENG-1 | trader | my rules simulated exactly as written, with every assumption stated | the backtest matches my strategy, not someone else's guess |
| US-ENG-2 | trader | option premiums modelled consistently from Nifty and India VIX | results are comparable between strategies |
| US-ENG-3 | trader | realistic costs and slippage applied to every trade | results aren't flattered |
| US-ENG-4 | project owner | to add a new instrument by supplying data and a profile only | Nikasha grows to Bank Nifty, Sensex and MCX without rewriting the engine |

## 2. Requirements — data and instruments (REQ-DAT)

### 2.1 Instrument registry

| ID | Requirement |
|---|---|
| REQ-DAT-01 | THE engine SHALL load every instrument profile from `instruments/*.json` at start-up and validate it against `contracts/instrument.schema.json`. |
| REQ-DAT-02 | IF a profile fails validation, THEN THE engine SHALL refuse to serve requests (fail fast) and log a technical error code only. |
| REQ-DAT-03 | THE engine SHALL take every instrument-specific value — session times, square-off time, strike interval, tick size, lot-size pre-fill, expiry rules and extra trading days, volatility source, pricing provider and parameters, default costs, periods, report bands, allowed timeframes, data files — from the profile, and SHALL contain no instrument-specific constant in engine code. |
| REQ-DAT-04 | WHEN a second profile and data file are added (test profile `TESTIDX` with a different session, strike interval, expiry weekday and costs), THE engine SHALL validate and backtest strategies on it with no engine code change. |

### 2.2 Data loading and checks

| ID | Requirement |
|---|---|
| REQ-DAT-05 | THE build SHALL convert `data/*.csv` to Parquet with a script kept in the repo, and the engine SHALL read only the Parquet files named in the profile. |
| REQ-DAT-06 | WHEN data is loaded, THE engine SHALL check: required columns (`datetime, open, high, low, close`); timestamps sorted and unique; every bar inside the profile's session (`first_bar`–`last_bar`); `low ≤ open, close ≤ high`; all prices > 0. |
| REQ-DAT-07 | IF any check fails for rows of a day, THEN THE engine SHALL exclude that **whole day** of that series, record it as "failed data check", log only a count, and continue; it SHALL NOT crash. |
| REQ-DAT-08 | THE engine SHALL load data once per container and keep it in memory for later requests. |
| REQ-DAT-09 | THE engine SHALL read the first and last timestamps from the loaded underlying data and use them wherever the data range is needed; no date range is hardcoded. |

### 2.3 Gaps (never filled)

| ID | Requirement |
|---|---|
| REQ-DAT-10 | THE engine SHALL NOT fill, copy, interpolate or estimate any missing minute of any series. |
| REQ-DAT-11 | THE engine SHALL build a gap inventory: minutes missing in the underlying, minutes missing in volatility, and days with no volatility at all, both for the whole data set and for any requested period. |
| REQ-DAT-12 | WHILE a minute has underlying data but no volatility data, THE engine SHALL treat that minute as **unpriceable**: no entry, exit check or fill happens there. |
| REQ-DAT-13 | IF a trading day has no volatility data at all (e.g. 2019-07-02), THEN THE engine SHALL take no trades that day and list it as skipped with the reason "no India VIX data". |

### 2.4 Expiry calendar

| ID | Requirement |
|---|---|
| REQ-DAT-14 | THE engine SHALL derive expiry dates from the profile's dated rules (weekly/monthly, weekday, valid-from/to) and the trading days, with no external holiday list. |
| REQ-DAT-15 | THE engine SHALL define trading days as the days present in the underlying data **plus** the profile's `extra_trading_days` (regular sessions removed during cleaning). |
| REQ-DAT-16 | IF a scheduled expiry date is not a trading day, THEN THE engine SHALL move the expiry to the previous trading day. |
| REQ-DAT-17 | THE engine's expiry calendar for NIFTY50 SHALL equal the record in `expiry-calendar-check.md` exactly: 136 monthly expiries; 379 weekly-or-monthly expiries from 2019-02-14; first weekly 2019-02-14; last Thursday expiry 2025-08-28; first Tuesday expiry 2025-09-02; and all 21 holiday-shifted dates. |
| REQ-DAT-18 | THE engine SHALL treat weekly expiries as unavailable before the profile's `periods.WEEKLY.available_from` (2019-02-11 for NIFTY50). |

### 2.5 Metadata endpoint

| ID | Requirement |
|---|---|
| REQ-DAT-19 | WHEN `GET /v1/meta` is called, THE engine SHALL return, per instrument: the data range read from the data, the instrument summary fields, expiry kinds with availability, default periods and the overfitting split, default costs with labels and sources, the risk-free rate, the data source, and the whole-data gap summary, as defined in `api.openapi.yaml` → `MetaResponse`. |

## 3. Requirements — simulation (REQ-ENG)

### 3.1 Candles and indicators

| ID | Requirement |
|---|---|
| REQ-ENG-01 | THE engine SHALL build N-minute candles (N in the profile's allowed timeframes: 1, 3, 5, 15, 30, 60, 240) from the 1-minute bars present, anchored at the session's first bar each day; a candle's open is its first present minute's open, high/low the extremes, close the last present minute's close. |
| REQ-ENG-02 | THE engine SHALL NOT build candles across days; the last candle of a day may be shorter (e.g. 60-min: 15:15–15:29; 240-min: 13:15–15:29). |
| REQ-ENG-03 | THE engine SHALL compute EMA, SMA, RSI, ADX (+DI, −DI), Supertrend (line and direction), MACD (line, signal, histogram) and Bollinger Bands (upper, middle, lower) with the parameters in the strategy, using the formulas fixed in design (§6 Q1), on the candle series continuously across days. |
| REQ-ENG-04 | THE engine SHALL compute indicators from the start of the data, not from the start of the requested period, so indicators are warmed up when the period begins; an indicator value SHALL be used only once its own warm-up is complete. |
| REQ-ENG-05 | THE engine SHALL NOT offer VWAP; a strategy containing a VWAP indicator SHALL fail schema validation (the schema has no VWAP type). |

### 3.2 Conditions

| ID | Requirement |
|---|---|
| REQ-ENG-06 | THE engine SHALL evaluate each side's condition tree on every candle close, combining `all` as AND and `any` as OR, with any depth allowed by the schema. |
| REQ-ENG-07 | THE engine SHALL evaluate `compare` (gt, gte, lt, lte) on the operands' values at the candle close, applying any `offset` (points added; percent of the operand's value). |
| REQ-ENG-08 | THE engine SHALL evaluate `cross` above as `left[t] > right[t] AND left[t−1] ≤ right[t−1]` (below mirrored). |
| REQ-ENG-09 | THE engine SHALL evaluate `turns` as the Supertrend direction changing to the stated direction on this candle, and `state` as the direction being the stated one on this candle. |
| REQ-ENG-10 | THE engine SHALL evaluate `slope` up as `operand[t] > operand[t−lookback]` (down mirrored, strict). |
| REQ-ENG-11 | IF any operand of a condition has no value on a candle (warm-up, or a `vix` operand on a candle with no VIX), THEN THE engine SHALL treat that condition as false on that candle. |

### 3.3 Pricing

| ID | Requirement |
|---|---|
| REQ-ENG-12 | THE engine SHALL price options through the PricingProvider named in the profile; for NIFTY50 `BLACK_SCHOLES_VIX`: σ = max(VIX + shift, 1)/100, T = max(minutes to expiry, 1)/525,600 with expiry at the profile's `expiry_time`, r = profile risk-free rate (continuous), no dividend yield. |
| REQ-ENG-13 | THE engine SHALL round modelled premiums to the profile's tick size and floor them at one tick. |
| REQ-ENG-14 | THE engine SHALL derive a minute's modelled premium range from the spot high and low at that minute's VIX (call: high from spot high; put: high from spot low), and the open premium from spot open and VIX open. |
| REQ-ENG-15 | THE engine SHALL run each evaluation three times — volatility shift 0, −S and +S, with S from the profile (2 points for NIFTY50) — and return the trades of all three runs. |

### 3.4 Strikes and contracts

| ID | Requirement |
|---|---|
| REQ-ENG-16 | THE engine SHALL choose the strike from spot at the **signal** time: ATM = spot rounded to the nearest strike interval (exact halves round up); ITM/OTM = ATM shifted by the distance (call ITM = lower strike; put ITM = higher strike). Example: spot 24,500, ITM 100, call → 24,400 CE. |
| REQ-ENG-17 | WHERE a leg selects its strike by delta or premium, THE engine SHALL choose, among strikes within ±20 intervals of ATM, the strike whose modelled delta (or premium) at the signal time is closest to the target, ties going to the strike nearer ATM. |
| REQ-ENG-18 | THE engine SHALL map `CURRENT_WEEKLY` to the nearest expiry on or after the trade date, `NEXT_WEEKLY` to the one after it, and `MONTHLY` to the nearest monthly expiry on or after the trade date. |

### 3.5 Entry: the entire strategy must be satisfied

| ID | Requirement |
|---|---|
| REQ-ENG-19 | THE engine SHALL take an entry only when, at the signal, every one of these holds: the side's full condition set is true; the fixed entry time (if set) matches; every advanced rule the user turned on allows it (entry windows, no-entry windows, expiry-day cutoff, max trades per day, stop after N stop-loss hits, max daily loss); no position is open; for intraday, the fill is before the square-off; the contract exists on that date; the fill minute is priceable; positional: the contract's expiry is on or before the last data date; and all exit levels can be calculated at entry. |
| REQ-ENG-20 | WHEN a signal fails any requirement in REQ-ENG-19, THE engine SHALL NOT enter (no partial or later "catch-up" entry) and SHALL count the signal under the **first** failing reason, in the order listed in `api.openapi.yaml` → `skipped.signals[].reason`. |
| REQ-ENG-21 | THE engine SHALL fill a condition-based entry at the **open of the minute after the signal candle's last minute**, and a fixed-time entry at the open of that minute, at the modelled premium ± slippage (buy +, sell −). |
| REQ-ENG-22 | THE engine SHALL allow only one open position per strategy (a multi-leg position counts as one) and SHALL ignore signals while a position is open. |
| REQ-ENG-46 | IF a signal's fill minute would fall on a later trading day than the signal (e.g. a positional signal on the day's last candle), THEN THE engine SHALL NOT enter and SHALL count the signal as `NEXT_DAY_FILL`. |
| REQ-ENG-47 | IF a strategy with option type "both" (`SIGNAL` leg) has its CE and PE conditions true on the same candle, THEN THE engine SHALL NOT enter either side and SHALL count the signal as `CONFLICTING_SIGNALS`. |

### 3.6 Exits

| ID | Requirement |
|---|---|
| REQ-ENG-23 | THE engine SHALL check stop-loss and target on every priceable minute after entry, using that minute's premium range; WHEN a level is crossed it SHALL fill at the level, or at the minute's open if the minute opens beyond the level (gap). |
| REQ-ENG-24 | IF a stop-loss and a target are both crossed within one minute, THEN THE engine SHALL assume the stop-loss was hit first. |
| REQ-ENG-25 | THE engine SHALL compute stop-loss levels as: `PCT_PREMIUM` → entry × (1 ∓ value%); `POINTS` → entry ∓ value; `TRIGGER_CANDLE` → the modelled premium low (bought) / high (sold) of the signal candle for the chosen strike; then, if `sl_cap_pts` is set, no further than `sl_cap_pts` from entry. (∓: below entry for bought options, above for sold.) |
| REQ-ENG-26 | THE engine SHALL compute targets as: `PCT_PREMIUM` and `POINTS` mirrored from REQ-ENG-25; `RR` → entry ± value × (stop distance). |
| REQ-ENG-27 | WHERE `trail_to_cost_at_r` is set, WHEN the position's favourable move reaches that multiple of the initial stop distance, THE engine SHALL move the stop to the entry price; a later exit there is recorded as `TRAIL_TO_COST`. |
| REQ-ENG-28 | WHERE `exit_after_candles` = N is set, THE engine SHALL count N candles **starting with the candle in which the entry filled**, and exit at the open of the first minute after the Nth candle closes, if neither stop nor target was hit (e.g. 15-min, entry 10:15, N = 4 → candles 10:15, 10:30, 10:45, 11:00 → exit 11:15, matching "4 candles = 60 minutes"). |
| REQ-ENG-29 | THE engine SHALL apply a time exit at the open of the stated minute (entry day or expiry day as set), and for intraday the square-off at the open of the profile's `intraday_squareoff` minute. |
| REQ-ENG-30 | IF an exit falls on an unpriceable minute, THEN THE engine SHALL fill at the next priceable minute's open. |
| REQ-ENG-31 | THE engine SHALL settle any position still open at its expiry day's last bar at intrinsic value from that bar's close, with no slippage, recorded as `EXPIRY_SETTLEMENT`. |
| REQ-ENG-32 | THE engine SHALL treat a multi-leg position as one: combined entry premium E = Σ leg entry premiums; combined P&L per unit = Σ (sold legs: entry − current; bought legs: current − entry); stop and target as loss/profit of value% × E (`PCT_PREMIUM`) or value points (`POINTS`); the minute's worst case for the stop check and best case for the target check taken from spot high/low; all legs exit at the same minute. |
| REQ-ENG-33 | WHILE a positional position is open overnight, THE engine SHALL keep checking it from the next day's first priceable minute, where a gap can fill beyond the level (REQ-ENG-23). |

### 3.7 Position size and costs

| ID | Requirement |
|---|---|
| REQ-ENG-34 | THE engine SHALL use quantity = lots × lot size for every trade (e.g. 2 × 65 = 130), unless VIX sizing applies. |
| REQ-ENG-35 | WHERE `vix_sizing` is set, THE engine SHALL use `max(1, floor(lots × size_pct / 100))` lots with the band chosen by VIX at the day open (first VIX minute of the day) or at entry, as set; and WHEN the 1-lot minimum changes the result, SHALL record the rule as having had no effect for that trade. |
| REQ-ENG-36 | THE engine SHALL apply the evaluation settings' costs per executed order exactly as in `backend.md` §4.6 (brokerage; STT on sells; exchange charges; SEBI fee; stamp duty on buys; GST on brokerage + exchange + SEBI; STT on exercise for long in-the-money settlement; nothing for worthless expiry), each charge rounded to 2 decimals, and apply slippage to prices, reporting it separately. |
| REQ-ENG-37 | THE engine SHALL NOT apply any default for a cost, period or strategy value missing from the request; a missing value is a validation error. |

### 3.8 Daily limits

| ID | Requirement |
|---|---|
| REQ-ENG-38 | WHERE `daily.max_trades` is set, THE engine SHALL count entries per trading day and block further entries once the limit is reached. |
| REQ-ENG-39 | WHERE `daily.stop_after_sl_hits` is set, THE engine SHALL count exits with reason `STOP_LOSS` per trading day and block further entries once the limit is reached. |
| REQ-ENG-40 | WHERE `daily.max_daily_loss_rupees` is set, THE engine SHALL block further entries once the day's realised net P&L (after costs) is at or below −limit; it SHALL NOT force-close an open position for this reason. |

### 3.9 The evaluate request

| ID | Requirement |
|---|---|
| REQ-ENG-41 | WHEN `POST /v1/evaluate` is received, THE engine SHALL validate the body against the schema and every SEM rule in `strategy-rules.md`, and IF validation fails, THEN return 422 with plain-English problems (feature 07 logging rules apply). |
| REQ-ENG-42 | THE engine SHALL simulate only trades whose entry falls inside the requested period, follow each trade to its exit even past the period end (within the data), and SHALL NOT enter trades outside the period. |
| REQ-ENG-43 | THE engine SHALL produce, for each run, the list of trades (fields of `api.openapi.yaml` → `Trade`), the skipped-signal counts by reason, the period's gap inventory, and the list of rules that had no effect, for feature 02 to turn into the report. |
| REQ-ENG-44 | THE engine SHALL be deterministic: the same request on the same engine version gives identical trades. |
| REQ-ENG-45 | THE engine SHALL meet the performance budgets in `backend.md` §8 (cold start ≤ 8 s; 15-min full weekly period with the three runs ≤ 30 s warm; 1-min full period ≤ 60 s). |

## 4. Acceptance criteria

| AC | Req. | Given / When / Then |
|---|---|---|
| AC-DAT-01 | 01, 02 | **Given** a profile missing `contract.strike_interval`, **when** the engine starts, **then** it refuses requests and logs only an error code. |
| AC-DAT-02 | 03, 04 | **Given** the `TESTIDX` profile and synthetic data, **when** the Simple Trend Follower (with `underlying: TESTIDX`) is evaluated, **then** trades are produced using TESTIDX's session, strike interval, expiry weekday and costs; **and** a scan of `nikasha_engine/` finds no instrument symbol or Nifty-specific constant. |
| AC-DAT-03 | 06, 07 | **Given** a fixture day with one bar where `high < close`, **when** data loads, **then** that whole day is excluded and reported as "failed data check", other days load, and nothing crashes. |
| AC-DAT-04 | 09, 19 | **Given** the real data, **when** `/v1/meta` is called, **then** `data_range.first` = 2015-01-09T09:15 and `last` = 2026-05-14T15:29, as read from the file (a fixture file with other dates gives those other dates). |
| AC-DAT-05 | 10, 12 | **Given** a minute with Nifty data and no VIX, **then** no entry, exit or fill happens at that minute, and no price is created for it. |
| AC-DAT-06 | 13 | **Given** a period including 2019-07-02, **then** no trades are taken that day and it is listed as skipped ("no India VIX data"). |
| AC-DAT-07 | 11 | **Given** the full data, **then** the gap inventory reports 184 missing Nifty minutes, 183 missing VIX minutes and VIX-less day 2019-07-02, matching `data/cleaning_report.json`. |
| AC-DAT-08 | 14–17 | **Given** NIFTY50, **then** the derived calendar equals `expiry-calendar-check.md` (counts, first/last dates, all 21 shifted dates), and 2021-02-24 shifts no expiry. |
| AC-DAT-09 | 18 | **Given** a weekly strategy and a period starting 2018-06-01, **then** validation fails with SEM-13's message. |
| AC-ENG-01 | 01, 02 | **Given** 60-min candles, **then** each day's candles start at 09:15, 10:15 … and the last is 15:15–15:29; with 240-min, there are two: 09:15–13:14 and 13:15–15:29; no candle spans two days. |
| AC-ENG-02 | 03 | **Given** reference price series, **then** each indicator matches pre-computed reference values to 1e-6 (fixtures in `engine/tests/fixtures/indicators/`). |
| AC-ENG-03 | 04 | **Given** a period starting 2024-01-01 with EMA 21 on 15-min, **then** the EMA has a value on the first candle of 2024-01-01 (warmed up from earlier data). |
| AC-ENG-04 | 08 | **Given** EMA9 = 100 / EMA21 = 100 on candle t−1 and 101 / 100 on t, **then** "EMA9 crosses above EMA21" is true at t; with 99 / 100 then 100 / 100 it is false. |
| AC-ENG-05 | 06, 09, 10 | **Given** the advanced sample's ADX rule ((ADX > 20 AND ADX rising over 1 candle) OR ADX > 30), **then** ADX 25 rising → true; 25 falling → false; 35 falling → true; 30 falling → false. |
| AC-ENG-06 | 12, 13 | **Given** S=24,500, K=24,500, VIX 15, 7 days to expiry, r 6.5%, **then** call and put premiums match the reference values, satisfy put-call parity within one tick, and are multiples of 0.05. |
| AC-ENG-07 | 16 | **Given** Nifty 24,500 and ITM 100, **when** a call is selected, **then** the strike is 24,400 CE; for a put, 24,600 PE; spot 24,525 → ATM 24,550. |
| AC-ENG-08 | 19, 20 | **Given** the Simple Trend Follower and a cross at 11:00 while a trade is open, **then** no entry is taken and the signal is counted under `POSITION_OPEN`; a cross at 14:45 is counted under `OUTSIDE_ENTRY_WINDOW`. |
| AC-ENG-09 | 21 | **Given** a 15-min signal candle 10:00–10:14, **then** the entry fills at the 10:15 minute's open premium plus 0.5 slippage. |
| AC-ENG-10 | 23, 24 | **Given** a bought option, entry 100, SL 70, target 150, **when** one minute's premium range is 65–155, **then** the exit is STOP_LOSS at 70; **when** the minute opens at 60, **then** the fill is 60. |
| AC-ENG-11 | 29 | **Given** holding Intraday, **when** a position is still open at 15:15, **then** it exits at the 15:15 minute's open with reason SQUARE_OFF. |
| AC-ENG-12 | 25, 26, 27 | **Given** the advanced sample (trigger-candle SL, cap 30, RR 1.5, trail at 1R), entry 120 and trigger-candle low 80, **then** SL = 90 (capped), target = 165; after the premium reaches 150, the stop moves to 120. |
| AC-ENG-13 | 28 | **Given** `exit_after_candles` 4 on 15-min and entry at 10:15, **when** no level is hit, **then** the exit is at the 11:15 minute's open with reason N_CANDLES. |
| AC-ENG-14 | 31 | **Given** a positional bought call with "hold until expiry", **then** it settles at intrinsic value from the expiry day's 15:29 close, without slippage. |
| AC-ENG-15 | 32 | **Given** the short straddle, CE 100 + PE 100 sold, SL 30%, **when** the combined loss reaches ₹60 per unit, **then** both legs exit at the same minute with reason STOP_LOSS. |
| AC-ENG-16 | 34 | **Given** 2 lots and lot size 65, **then** every trade in the period has quantity 130 and P&L calculated on 130. |
| AC-ENG-17 | 35 | **Given** 1 lot and VIX sizing 50% for VIX < 12, **when** VIX at the day open is 11, **then** 1 lot is used and the rule is recorded as having had no effect for that trade. |
| AC-ENG-18 | 36 | **Given** one bought round trip of 65 qty at 100 → 150 with the NIFTY50 default costs, **then** each charge equals the hand-computed value to the paisa. |
| AC-ENG-19 | 38, 39, 40 | **Given** max 2 trades/day, **then** a third signal that day is counted as `MAX_TRADES`; given stop after 2 SL hits, after two STOP_LOSS exits further signals that day are `SL_HITS_LIMIT`; given max daily loss, an open position is not closed for that reason. |
| AC-ENG-20 | 41, 37 | **Given** a request without `settings.costs.slippage_pts`, **then** the response is 422 and no default is applied. |
| AC-ENG-21 | 42 | **Given** a positional trade entered on the period's last day, **then** it is followed to its exit after the period end; a signal the day after the period end is not taken. |
| AC-ENG-22 | 19 | **Given** a positional weekly strategy and a signal on 2026-05-13, whose expiry (2026-05-19) is after the last data date, **then** no entry is taken and the signal is counted as `EXPIRY_AFTER_DATA_END`. |
| AC-ENG-23 | 44 | **Given** the same request twice, **then** the trade lists are identical. |
| AC-ENG-24 | 45 | **Given** the benchmark requests, **then** the timings meet `backend.md` §8 on the reference machine (and on Lambda after deploy). |
| AC-ENG-26 | 46 | **Given** a positional strategy whose condition is true on the 15:15–15:29 candle, **then** no entry is taken that day or the next morning, and the signal is counted as `NEXT_DAY_FILL`. |
| AC-ENG-27 | 47 | **Given** option type "both" with CE and PE conditions both true on one candle, **then** no entry is taken and the signal is counted as `CONFLICTING_SIGNALS`. |
| AC-ENG-25 | 15 | **Given** any evaluation, **then** three trade lists are produced (shift 0, −2, +2) and the ±2 runs differ only in premiums and anything that follows from them. |

## 5. Edge cases

| Case | Expected | Req. |
|---|---|---|
| Signal candle is the day's last candle (closes 15:29) | Intraday: after square-off → skipped (`AFTER_SQUAREOFF`). Positional: skipped (`NEXT_DAY_FILL`) | 19, 46 |
| Fill minute missing in Nifty (not just VIX) | Unpriceable → entry skipped (`UNPRICEABLE`) | 12, 19 |
| Trigger-candle SL would be on the wrong side of entry (e.g. bought, candle low ≥ entry premium) | Exit levels can't be set → `EXIT_LEVELS_UNAVAILABLE` (decision D3) | 19, 25 |
| Weekend budget-day session | Normal trading day, incl. for expiries and daily limits | 15 |
| Expiry on a holiday-shifted Wednesday | Expiry-day cutoff and "expiry day" breakdown use the shifted date | 16 |
| `NEXT_WEEKLY` in a monthly-expiry week | The next expiry after the monthly one | 18 |
| VIX + shift below 1 (e.g. VIX 2.5 − 2) | σ floored at 1% | 12 |
| Strike far OTM with near-zero premium | Floored at one tick (0.05); costs still apply | 13 |
| Same-candle signal on CE and PE (option type "both") | Neither side entered → `CONFLICTING_SIGNALS` | 47 |
| Period start before indicator warm-up is possible (e.g. start 2015-01-09 with EMA 200 on 60-min) | Conditions false until warm-up completes; no error | 04, 11 |

## 6. Clarify gate — resolved decisions (owner, 2026-10-14)

| # | Question | Decision |
|---|---|---|
| D1 | Indicator formulas | Standard textbook definitions: EMA seeded with the SMA of the first N values (α = 2/(N+1)); RSI, ATR and ADX with Wilder's smoothing; Supertrend on (high+low)/2 with Wilder ATR; MACD = EMA(fast) − EMA(slow), signal = EMA of MACD; Bollinger with population standard deviation. Exact formulas in the design. |
| D2 | Positional signal on the day's last candle | Not filled next morning; skipped as `NEXT_DAY_FILL` (REQ-ENG-46; new skip reason in the contract). |
| D3 | Trigger-candle SL on the wrong side of entry | Trade skipped as `EXIT_LEVELS_UNAVAILABLE`; no fallback to the cap. |
| D4 | CE and PE true on the same candle (option type "both") | Neither entered; `CONFLICTING_SIGNALS` (REQ-ENG-47; new skip reason in the contract). |
| D5 | Does `stop_after_sl_hits` count trailed-stop exits? | No; only `STOP_LOSS` exits (REQ-ENG-39). |
| D6 | Delta/premium strike search range | ±20 strike intervals around ATM (REQ-ENG-17). |
| D7 | Data check failure granularity | Whole day excluded (REQ-DAT-07). |

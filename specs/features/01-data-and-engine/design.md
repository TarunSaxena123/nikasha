# Feature 01 — Data and Engine: Design

Status: **Approved 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) (REQ-DAT-01…19, REQ-ENG-01…47) · Follows [`backend.md`](../../backend.md), [`architecture.md`](../../architecture.md), feature 07 design §2

---

## 1. Frontend

**Not applicable.** This feature is backend only. The web app consumes its outputs through `/v1/meta` (feature 07 and every screen showing dates) and through the report built by feature 02.

## 2. Backend

### 2.1 Module responsibilities

The layout follows `backend.md` §2. Responsibilities in this feature:

| Module | Responsibility | Req. |
|---|---|---|
| `scripts/csv_to_parquet.py` | Build-time: CSV → Parquet (`datetime` as naive `timestamp[us]`, prices `float64`), one file per series; prints row counts | DAT-05 |
| `instruments/registry.py` | Load + validate profiles; `get(symbol) → Instrument` (frozen dataclass) | DAT-01–04 |
| `data/loader.py` | Read Parquet per profile; run checks; build `MarketData`; cache per container | DAT-05–09 |
| `data/checks.py` | Per-day checks, returns excluded days with reasons | DAT-06, 07 |
| `data/gaps.py` | Gap inventory for the whole data and for a period | DAT-10–13 |
| `calendar/expiry.py` | Trading days, expiry lists, contract lookup | DAT-14–18, ENG-18 |
| `candles/resample.py` | Candle building per timeframe; cached per (instrument, timeframe) | ENG-01, 02 |
| `indicators/*.py` | One pure function per indicator over numpy arrays | ENG-03–05 |
| `conditions/evaluator.py` | Condition tree → boolean array per candle | ENG-06–11 |
| `pricing/black_scholes_vix.py` | Vectorised BS price and delta | ENG-12–14 |
| `backtest/strikes.py` | Strike selection | ENG-16, 17 |
| `backtest/gates.py` | Ordered entry checks → enter or skip reason | ENG-19, 20, 46, 47 |
| `backtest/fills.py` | Fill prices, slippage, tick rounding | ENG-21, 23, 30 |
| `backtest/exits.py` | Level calculation and the minute-level exit search | ENG-23–33 |
| `backtest/sizing.py`, `backtest/costs.py` | Quantity, VIX sizing, charges | ENG-34–37 |
| `backtest/runner.py` | Orchestrates one run; returns `RunResult` | ENG-15, 19–47 |
| `core/api.py` | `/v1/meta`, `/v1/evaluate` (with feature 02's report builder), validation | DAT-19, ENG-41 |

### 2.2 Market data in memory

```python
@dataclass(frozen=True)
class MarketData:                 # one per instrument, built once per container
    minutes: np.ndarray           # datetime64[m], union of underlying and volatility minutes, sorted
    day_id: np.ndarray            # int index of the trading day for each minute
    s_open, s_high, s_low, s_close: np.ndarray   # underlying; NaN where the underlying minute is missing
    v_open, v_close: np.ndarray                  # volatility;  NaN where the volatility minute is missing
    priceable: np.ndarray         # bool: underlying AND volatility present          (DAT-12)
    days: np.ndarray              # trading days present in the underlying data
    day_start, day_end: np.ndarray               # index ranges per day into `minutes`
    excluded_days: dict[date, str]               # failed checks / no volatility      (DAT-07, 13)
```

- Built by an outer join of the two series on `datetime`. Missing values stay `NaN` and are never filled (DAT-10).
- Days excluded by checks are dropped from both series. Days with no volatility rows keep their underlying rows (for indicators) but are marked untradeable (DAT-13).
- Size: about 1.05M minutes × 8 float64 arrays ≈ 70 MB, comfortably inside 2,048 MB.

### 2.3 Load-time checks (`data/checks.py`)

For each series, grouped by calendar day, the day fails if any row has: missing required column values; a duplicate or out-of-order timestamp; a time outside `first_bar`–`last_bar`; `low > min(open, close)` or `high < max(open, close)`; a price ≤ 0. A failing day is excluded from **both** series (an option needs both), with reason "failed data check". Only the count is logged (feature 07).

### 2.4 Gap inventory (`data/gaps.py`)

For each trading day: expected minutes = every minute from `first_bar` to `last_bar` (375 for NIFTY50).
- `missing_underlying` = expected − present underlying minutes.
- `missing_volatility` = expected − present volatility minutes, counted only on days that have some volatility data.
- `days_without_volatility` = trading days with zero volatility rows.

Computed once for the whole data (for `/v1/meta`), then filtered by period for each evaluation. Expected whole-data values: 184 / 183 / [2019-07-02] (AC-DAT-07). If the counting convention gives a different total than `cleaning_report.json`, the difference is investigated and explained in the test, never silently accepted.

### 2.5 Expiry calendar (`calendar/expiry.py`)

```
trading_days = days in underlying data ∪ profile.expiry.extra_trading_days
for each rule (kind, weekday, position, valid_from, valid_to or +∞):
    scheduled = every <weekday> in [valid_from, min(valid_to, last_data_day + 60d)]
    if kind == MONTHLY: keep only the last <weekday> of each month
    for s in scheduled:
        if s ≤ last_data_day: expiry = max(d ∈ trading_days, d ≤ s)     # holiday → previous trading day
        else:                 expiry = s                                # beyond data: holidays unknown; used only
                                                                        # for the EXPIRY_AFTER_DATA_END check
weekly_list  = sorted(expiries of WEEKLY rules ∪ MONTHLY rules) restricted to ≥ periods.WEEKLY.available_from
monthly_list = sorted(expiries of MONTHLY rules)
```

- Monthly expiries belong to the weekly list too: in a monthly-expiry week the monthly contract is that week's nearest expiry (`product.md` §7.4).
- Contract lookup on trade date `d`: `CURRENT_WEEKLY` = first in `weekly_list` ≥ d; `NEXT_WEEKLY` = the one after; `MONTHLY` = first in `monthly_list` ≥ d (ENG-18). Before `available_from`, weekly lookups return "no contract" (DAT-18).
- `is_expiry_day(d, contract)` compares with the contract's (shifted) expiry date. It is used by the expiry-day cutoff and by report breakdowns.
- The test reproduces `expiry-calendar-check.md` exactly (DAT-17).

### 2.6 Candles (`candles/resample.py`)

- Bucket for a minute = `floor((minutes since first_bar) / N)` within its day (ENG-01). Candle open/high/low/close come from the underlying minutes present in the bucket. A bucket with no underlying minute produces no candle (indicators run on candles that exist).
- Each candle stores `start`, `nominal_end` (start + N − 1 min, capped at `last_bar`) and `last_present` (its last underlying minute).
- Volatility candles are built the same way (`vix` open = first present volatility open in the bucket, `vix` close = last present volatility close); NaN if none.
- Candles never cross days (ENG-02). Results are cached per (instrument, timeframe) in container memory (market-derived data only, no strategy content).

### 2.7 Indicators (`indicators/`) — formulas (decision D1)

Notation: `x` = source series on candles; `n` = period; values before warm-up are NaN. `SMA_n(x)` = simple mean of the last n values. **RMA** (Wilder): seed = SMA of the first n values; then `r_t = (r_{t−1}·(n−1) + x_t) / n`.

| Indicator | Definition | First valid candle (0-based) |
|---|---|---|
| SMA(n) | `SMA_n(x)` | n−1 |
| EMA(n) | seed `e_{n−1} = SMA_n(x)`; `e_t = α·x_t + (1−α)·e_{t−1}`, `α = 2/(n+1)` | n−1 |
| RSI(n) | `Δ_t = close_t − close_{t−1}`; `G = RMA_n(max(Δ,0))`, `L = RMA_n(max(−Δ,0))` (both over Δ from t=1); `RSI = 100 − 100/(1 + G/L)`; L = 0 → 100; G = L = 0 → 50 | n |
| TR / ATR(n) | `TR_t = max(h−l, |h−c_{t−1}|, |l−c_{t−1}|)`, `TR_0 = h−l`; `ATR = RMA_n(TR)` | n−1 |
| ADX(n), +DI, −DI | `up = h_t − h_{t−1}`, `dn = l_{t−1} − l_t`; `+DM = up if up > dn and up > 0 else 0`; `−DM` mirrored; `+DI = 100·RMA_n(+DM)/RMA_n(TR)`, `−DI` likewise (from t=1); `DX = 100·|+DI − −DI|/(+DI + −DI)` (0 if the sum is 0); `ADX = RMA_n(DX)` | DI: n; ADX: 2n−1 |
| Supertrend(p, m) | `hl2 = (h+l)/2`; `ATR = ATR_p`; `bu = hl2 + m·ATR`, `bl = hl2 − m·ATR`; `fu_t = bu_t if bu_t < fu_{t−1} or c_{t−1} > fu_{t−1} else fu_{t−1}`; `fl_t = bl_t if bl_t > fl_{t−1} or c_{t−1} < fl_{t−1} else fl_{t−1}`; direction: first valid candle `up if c > hl2 else down`; then `if dir_{t−1} = down: dir_t = up if c_t > fu_t else down`; `if dir_{t−1} = up: dir_t = down if c_t < fl_t else up`; `value = fl if up else fu` | p−1 |
| MACD(f, s, g) | `macd = EMA_f(close) − EMA_s(close)` (valid from s−1); `signal = EMA_g(macd)` seeded on the first g valid macd values; `hist = macd − signal` | macd: s−1; signal/hist: s+g−2 |
| Bollinger(n, k) | `mid = SMA_n(x)`; `sd` = population std (ddof 0) of the last n values; `upper/lower = mid ± k·sd` | n−1 |

- Indicators always run on the **full** candle series from the start of the data (ENG-04). The requested period only limits where signals may enter.
- The candle series is continuous across days and gaps; no reset at day boundaries.
- **Reference values (AC-ENG-02):** small hand-computed series for every indicator, plus longer fixtures generated once with an independent open-source technical-analysis library configured to the same conventions. Values are stored as fixtures and the library is not a runtime dependency. Any convention difference found while generating fixtures is resolved in favour of the table above and noted in the fixture README.

### 2.8 Conditions (`conditions/evaluator.py`)

Each node returns a boolean numpy array over candles (ENG-06–11):

| Node | Evaluation (NaN anywhere in the node's inputs at t → False) |
|---|---|
| `all` / `any` | element-wise AND / OR of children |
| `compare` | `L[t] op R[t]` where an operand with offset is `v + pts` or `v·(1 + pct/100)` |
| `cross` above | `L[t] > R[t] & L[t−1] ≤ R[t−1]` (below mirrored) |
| `state` | `dir[t] == is` |
| `turns` | `dir[t] == to & dir[t−1] != to` |
| `slope` up | `X[t] > X[t−lookback]` (down: `<`) |
| Operands | indicator output array; candle price array; volatility candle open/close; constant broadcast |

Conditions use the **real** volatility values. The ±2 sensitivity shift affects pricing only (§2.9), so signals are identical in all three runs.

### 2.9 Pricing (`pricing/black_scholes_vix.py`)

```
σ = max(V + shift, 1) / 100          # V = volatility value at the minute (open or close as used)
T = max(minutes(t → expiry_date @ expiry_time), 1) / 525_600     # calendar minutes, incl. nights/weekends
d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T);  d2 = d1 − σ·√T
call = S·N(d1) − K·e^(−rT)·N(d2);   put = K·e^(−rT)·N(−d2) − S·N(−d1)
delta_call = N(d1);   delta_put = N(d1) − 1
premium = max(round_to_tick(price), tick)
```

- Vectorised over minutes with `scipy.special.ndtr` (ENG-12, 13).
- Per minute: `open` premium from (S_open, V_open); `high`/`low` from S_high/S_low at V_close for calls, swapped for puts (ENG-14). V_close is used for the range because it is the minute's settled volatility; this is noted in "How this was simulated".
- A leg premium is computed only on minutes where a position needs it (§2.11).

### 2.10 Strikes (`backtest/strikes.py`)

- **Moneyness (ENG-16):** `atm = interval · floor(S/interval + 0.5)` (exact halves round up); call ITM = `atm − d`, call OTM = `atm + d`; put ITM = `atm + d`, put OTM = `atm − d`.
- **Delta / premium (ENG-17):** candidates `atm ± i·interval`, i = 0…20; price each at the signal minute (shift = run's shift); choose the minimal `|delta − target|` (or `|premium − target|`); ties → smaller `i`.
- `S` at the signal = the signal candle's close (condition entries) or the fixed-time minute's open (fixed-time-only entries).

### 2.11 One run (`backtest/runner.py`)

```
signals = candidate signals in time order (§2.12)
position_until = −∞; day_state = {}            # per trading day: entries, sl_hits, realised_net
for sig in signals:
    reason = gates.check(sig, position_until, day_state, ...)      # §2.13, first failing reason
    if reason: skipped[reason] += 1; continue
    trade = simulate_trade(sig, run_shift)                           # §2.14 – full path to exit
    if trade is None: skipped[EXIT_LEVELS_UNAVAILABLE] += 1; continue
    trades.append(trade); position_until = trade.exit_minute; update day_state
return RunResult(trades, skipped, no_effect_notes, gaps_for_period)
```

- Because a trade is simulated to its exit as soon as it is entered, "position open" is simply `sig.time < position_until` (ENG-22).
- `day_state` updates use the trade's **exit** day for `sl_hits` and `realised_net`, and the entry day for `entries`. Daily limits apply to new entries on the current trading day.
- The three runs (shift 0, −S, +S) reuse the same `signals`; each run has its own gates and path, because exit levels and fills depend on premiums (ENG-15).

### 2.12 Signals

| Strategy shape | Signal times |
|---|---|
| Conditions only (`ce` / `pe` / `all_legs`) | Every candle where the side's tree is true. Signal time = candle `nominal_end`; fill minute = `nominal_end + 1 min` |
| Fixed time only (`at_time`) | Each trading day at `at_time`; fill minute = `at_time` |
| Conditions + `at_time` | Each trading day at `at_time`, if the tree is true on the **latest candle whose `nominal_end` < at_time** that day; fill minute = `at_time` |

- **Side resolution:** for a `SIGNAL` leg, if `ce` and `pe` are both true on the same candle → one signal counted `CONFLICTING_SIGNALS` (ENG-47). For fixed CE/PE legs, only the matching tree is used. Multi-leg uses `all_legs` or `at_time`.
- **Fill on a later day:** if `nominal_end` is the day's `last_bar`, the next minute is on the next trading day. Intraday → `AFTER_SQUAREOFF`; positional → `NEXT_DAY_FILL` (ENG-46). Gate 9 (`AFTER_SQUAREOFF`) applies only to intraday and gate 10 (`NEXT_DAY_FILL`) only to positional, so each case has exactly one possible reason.
- Signals with entry date outside the requested period are not generated (ENG-42).

### 2.13 Gate order (`backtest/gates.py`)

Checks run in this order; the first failure is the counted reason (ENG-20), matching the contract enum:

1. `CONFLICTING_SIGNALS` — CE and PE both true (SIGNAL leg)
2. `POSITION_OPEN` — `sig.time < position_until`
3. `OUTSIDE_ENTRY_WINDOW` — entry windows set and the fill minute is in none of them (`from ≤ t < to`)
4. `IN_NO_ENTRY_WINDOW` — the fill minute is in any no-entry window
5. `AFTER_EXPIRY_CUTOFF` — the trade date is the contract's expiry day and the fill minute ≥ cutoff
6. `MAX_TRADES` — entries today ≥ max
7. `SL_HITS_LIMIT` — STOP_LOSS exits today ≥ limit (D5)
8. `MAX_DAILY_LOSS` — realised net today ≤ −limit
9. `AFTER_SQUAREOFF` — intraday and the fill minute ≥ square-off (incl. fills on a later day)
10. `NEXT_DAY_FILL` — positional and the fill minute is on a later trading day
11. `NO_CONTRACT` — no contract for the expiry kind on the trade date (incl. before weekly availability)
12. `EXPIRY_AFTER_DATA_END` — positional and the contract's expiry > last data day
13. `UNPRICEABLE` — the fill minute is missing, not priceable, or on an excluded / VIX-less day
14. `EXIT_LEVELS_UNAVAILABLE` — returned by `simulate_trade` when levels can't be set (D3)

For checks 5 and 11–12 the contract is resolved from the fill minute's date.

### 2.14 Simulating a trade (`backtest/exits.py`, `fills.py`)

**Entry.** For each leg: strike (§2.10), expiry (§2.5), fill price = open premium at the fill minute ± slippage (buy +, sell −), floored at one tick. Quantity per §2.15.

**Levels (single leg; P = entry fill price; "down" = against a bought option, "up" = against a sold one).**

| Item | Bought | Sold |
|---|---|---|
| SL `PCT_PREMIUM v` | P·(1 − v/100) | P·(1 + v/100) |
| SL `POINTS v` | P − v | P + v |
| SL `TRIGGER_CANDLE` | min modelled premium low over the signal candle's minutes (same strike/expiry, run shift) | max modelled premium high over those minutes |
| then `sl_cap_pts c` | SL = max(SL, P − c) | SL = min(SL, P + c) |
| risk R | P − SL | SL − P |
| Target `PCT_PREMIUM v` / `POINTS v` | P·(1 + v/100) / P + v | P·(1 − v/100) / P − v |
| Target `RR k` | P + k·R | P − k·R |
| Trail at `x`R | trigger when premium high ≥ P + x·R → SL := P | premium low ≤ P − x·R → SL := P |

If R ≤ 0 (SL not on the losing side of P), or a sold option's target ≤ one tick, then levels are unavailable → `EXIT_LEVELS_UNAVAILABLE` (D3).

**Multi-leg (ENG-32).** E = Σ leg entry prices. Combined P&L per unit at a premium state = Σ(sold: entry − p; bought: p − entry). Stop: loss ≥ v%·E or v points; target: profit ≥ v%·E, v points, or k·R with R = stop loss amount. For each minute, the worst and best combined values are computed by evaluating all legs at spot high and at spot low (each leg's premium is monotonic in spot, so the extremes occur at one of the two). Trail and N-candle rules apply to the combined position.

**Exit search.** Walk forward minute by minute **in vectorised blocks of one trading day**:
1. For the day's priceable minutes from the fill minute onwards (the fill minute's range is checked after the open), compute premium open/high/low per leg.
2. Find the first minute where the stop is crossed and the first where the target is crossed. Before the trail trigger, the stop is the initial SL; after it, the stop is P (two-phase search).
3. Candidate exits: stop, target, trail stop, N-candle minute, time exit minute, square-off (intraday), expiry settlement (expiry day's last bar). The earliest wins. Ties within one minute: **stop before target** (ENG-24); stop/target before time-based exits in the same minute.
4. Price: for stop/target, the level, or the minute's open if it opened beyond the level (gap, ENG-23). For time exits, the minute's open premium. Slippage applies against the trader; settlement has no slippage (ENG-31).
5. If the chosen exit minute is unpriceable, use the next priceable minute's open (ENG-30). Positional: continue to the next trading day (ENG-33).

**Recorded per trade:** the `Trade` schema fields, plus `exit_reason`, `vol_at_entry` (VIX open at the fill minute, real value), `regime` (filled by feature 02), `expiry_day`, the signal time and spot at entry.

### 2.15 Sizing and costs

- `lots_used = lots`, or with VIX sizing `max(1, floor(lots · pct/100))` from the band of VIX at `DAY_OPEN` (the day's first present volatility open) or `ENTRY` (fill minute VIX open). When `floor(...) < 1` raised the result to 1, a no-effect note is recorded for that trade (ENG-35). Quantity = `lots_used × lot_size` (ENG-34).
- Costs per order exactly as `backend.md` §4.6 (ENG-36). Turnover uses the fill price **after** slippage. Each charge is rounded half-up to 2 decimals. Slippage cost = `slippage_pts × quantity` per fill, reported separately. Gross P&L = Σ legs (exit − entry, signed) × quantity; net = gross − charges.

### 2.16 `/v1/meta` and `/v1/evaluate`

- `/v1/meta` assembles `MetaResponse` from the registry, `MarketData` (first/last timestamps, DAT-09) and the whole-data gap inventory. It is cached for the container's lifetime.
- `/v1/evaluate`:
  1. schema validation, then SEM rules (via `validation/semantic.py`)
  2. the three runs
  3. hand-off of the `RunResult`s to feature 02's report builder
  4. response

  Requests with no costs/period are rejected (ENG-37); no defaults exist in engine code.

### 2.17 Performance approach (ENG-45)

- Candles and the full-series indicator arrays are numpy; conditions are vectorised.
- The Python-level loop runs only over **signals** (thousands at most) and, inside a trade, over **days held** (1 for intraday). Minute work inside a day is vectorised.
- Premiums are computed only for minutes a position holds (≤ 375 per intraday trade).
- Benchmarks (`engine/tests/perf/`) cover the budget cases and run in CI on the reference machine. After deploy they are timed once on Lambda.

### 2.18 Vocabulary extensions (ENG-48…57, added 2026-10-15)

**Contract shapes** (`strategy.schema.json`):
- Indicators: `{"type":"OPENING_RANGE","minutes":5–120}` → outputs `high`, `low`; `{"type":"PIVOTS"}` → outputs `p, tc, bc, r1, r2, r3, s1, s2, s3, cpr_width, cpr_width_pct`.
- Operand: `{"candle":"range"|"body"}`.
- `exit.exit_when`: `{ce?, pe?, all_legs?}`, each a condition tree (SEM-03, 04, 15, 24 apply).
- `exit.target`: new branch `{"type":"SPOT_LEVEL","ce"?: Operand,"pe"?: Operand}` (SEM-22, 23).
- `advanced.trail_to_cost_at_pts` (> 0; SEM-21).
- `advanced.partial_exit`: `{"percent": 1–99, "when": {"type":"PREMIUM_GAIN","gain":{"type":PCT_PREMIUM|POINTS|RR,"value">0}} | {"type":"SPOT_LEVEL","ce"?,"pe"?}, "then_stop": UNCHANGED|COST|PARTIAL_CANDLE}` (SEM-22, 23, 25).

**Indicators** (`indicators/levels.py`): opening range from the minute arrays (session first bar + N − 1 is the range's last minute; per-day max/min of present minutes; broadcast to candles of that day whose `end_tod` ≥ the last minute). Pivots from per-day session H/L/C of the underlying (the previous day in `MarketData.days`), broadcast to every candle of the day. Candle size in `conditions/evaluator.py`.

**Exit search** (`backtest/exits.py`), all as positions in the trade's priceable window:
1. Exit conditions: boolean per candle from the side's tree (computed once per strategy in `prepare`); the first candle with `end_minute` ≥ the fill minute where it is true gives the minute `end_minute + 1` → candidate `SIGNAL_EXIT`, priority before the stop at the same position.
2. Index levels: per window minute, the level from the last candle with `end_minute` < minute (searchsorted); direction fixed by level vs index at the fill minute open; touched where `high ≥ level` (up) or `low ≤ level` (down); NaN never touches. Fill: gapped when the minute's open is already beyond → open premium; otherwise premium at index = level, closing VIX.
3. `SPOT_TARGET` joins the candidate list with the target's priority (stop first).
4. Partial exit: trigger position from the premium gain (best P&L ≥ gain amount, like a target) or the index level; applied only when strictly before the whole-position exit position and `lots_used ≥ 2`. Lots closed = clamp(floor(lots × percent / 100), 1, lots − 1). Fill as a target (level or gapped open) or as an index level.
5. After the partial: `UNCHANGED` → the whole-position search stands; `COST` → stop hits recomputed from the next position with level 0 (`TRAIL_TO_COST`); `PARTIAL_CANDLE` → the old stop and trail apply until the partial candle's `end_minute`, then the index stop (candle low for an upward level, high otherwise) replaces them (`TRAILING_STOP`, filled like an index level). The final exit is the earliest remaining candidate.
6. `TradePath.partial` holds the position, minute, lots closed, reason and each leg's exit premium after slippage.

**Runner and costs:** volatility sizing moves before `simulate_trade`, which receives `lots_used`. `_finish` charges the entry for the full quantity, the partial exit for its quantity and the final exit (or settlement) for the rest; slippage cost counts each fill with its own quantity. A partial rule that could not split a 1-lot trade adds the no-effect line "Partial exit: the trade used 1 lot, so nothing could be split off (the rule had no effect on these trades)".

## 3. Contract

| Item | Use |
|---|---|
| `GET /v1/meta` → `MetaResponse` | **Produced** by this feature (DAT-19) |
| `POST /v1/evaluate` → request (`EvaluateRequest`) | **Validated and simulated** by this feature; the response `Report` is completed by feature 02 |
| `Trade` schema | Fields filled by this feature (except `regime`, filled by feature 02) |
| `skipped.signals[].reason` | **Changed:** adds `CONFLICTING_SIGNALS` and `NEXT_DAY_FILL`; the enum order is now the gate order (§2.13) |
| `strategy.schema.json`, `instrument.schema.json`, `strategy-rules.md` | Used as approved; no change |
| New fixtures | `contracts/fixtures/strategies/{valid,invalid}/*.json` (shared with the web app): the three schema examples, the one-line sample after answers, and one invalid fixture per SEM rule, named by rule ID |

## 4. Error handling

| Situation | Behaviour | Req. |
|---|---|---|
| Invalid profile at start-up | Container refuses every request with 500 `ENGINE_ERROR`; the log holds only a technical code | DAT-02 |
| Bad data day | Excluded, counted, run continues | DAT-07 |
| Validation failure | 422 with plain-English problems | ENG-41 |
| Period outside data / no valid expiry | 422 `PERIOD_INVALID` | ENG-41 |
| Numerical problem in pricing (e.g. T→0) | Guarded by the T and σ floors; never NaN in fills; an unexpected NaN raises → 500 with a code-only log | ENG-12 |
| Request over 1 MB | 413 | backend.md §3 |

## 5. Testing strategy

| Area | Tests | ACs |
|---|---|---|
| Registry | Invalid profile fixture; TESTIDX end-to-end; grep test for instrument constants | DAT-01, 02 |
| Data | Broken-day fixtures per check; real-data load; meta range from a fixture file with other dates | DAT-03, 04 |
| Gaps | Unpriceable minute fixture; 2019-07-02; whole-data counts vs `cleaning_report.json` | DAT-05, 06, 07 |
| Calendar | Full comparison with `expiry-calendar-check.md`; weekly before 2019-02-11 | DAT-08, 09 |
| Candles | 60-min and 240-min boundaries; missing-minute bucket; no cross-day candles | ENG-01 |
| Indicators | Hand series + library-generated fixtures, tolerance 1e-6; warm-up index per the table | ENG-02, 03 |
| Conditions | Cross equality cases; ADX rule cases; NaN → false | ENG-04, 05 |
| Pricing | Reference values, put-call parity, tick rounding, σ and T floors | ENG-06 |
| Strikes | 24,500 / 24,525 cases; delta/premium search tie-break | ENG-07 |
| Gates | One scenario per skip reason (14), plus first-reason ordering | ENG-08, 22, 26, 27 |
| Fills/exits | SL-first, gap fill, square-off, trigger-candle + cap + RR + trail, N-candle, settlement, multi-leg combined stop | ENG-09–15 |
| Sizing/costs | 2 × 65 = 130; VIX sizing no-effect; hand-computed charges to the paisa | ENG-16, 17, 18 |
| Daily limits | Max trades, SL hits (trail exits not counted), max daily loss doesn't force-close | ENG-19 |
| Request | Missing costs → 422; positional trade beyond period end; data-end skip | ENG-20, 21, 22 |
| Determinism, three runs | Same request twice; three runs with identical signals | ENG-23, 25 |
| Performance | Benchmarks against `backend.md` §8 | ENG-24 |

All tests use local data or synthetic fixtures; none call paid services.

## 6. Consistency check

Checked against `constitution.md` (§2, §3, §7, §10), `product.md` §7–§9, `backend.md` §2–§5 and §8, `architecture.md` §3 and §5, `contracts/` and feature 07 design §2. Findings:
- **Contract change:** two skip reasons added and the enum order defined as the gate order (D2, D4). Recorded in `CHANGELOG.md`.
- **Clarification of `product.md` §7.2:** a positional signal on the last candle is skipped (`NEXT_DAY_FILL`), consistent with "no catch-up entries".
- **Clarification of `product.md` §7.5:** the minute's premium range uses the minute's volatility close (§2.9). This is a detail of "Black-Scholes with India VIX as IV" and is disclosed in the report's simulation notes.
- **`product.md` §7.3 ATM ties** ("round to nearest") now explicitly round halves up, matching `backend.md` §4.4.
- No other contradictions found.

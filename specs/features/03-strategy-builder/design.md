# Feature 03 — Strategy Builder: Design

Status: **Approved under delegation 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) (REQ-INP-01…21) · Follows [`frontend.md`](../../frontend.md) §4–§7, `contracts/strategy.schema.json`, `contracts/strategy-rules.md`, `contracts/advanced-options.json`

---

## 1. Frontend

### 1.1 Modules (`web/src/strategy/`)

| Module | Responsibility | Used by |
|---|---|---|
| `draft.ts` | `Draft` = partial strategy + web-only fields `{ confirmed: {lots, lotSize}, origin, leftOut[], pending[], hiddenPutSet? }` | all strategy screens |
| `completeness.ts` | `completeness(draft, meta) → MissingItem[]` (§1.2) | builder, review (02), upload (04) |
| `describe.ts` | `describeStrategy(strategy, meta, overrides?) → RuleLine[]` (§1.3) | review (02), templates (05), report/PDF (02) |
| `validate.ts` | Ajv standalone validator compiled at build from `strategy.schema.json` + `strategyRules.ts` (SEM-01…20); `validate(draft, meta, settings?) → Problem[]` with field labels | builder, review |
| `mirror.ts` | Call → Put mirroring (§1.8) | builder |
| `fieldMap.ts` | JSON-pointer patterns and SEM ids → `BuilderFieldId` + plain-English label (§1.12) | validation display, tooltips |

### 1.2 Completeness (INP-01)

| # | Input | Missing when |
|---|---|---|
| 1 | Instrument | `underlying` absent (always set to NIFTY50 by the builder) |
| 2 | Trade action | any leg without `action` |
| 3 | Option type | no legs, or a leg without `option_type` |
| 4 | Strike moneyness | a `MONEYNESS` strike without `moneyness` |
| 5 | Strike distance | ITM/OTM without `distance_pts` |
| 6 | Expiry | a leg without `expiry` |
| 7 | Candle timeframe | `timeframe_min` absent |
| 8 | Holding type | `holding` absent |
| 9 | Number of lots | absent **or** not confirmed |
| 10 | Lot size | absent **or** not confirmed |
| 11 | Entry trigger | `entry` has none of `at_time` / `ce` / `pe` / `all_legs` matching the legs, or a `pending` condition remains |
| 12 | Stop-loss | `exit.stop_loss` absent |
| 13 | Exit rule | Positional and none of target / time_exit / hold_to_expiry / exit_after_candles → the **positional exit question** |

Each `MissingItem` has `{ key, label, question }`, where `question` is a fixed `Question` object (same shape as the API's), so the upload flow can ask it. Lots and lot size questions are NUMBER questions with `prefill` from meta (1 and 65), confirmed by answering.

### 1.3 `describeStrategy` sentence patterns (INP-02)

| Element | Rule / Setting / What it means (examples) |
|---|---|
| Instrument | Instrument · Nifty 50 · "Options on the Nifty 50 index" |
| Legs (1) | Trade · Buy options · "You pay the premium; most you can lose is the premium" (sell: "You receive the premium; losses can be much larger") |
| Option type | Option type · Call on the call signal, Put on the put signal / Call / Put |
| Strike | Strike · 100 points ITM · "Call 100 below the at-the-money strike; put 100 above" |
| Expiry | Expiry · Current weekly · "The nearest weekly contract" |
| Timeframe | Chart · 15-minute candles |
| Holding | Holding · Intraday · "Closed by 15:15 the same day" |
| Size | Size · 2 lots × 65 = 130 quantity |
| Indicator | (listed under Entry) "EMA 9 (close)", "Supertrend 10 × 2", "ADX 14", "MACD 12/26/9", "Bollinger 20, 2 SD (close)" |
| compare | "RSI 14 is above 55"; with offset: "Close is above EMA 9 + 10 points" |
| cross | "EMA 9 crosses above EMA 21" |
| state / turns | "Supertrend is green" / "Supertrend turns green" |
| slope | "ADX 14 is rising (vs 1 candle ago)" |
| all / any | Nested bullet list: "All of:" / "Any of:" |
| at_time | "At 09:20" / "At 09:30, if …" |
| Stop-loss | "30% of premium" · "Bought at ₹100 → exit at ₹70" · "30 premium points" · "Trigger candle's low (bought) / high (sold)" |
| Target | "50% of premium" · "1.5 × the stop distance" |
| Time exit | "15:00 on the entry day" / "12:00 on expiry day" / Intraday square-off line |
| Hold to expiry | "Held until expiry, settled at expiry value" |
| Advanced (each of 12, from `advanced-options.json`) | used: e.g. "Daily limits · Max 2 trades a day"; off: "· Not used" |

Overrides (`whatItMeans` from templates, feature 05) replace the third column per rule key. A unit test iterates every schema node type and every advanced option (INP-02).

### 1.4 Builder layout (INP-04–07)

```
Desktop                                              Phone
┌ Steps ────────┬ Step form ───────────────┬ Preview ┐   Step 2 of 4 · Strike   [▾ steps]
│ ✓ 1 Basics    │                           │ (live    │   form …
│ ● 2 Strike    │   …fields…                │ describe │   [Back] [Next]
│ ○ 3 Entry     │                           │ Strategy)│   (preview collapsed below)
│ ○ 4 Exit      │  [Back]  [Next]           │          │
│ ⌄ Advanced    │                           │          │
│ [Back to review] (if from review)          │          │
└───────────────┴───────────────────────────┴──────────┘
```

- `?step=basics|strike|entry|exit|advanced`. Navigating to a later incomplete step redirects to the first incomplete one (D4).
- **Next** is enabled when the step's completeness items are satisfied and `validate()` reports no problems for that step's fields.
- **Review strategy** appears when completeness is empty and validation has no problems.

### 1.5 Step forms

| Step | Field | Control | Schema |
|---|---|---|---|
| Basics | Instrument | Read-only "Nifty 50" chip | `underlying` |
| | Buy / sell | Segmented | `legs[0].action` |
| | Option type | Segmented: Call · Put · Both | `option_type`: CE / PE / SIGNAL |
| | Expiry | Select (weekly options disabled with a note if the data period has none) | `legs[*].expiry` |
| | Timeframe | Select: 1, 3, 5, 15, 30, 60 min, 4 hours | `timeframe_min` |
| | Holding | Segmented | `holding` |
| | Lots / lot size | Number + Confirm (`ConfirmPrefill`), note from meta | `position.*`, `confirmed.*` |
| Strike | Moneyness, distance | Segmented + number (step 50) + live example from `strikes` helper mirroring the engine's rounding | `legs[*].strike` |
| Entry | Trigger | Radio (D6) + time input | `entry.at_time` |
| | Indicators | Indicator manager (§1.6) | `indicators` |
| | Conditions | Condition editor (§1.7) per side | `entry.ce/pe/all_legs` |
| Exit | Stop-loss | Type select (% · points) + value | `exit.stop_loss` |
| | Target | Optional: type (% · points) + value | `exit.target` |
| | Time exit | Optional: time + day (entry day / expiry day for positional) | `exit.time_exit` |
| | Positional exit question | Radio, when required | `hold_to_expiry` / others |

### 1.6 Indicator manager (INP-12, 13; D1)
- **Add indicator** opens a picker. VWAP is listed disabled with the note (INP-13).
- Parameter fields start empty, with suggestion chips: EMA/SMA period 9 · 20 · 21 · 50 · 200; RSI 14; ADX 14; Supertrend 10 × 3, 10 × 2; MACD 12/26/9; Bollinger 20 × 2. Source defaults to nothing; chips "Close" etc.
- Hidden id = `type + params` (`ema9`, `st10x2`); a numeric suffix is added on clashes. Ids never render; the display name comes from `describe`.
- An indicator can be removed only after its conditions are removed, or the conditions are flagged (edge case).

### 1.7 Condition editor (INP-14; D2)

Row model → schema node:

| Row operator | Node |
|---|---|
| is above / below / at or above / at or below | `compare` gt / lt / gte / lte |
| crosses above / below | `cross` |
| turns green / red (Supertrend) | `turns` up / down |
| is green / red (Supertrend) | `state` up / down |
| is rising / falling over N candles | `slope` up / down, `lookback` N |

- Left operand: indicator output (an output picker for multi-output indicators), price (open/high/low/close), India VIX (close). Right operand: same, or a number.
- Optional margin: "+ N points" or "+ N %" on the right operand → `offset`.
- Groups: "All of" / "Any of" containers. **Add condition** and **Add group** inside each. Depth limit 4; 30 conditions per side (SEM-15). Up/down buttons reorder.
- Every row renders its sentence (from `describe`) beneath it, so the user reads back what they built.

### 1.8 Mirror from Call (INP-15; D3)
`mirror(ceTree)` deep-copies the tree and swaps: gt↔lt, gte↔lte, cross above↔below, turns/state up↔down, slope up↔down, offset sign (+x ↔ −x). Constants and indicator choices are copied unchanged. Numeric constants are flagged `needsReview` (highlighted until the user edits or confirms them). The result replaces the Put set after a confirm dialog.

### 1.9 Advanced section (INP-18–20; D5)
One accordion. Each option is a row with a switch (off) and, when on, empty required fields:

| Option | Fields | Schema |
|---|---|---|
| SL cap | points | `advanced.sl_cap_pts` |
| Trigger-candle stop-loss | (switches the stop-loss type) | `exit.stop_loss.type = TRIGGER_CANDLE` |
| Risk-reward target | multiple | `exit.target = {RR}` |
| Trail stop to cost | at x R | `advanced.trail_to_cost_at_r` |
| Exit after N candles | N | `advanced.exit_after_candles` |
| Volatility sizing | measured at (day open / entry); bands editor (from–to, size %) with a coverage check | `advanced.vix_sizing` |
| Entry windows / No-entry windows | list of from–to | `advanced.entry_windows` / `no_entry_windows` |
| Expiry-day cutoff | time | `advanced.expiry_day_cutoff` |
| Daily limits | max trades, stop after N SL hits, max loss ₹ (each optional, at least one) | `advanced.daily` |
| Multiple legs | 2–4 leg editor (§1.10) | `legs` |
| Strike by delta / premium | per leg: target delta (0–1) / premium ₹ | `legs[*].strike` |

Turning an option off removes its keys (or restores the stop-loss/target type to empty for the two type switches, so the user must choose again).

### 1.10 Multi-leg editor (INP-20)
Rows: action, Call/Put, strike (moneyness + distance, or delta/premium if that option is on). The expiry is shared and taken from Basics. The entry trigger is restricted to fixed time or "all legs together when conditions are met" (`all_legs`). A note explains the combined stop-loss and target. Option type "Both (signal)" is disabled while multi-leg is on.

### 1.11 State
The builder edits `draft` in the store (`frontend.md` §4). There is no persistence. Leaving with unsaved changes triggers the `beforeunload` guard (feature 02).

### 1.12 Validation display (INP-03, 21)
`validate()` runs on every change (debounced 200 ms):
- Ajv errors are mapped by `instancePath` patterns in `fieldMap.ts` to a `BuilderFieldId`, with a plain-English message per keyword (e.g. `minimum` → "Must be at least {n}").
- SEM problems carry their rule id → field id and message from `strategy-rules.md`.
- Messages render beside the field and in the step's "still needed" list. Unknown paths fall back to the step-level list with a generic message, never a path.

## 2. Backend

**Not applicable.** The engine re-validates every request with the same schema and SEM rules (feature 01 T-ENG-07). The shared fixtures prove both sides agree.

## 3. Contract

- Uses `strategy.schema.json`, `strategy-rules.md` (messages), `advanced-options.json` (labels and order) and `fixtures/strategies/{valid,invalid}`. The web test suite runs all fixtures (REQ-INP-03).
- No contract change.

## 4. Error handling

| Situation | Behaviour |
|---|---|
| Ajv / SEM problem | Message beside the field; Next / Review disabled |
| Unknown validation path | Generic plain-English message in the step list (logged nowhere; dev-only console in development builds) |
| Meta not loaded | Lot-size note and expiry availability show "loading…"; Next on Basics waits for meta |

## 5. Testing strategy

| Area | Tests | ACs |
|---|---|---|
| Completeness | Unit: empty, one-line, positional-no-exit, pending condition, unconfirmed pre-fills | AC-INP-01 |
| describe | Unit over every node type and advanced option; ADX rule wording; overrides | AC-INP-02 |
| Validation parity | Shared fixtures valid/invalid with rule ids and messages, same as engine | AC-INP-03 |
| Navigation | Playwright: Next gating, sidebar forward-lock, `?step`, Edit from review, Back to review | AC-INP-04, 05 |
| Basics/Strike | Component: timeframe list, 4-hour note, live strike example, distance 75 → SEM-06 | AC-INP-06, 07 |
| Entry | Component + Playwright: three trigger modes, indicator manager (duplicates, chips, VWAP note), ADX rule build, depth limit | AC-INP-08, 09, 10 |
| Mirror | Unit + component | AC-INP-11 |
| Exit | Component: intraday note, positional question | AC-INP-12 |
| Advanced | Component: off by default, empty fields, removal, VIX band coverage; straddle via multi-leg equals the template | AC-INP-13, 14 |
| Field messages | Component: MACD SEM-05 beside fields | AC-INP-15 |

## 6. Consistency check

Checked against `constitution.md` (§2, §3, §4), `product.md` §6.1–§6.5, `frontend.md` §4–§7 and §6a, the contracts, and features 02 (review, Edit links, confirmations), 04 (completeness questions, pending conditions, `leftOut`) and 05 (template overrides, Customize). Findings:
- **Shared modules are owned here:** completeness, `describeStrategy` and validation are built in step 6 (needed by the review screen) ahead of the builder screens (step 8).
- D1 suggestion chips keep "no hidden defaults": nothing is filled until the user acts.
- D3 keeps thresholds unchanged when mirroring, so no value is guessed.
- No contradictions; no contract change.

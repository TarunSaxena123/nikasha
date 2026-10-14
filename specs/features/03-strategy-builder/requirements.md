# Feature 03 — Strategy Builder: Requirements

Status: **Approved under delegation 2026-10-14** (owner delegated approval of the remaining specs; decisions in §6 may be revisited) · Created 2026-10-14 · Prefix: **REQ-INP** · Layer: **frontend** (the engine re-validates; no new backend) · Priority: P0 for the shared modules (completeness, plain-English rules, validation), P1 for the builder's mandatory steps, P1 (8b) for advanced options

Implements [`product.md`](../../product.md) §6.1–§6.5 (inputs, advanced options, indicators, builder path), within [`frontend.md`](../../frontend.md) §6, §6a and [`contracts/`](../../contracts/) (strategy schema, SEM rules). Obeys [`constitution.md`](../../constitution.md) §2, §3, §4.

**This feature owns three shared modules** that other features use: the **completeness check** (which mandatory inputs are missing; used by 02 and 04), **`describeStrategy`** (plain-English rules; used by 02, 05 and the PDF) and **client-side validation** (Ajv + SEM rules; used by 02).

---

## 1. User stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-INP-1 | trader | to build my strategy step by step without code | I can test rules I have in my head |
| US-INP-2 | trader | to use any of the supported indicators, several times with different settings | I can express my real rules |
| US-INP-3 | trader | advanced options hidden until I want them, and never switched on for me | the test is exactly my strategy |
| US-INP-4 | trader | to see the strike I'd get as I choose it | I don't misread ITM/OTM |
| US-INP-5 | any user | to be stopped, with a clear reason, if something required is missing or inconsistent | I don't run a broken test |

## 2. Requirements

### 2.1 Shared modules

| ID | Requirement |
|---|---|
| REQ-INP-01 | THE web app SHALL provide one completeness check that, for any draft, lists which of the 13 mandatory inputs (`product.md` §6.1) are missing or unconfirmed, each with a plain-English name and a fixed question — including the positional exit question (hold until expiry / exit at a set time on expiry day / set a target / exit after N candles) when holding is Positional and no exit is set. |
| REQ-INP-02 | THE web app SHALL provide `describeStrategy`, which turns any valid or partial strategy into Rule / Setting / What it means rows using fixed sentence patterns for every schema element, plus a "Not used" row for every advanced option that is off. |
| REQ-INP-03 | THE web app SHALL validate strategies with the same `strategy.schema.json` (Ajv) and the same SEM rules as the engine, with the same plain-English messages, proven by the shared fixtures. |

### 2.2 Builder structure

| ID | Requirement |
|---|---|
| REQ-INP-04 | THE builder (`/build`) SHALL have four mandatory steps — **1 Basics**, **2 Strike**, **3 Entry**, **4 Exit** — and a collapsed **Advanced options** section, with the current step in the URL (`?step=`). |
| REQ-INP-05 | WHILE a mandatory step is incomplete or invalid, THE builder SHALL keep **Next** disabled and name what is missing; the user may go back to any step and forward only to steps already completed. |
| REQ-INP-06 | WHEN opened from a template (Customize) or from the review screen (Edit), THE builder SHALL load that draft, open the requested step, and offer **Back to review** when it came from review. |
| REQ-INP-07 | WHEN all mandatory steps are complete, THE builder SHALL offer **Review strategy**, which opens the review screen (feature 02). |

### 2.3 Step 1 — Basics

| ID | Requirement |
|---|---|
| REQ-INP-08 | Step 1 SHALL ask: instrument (Nifty 50, shown pre-selected as the only option), buy or sell, option type (Call / Put / Both — Call on the call signal, Put on the put signal), expiry (current weekly / next weekly / monthly), candle timeframe (1, 3, 5, 15, 30 or 60 minutes, or 4 hours), holding (Intraday / Positional), number of lots (pre-filled 1) and lot size (pre-filled 65 with the profile's note), each pre-fill with a Confirm control. |
| REQ-INP-09 | WHERE 4-hour candles and Intraday are both chosen, Step 1 SHALL show the note that only the 13:14 candle close can trigger entries. |

### 2.4 Step 2 — Strike

| ID | Requirement |
|---|---|
| REQ-INP-10 | Step 2 SHALL ask ATM / ITM / OTM and, for ITM or OTM, the distance in points in steps of the strike interval (50), and SHALL show a live example for the chosen option type(s), e.g. "Nifty at 24,500 → 100 points ITM Call = 24,400 CE; Put = 24,600 PE". |

### 2.5 Step 3 — Entry

| ID | Requirement |
|---|---|
| REQ-INP-11 | Step 3 SHALL ask when a trade starts: **when conditions are met**, **at a fixed time**, or **at a fixed time, if conditions are met** (D6). |
| REQ-INP-12 | THE builder SHALL let the user add indicators — EMA, SMA, RSI, ADX, Supertrend, MACD, Bollinger Bands — any number of times (up to 20) with their own parameters, shown by name and parameters (e.g. "EMA 9 (close)"), never by internal id; parameter fields start empty, with common values offered as one-tap suggestions (D1). |
| REQ-INP-13 | THE indicator list SHALL show **VWAP** as unavailable, with the note: "VWAP isn't available for Nifty 50. VWAP is calculated from traded volume, and Nifty 50 is an index, not a traded stock, so its chart has no volume and no VWAP." |
| REQ-INP-14 | THE builder SHALL let the user write conditions as sentence-style rows — *[indicator output / price / India VIX / number] [is above · is below · is at or above · is at or below · crosses above · crosses below · turns · is · is rising · is falling] [operand] [optional margin in points or %] [over N candles, for rising/falling]* — combined in **All of** / **Any of** groups, nested up to 4 levels. |
| REQ-INP-15 | WHERE option type is Both, THE builder SHALL show separate Call and Put condition sets, with a **Mirror from Call** action that fills the Put set with the mirrored conditions (above↔below, crosses above↔crosses below, turns up↔down, rising↔falling) for the user to check (D3). |
| REQ-INP-16 | WHERE option type is Call (or Put) only, THE builder SHALL show only that condition set. |

### 2.6 Step 4 — Exit

| ID | Requirement |
|---|---|
| REQ-INP-17 | Step 4 SHALL ask the stop-loss (% of premium, premium points, or — under Advanced — trigger candle) and, as the exit rule, a target (% or points; R:R under Advanced) and/or a time exit; for Intraday it SHALL state that the 15:15 square-off already counts as a time exit; for Positional with neither, it SHALL ask the positional exit question (REQ-INP-01). |

### 2.7 Advanced options

| ID | Requirement |
|---|---|
| REQ-INP-18 | THE Advanced section SHALL list every advanced option (`product.md` §6.2) with a switch that is **off** by default; turning one on SHALL reveal its fields **empty** (no pre-filled values) and make them required; turning it off SHALL remove it from the draft. |
| REQ-INP-19 | THE Advanced section SHALL support: SL cap; trigger-candle stop-loss; risk-reward target; trail stop to cost at xR; exit after N candles; volatility (VIX) sizing with bands that must cover every VIX level; entry windows; no-entry windows; expiry-day cutoff; daily limits (max trades, stop after N stop-loss hits, max daily loss); 2–4 legs; strike by delta or by premium. |
| REQ-INP-20 | WHERE 2–4 legs are chosen, THE builder SHALL ask buy/sell, Call/Put and strike for each leg, use one shared expiry, offer only "at a fixed time" or "all legs together when conditions are met" entries, and explain that stop-loss and target apply to the combined position. |

### 2.8 Validation feedback

| ID | Requirement |
|---|---|
| REQ-INP-21 | WHEN a value breaks a schema limit or a SEM rule, THE builder SHALL show that rule's plain-English message next to the field (field labels, never paths or ids). |

## 3. Acceptance criteria

| AC | Req. | Given / When / Then |
|---|---|---|
| AC-INP-01 | 01 | **Given** an empty draft, **then** completeness lists all 13 inputs; **given** the one-line sample after extraction, **then** it lists holding, expiry, lots, lot size; **given** Positional with no exit, **then** the positional exit question is listed. |
| AC-INP-02 | 02 | **Given** every schema element in the fixtures, **then** `describeStrategy` produces a sentence for each, and the advanced sample renders the ADX rule in words, not as a formula; no internal key appears. |
| AC-INP-03 | 03 | **Given** the shared fixtures, **then** the web validator agrees with the engine on every valid and invalid fixture, with the same rule and message. |
| AC-INP-04 | 04, 05 | **Given** Step 1 with lot size unconfirmed, **then** Next is disabled and "Lot size — please confirm" is shown; clicking the Strike step in the sidebar is not possible until Basics is complete. |
| AC-INP-05 | 06 | **Given** Edit on the stop-loss line in review, **then** the builder opens at Exit with the draft and shows Back to review. |
| AC-INP-06 | 08, 09 | **Given** Step 1, **then** the timeframe list is exactly 1, 3, 5, 15, 30, 60 min and 4 hours; choosing 4 hours + Intraday shows the 13:14 note. |
| AC-INP-07 | 10 | **Given** ITM 100 and Both, **then** the example reads "Nifty at 24,500 → 100 points ITM Call = 24,400 CE; Put = 24,600 PE"; a distance of 75 shows SEM-06's message. |
| AC-INP-08 | 11, 14 | **Given** "at a fixed time, if conditions are met" with 09:30 and RSI 14 > 55, **then** the draft has `at_time` and the condition; the review reads both. |
| AC-INP-09 | 12, 13 | **Given** the indicator picker, **then** EMA can be added twice (9 and 21) and shows as "EMA 9 (close)", "EMA 21 (close)"; RSI's period starts empty with a "14" suggestion; VWAP is disabled with the note. |
| AC-INP-10 | 14 | **Given** the condition editor, **then** the advanced sample's ADX rule can be built as Any of [All of (ADX > 20, ADX is rising over 1 candle), ADX > 30]; a fifth level of nesting is refused. |
| AC-INP-11 | 15, 16 | **Given** Both with CE conditions [EMA 9 crosses above EMA 21, RSI > 55], **when** Mirror from Call is clicked, **then** PE has [EMA 9 crosses below EMA 21, RSI < 55], with 55 highlighted for the user to check and change (e.g. to 45), because mirroring a threshold would be a guess. |
| AC-INP-12 | 17 | **Given** Intraday, **then** Exit says the 15:15 square-off counts as the time exit and only the stop-loss is required; **given** Positional with neither target nor time exit, **then** the positional exit question appears. |
| AC-INP-13 | 18, 19 | **Given** Advanced, **then** every option is off; turning on "SL cap" shows an empty required field; turning it off removes it from the draft; VIX sizing with a gap between bands shows SEM-12's message. |
| AC-INP-14 | 20 | **Given** 2 legs (sell CE ATM, sell PE ATM) at 09:20, **then** the draft matches the short straddle template and the combined stop-loss note is shown. |
| AC-INP-15 | 21 | **Given** MACD fast 26 and slow 12, **then** the SEM-05 message appears beside the MACD fields. |

## 4. Edge cases

| Case | Expected | Req. |
|---|---|---|
| User removes an indicator used by a condition | The condition rows using it are flagged and Next is disabled until fixed (SEM-03) | 05, 21 |
| Option type changed from Both to Call | The Put set is kept hidden (not deleted) until the user leaves the builder; only the Call set is in the draft | 15, 16 |
| Switching Intraday → Positional with a time exit on ENTRY_DAY | Kept; the positional exit question is not asked (a time exit exists) | 17 |
| Draft from upload with a pending `turns`/`state` choice | Cannot reach the builder before the question is answered (feature 04) | 06 |
| Very long condition list | Up to 30 conditions per side (SEM-15); then "add" is disabled with the reason | 14 |

## 5. Out of scope

Multi-timeframe conditions; custom indicators; saving strategies; drag-and-drop condition reordering (up/down buttons only).

## 6. Clarify gate — decisions (taken under the owner's delegation, 2026-10-14; may be revisited)

| # | Question | Decision |
|---|---|---|
| D1 | Indicator parameters: empty or pre-filled? | Empty, with common values as one-tap suggestion chips (e.g. RSI 14; EMA 9, 21, 50, 200; Supertrend 10 × 3; MACD 12/26/9; Bollinger 20 × 2). Nothing is filled until tapped or typed (constitution §3). |
| D2 | Condition editor | Sentence-style rows inside All of / Any of groups, nested up to 4, with up/down buttons; no drag-and-drop. |
| D3 | Mirroring Call → Put | An explicit **Mirror from Call** action; directions flip, numeric thresholds are copied unchanged and highlighted for review (mirroring 55 → 45 would be a guess). |
| D4 | Step navigation | Back freely; forward only to completed steps; sidebar shows each step's status. |
| D5 | Advanced options | One collapsed section; every option off with empty fields when switched on. |
| D6 | Fixed time vs conditions | Three-way choice: conditions / fixed time / fixed time if conditions are met. |

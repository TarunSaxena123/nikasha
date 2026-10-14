# Nikasha — Product Specification

Status: **Approved 2026-10-14** · Created 2026-10-14 · Owner: Tarun (solo) · Deadline: **2026-10-16**

> Nikasha (Sanskrit: *touchstone*, the stone used to test whether gold is genuine).
> **"The touchstone for your trading strategy."**

This is the complete product requirement set in one file. It obeys [`constitution.md`](constitution.md). Detailed, testable requirements (EARS, with IDs) live in each feature folder under [`features/`](features/); this file defines what those features must collectively achieve and the rules they share. Architecture, frontend and backend specifics live in [`architecture.md`](architecture.md), [`frontend.md`](frontend.md) and [`backend.md`](backend.md).

---

## 1. Problem

Retail traders in Indian derivatives (index options such as Nifty 50, Bank Nifty and Sensex, and commodity options on MCX such as crude oil) often trade strategies built on indicators, rules and gut feel, without knowing how those strategies would have performed historically. Their strategies usually exist as informal notes with vague rules ("exit if it closes decisively below", "reduce size significantly") that cannot be tested as written. Existing tools can run backtests, but they mostly report *how* a strategy performed, not *why* it worked or failed, whether the result is overfit, or how it could be improved. Beginners face a bigger gap: they don't know the terminology and have no safe way to learn why most strategies fail.

## 2. Goal

Turn any options strategy — an uploaded document, a guided build, or a template — into a precise, validated strategy; backtest it on historical data with modelled option premiums; and explain, in plain English and risk-first, when and why it works or fails, whether it is overfit, and how changes would have affected it.

Pitch: *Existing tools tell you how a strategy performed. Nikasha explains why, warns when results are overfit, and suggests how to improve it.*

## 3. Users

| User | Who | Needs | Primary path |
|---|---|---|---|
| **Trader** (primary) | Trades Nifty options; knows indicators, strikes, SL/target; has a strategy in their head or in a document | Test their exact rules without coding; be asked about anything vague; understand why results look the way they do; see whether a result is overfit | Document upload + clarification, or guided builder |
| **Beginner** (secondary) | New to options; unfamiliar with terms like ATM, premium, VIX | Run a ready-made strategy with one click; read a plain-English explanation; learn why strategies fail through simple what-if experiments | Template gallery |

Neither user ever sees JSON, code or schemas (constitution §4).

## 4. Existing solutions and differentiation

Other platforms already offer strategy builders and backtests, some with real option data and plain-English strategy input. Nikasha does **not** claim to be first of its kind, and no other product is named anywhere (constitution §9). Nikasha differentiates on:

1. **Document upload + clarification** — any wording; the system never guesses, it asks.
2. **Explanation** — a plain-English summary of when and why the strategy worked or failed.
3. **Regime analysis** — results split by volatility band and by trending vs sideways markets.
4. **Overfitting check** — results on an unseen period, with a "possibly overfit" flag.
5. **Improvement suggestions** — edited copies of the strategy re-run and compared side by side, each with a plain-English reason, worded as past simulated results.
6. **Beginner learning mode** — templates, glossary, risk-first reports, what-if sliders.
7. **One workflow across instruments** — designed so Bank Nifty, Sensex and MCX commodities can be added by configuration (future).

## 5. Scope

### 5.1 In scope (MVP)

| # | Capability | Feature folder | Req. prefix |
|---|---|---|---|
| 1 | Data loading, load-time checks, gap rules, instrument profiles, indicators, option pricing, backtest simulation | `01-data-and-engine` | REQ-DAT, REQ-ENG |
| 2 | Review & Evaluate screen, progress screen, report, PDF/CSV download | `02-evaluation-and-report` | REQ-EVL, REQ-RPT |
| 3 | Minimum mandatory inputs, guided builder, strike selection, advanced options | `03-strategy-builder` | REQ-INP |
| 4 | Document upload, rule extraction, Found / Vague / Missing / Unsupported, clarifying questions | `04-document-upload` | REQ-UPL |
| 5 | Templates, glossary, tooltips, educational content, what-if sliders | `05-beginner-mode` | REQ-BEG |
| 6 | Parameter sweeps, regime filters, alternatives, overfitting guard | `06-suggestions` | REQ-SUG |
| 7 | Zero storage, disclaimer, trademark notice, data-source disclosure | `07-privacy-and-legal` | REQ-PRV |

MVP instrument: **Nifty 50 index options only.** The design must support more instruments without engine changes (§8).

### 5.2 Out of scope (MVP)

- Instruments other than Nifty 50 (the design supports them; none are shipped)
- Live trading, broker integration, live signals or alerts
- Real option-chain or option-premium data
- User accounts, login, saving or loading strategies or results, sharing links
- Position adjustments and rolling
- Margin modelling (option selling margin is not simulated or required)
- Languages other than English

### 5.3 Future scope

Bank Nifty, Sensex, then MCX crude and other commodities; Black-76 and historical-volatility pricing; cross-instrument comparison; real option-premium data; moving the engine to a long-term host before the AWS Free plan ends.

---

## 6. Strategy inputs

### 6.1 Minimum mandatory inputs

The same rule applies to every entry path (upload, builder, template). A strategy can be evaluated once all of these are known. A missing one is always asked for; it is never defaulted.

| # | Input | Allowed values / example | Notes |
|---|---|---|---|
| 1 | Instrument | Nifty 50 | Pre-selected in MVP (only one profile ships); shown, not asked |
| 2 | Trade action | Buy options / Sell options | |
| 3 | Option type | CE, PE, or both | "Both" = CE on the CE condition, PE on the PE condition |
| 4 | Strike moneyness | ATM / ITM / OTM | |
| 5 | Strike distance from spot | Points, e.g. 100 | Required when ITM or OTM; must be a multiple of the strike interval (Nifty: 50). Any other value is not rounded; the user is asked to correct it (SEM-06) |
| 6 | Expiry | Current weekly / next weekly / monthly | Weekly choices only valid from the first weekly expiry in the data period (§7.4) |
| 7 | Candle timeframe | 1, 3, 5, 15, 30 or 60 minutes, or 4 hours | Candles are anchored at 09:15, so a 4-hour day has two candles: 09:15–13:14 and a short 13:15–15:29 (§7.1) |
| 8 | Holding type | Intraday / Positional | **Intraday: any open position is squared off at 15:15** |
| 9 | Number of lots | Integer ≥ 1, **pre-filled 1** | Must be confirmed |
| 10 | Lot size | Integer ≥ 1, **pre-filled 65** (current NSE Nifty lot, from the instrument profile) | Must be confirmed; applied uniformly to the whole backtest |
| 11 | Entry trigger | ≥ 1 indicator condition per enabled side, a fixed entry time (e.g. 09:20), or both | An entry happens only when the **entire strategy is satisfied** (§7.2). If both indicator conditions and a fixed time are given, both must hold |
| 12 | Stop-loss | % of premium, premium points, or trigger-candle low/high | |
| 13 | Exit rule | A target or a time-based exit | Intraday: the 15:15 square-off counts as the time exit. **Positional with no target or time exit: the user is asked** "Your strategy has no target or time exit. What should happen to an open position?" — choices: **Hold until expiry** (settled at expiry), **Exit at a set time on expiry day** (user enters the time), **Set a target**, **Exit after a number of candles**. Nothing is chosen for the user |

"Pre-filled" means shown with a value the user must actively confirm; it is not a silent default (constitution §3).

### 6.2 Advanced options — OFF unless set

None has a default value; none is pre-filled; none is asked about unless the user's own text mentions it vaguely. Each is shown as **"Not used"** on the review screen and in the report when off.

SL cap · trigger-candle SL · risk-reward (R:R) targets · trail SL to cost at xR · exit after N candles · volatility-band (VIX) sizing · entry windows · no-entry windows · expiry-day cutoff time · daily limits (max trades, stop after N SL hits, max daily loss) · 1–4 legs · strike by delta or by premium.

### 6.3 Evaluation settings

Not strategy rules, but the engine needs a value. Shown upfront on the review screen with pre-filled, editable values; never applied silently; always listed in the report.

| Setting | Pre-filled value |
|---|---|
| Transaction costs | Per §7.6 |
| Backtest period | The full range available for the chosen expiry type (§7.7). The user can change it with quick choices (full range, last 1 year, last 3 years, last 5 years) or a custom start and end date, limited to the data's actual range |
| Capital (optional) | Empty. If given, % returns and % drawdown are also reported; otherwise results are in ₹ only |

### 6.4 Supported indicators and conditions

- Indicators (each with parameters; multiple instances allowed): Supertrend, EMA, SMA, RSI, ADX, MACD, Bollinger Bands.
- **VWAP is not offered, and the user is told why** wherever they might look for it: in the builder's indicator list (a disabled "VWAP" entry with the note), in upload results (listed as Unsupported with the same note), and in the glossary. The note: *"VWAP isn't available for Nifty 50. VWAP is calculated from traded volume, and Nifty 50 is an index, not a traded stock, so its chart has no volume and no VWAP."* Inputs may also reference candle open/high/low/close and India VIX.
- Operators: `>`, `<`, `>=`, `<=`, crosses above, crosses below, turns (state flip, e.g. Supertrend turns green), slope up / slope down over N candles.
- CE and PE have separate condition sets. **Every condition the user lists for a side must be true at the same time** (they are joined by AND). OR is used only where the user's own rule says "or" or is built from alternatives — e.g. the advanced sample's ADX rule, *"ADX > 20 and rising; if ADX is above 30, the slope doesn't matter"*, is stored as *(ADX > 20 AND ADX rising) OR ADX > 30*. At ADX exactly 30 it must be rising. The review screen shows it in the user's own wording, not as a formula. How many candles "rising" is measured over is still asked (§6.7). Groups can nest (AND inside OR inside AND).
- If it is unclear whether the user meant "and" or "or", the system asks (constitution §2); it never assumes OR.
- Anything outside this vocabulary is **Unsupported** and is listed to the user, never silently dropped.

### 6.5 Intro page, getting started, and entry paths

**Intro page (home, `/`).** The first thing every visitor sees. It explains Nikasha before asking anything of the user, and can be read **without accepting the disclaimer** (§11.1). Sections, in order:

1. **Hero:** name, tagline, one sentence on what Nikasha does (test a Nifty 50 options strategy on past data and see *why* it worked or failed), and a **Get started** button.
2. **What Nikasha is:** four steps — describe your strategy → we ask about anything unclear → we test it on past data → we explain the results.
3. **How it helps:** never guesses (asks instead); explains when and why it worked or failed; risk shown before profit; checks results on a period it wasn't tuned on (overfitting); learn as you go (templates, glossary, what-if).
4. **How to get the best from it:** short tips — write exact numbers ("SL 30 points", not "tight SL"); start with the full period, then narrow it; read the risk section before the profit; trust results that hold up on the unseen period; few trades means little evidence; use what-if sliders to see how fragile a rule is; keep the tab open and download the PDF before closing. Links to a fuller "How to use Nikasha" guide in Learn.
5. **What Nikasha is not:** not investment advice; no live signals; option prices are modelled, not real; past results don't predict the future.
6. **Your data and our data:** nothing you enter is stored; data source and date range (read from the data); link to the full disclaimer.
7. **Get started** button again.

Copy follows §11.3 and the constitution: no "first of its kind" claims, no other product names, no profit promises, dates read from the data.

**Getting started flow.**

```
First visit:      Intro (/) ─[Get started]─► Disclaimer + "I agree" ─► Choose a path (/start)
Returning visit:  Intro (/) ─[Get started]─► Choose a path (/start)
```

**Choose a path (`/start`)** shows the three entry paths with guidance on which suits whom: new to options → Templates; rules in your head → Guided builder; rules written down → Upload.

| Path | Summary | Feature |
|---|---|---|
| Template | Choose a ready-made strategy with all mandatory inputs set. The card shows the lots, lot size, costs and period it will use; **Use this template** opens the review screen with exactly those confirmed, so **one click on Evaluate Strategy** runs it. "Customize" opens it in the builder | 05 |
| Guided builder | Step 1 Basics → Step 2 Strike → Step 3 Entry → Step 4 Exit, then optional collapsed Advanced options; cannot continue past an incomplete mandatory step | 03 |
| Document upload | PDF, DOCX, TXT or pasted text → LLM extracts rules → each marked Found / Vague / Missing / Unsupported → one simple question per missing mandatory input or vague rule (multiple choice where possible) → review | 04 |

All paths end at the same **Review & Evaluate** screen: plain-English rules table, evaluation settings, advanced options marked "Not used", every line editable, and an **Evaluate Strategy** button that is disabled — with a message naming what is missing — until the strategy is complete and valid.

### 6.6 Templates

| Template | Summary | Priority |
|---|---|---|
| Simple Trend Follower | 15-min; buy ATM CE when EMA 9 crosses above EMA 21, ATM PE when it crosses below; current weekly; intraday; SL 30% of premium; target 50%; entry window 09:30–14:30; max 2 trades/day; 1 lot × 65 | P0 — also the engine's reference test strategy |
| Higher-Timeframe Trend | 1-hour candles; buy ATM CE when EMA 9 crosses above EMA 21 **and** ADX 14 > 20, ATM PE on the mirror; next weekly; positional; SL 30% of premium; target 60%; time exit 12:00 on expiry day; 1 lot × 65 | P1 |
| Simple short straddle | 5-minute candles; sell ATM CE + ATM PE at 09:20; current weekly; intraday (15:15 square-off); **combined stop-loss 30% of the combined premium** (§7.2); no target; 1 lot × 65 | P2 — built last among templates; **first thing cut** if time runs short |

Each template shows a plain-English explanation and a rules table (Rule / Setting / What it means). Advanced options a template turns on are shown as part of its rules.

### 6.7 Reference test strategies

These must be expressible in the strategy schema and are used as test fixtures:

- **Simple Trend Follower** (above).
- **Advanced sample** — `samples/nifty_weekly_options_strategy.pdf`. The clarification flow must catch at least: "closes decisively above" (threshold in points or %?); SL cap "30–35" (one number); VIX > 18 "reduce significantly" (exact %); "Supertrend turns green" (flip candle only, or any candle while green?); ADX "slope up" (over how many candles?); "Thursday" (→ expiry day, because the expiry weekday changed in Sep 2025); "Pre-market 09:00 VIX" (→ 09:15 open, the earliest data available — §7.5); and the unstated mandatory inputs: holding type, lots, lot size, expiry (weekly implied by title — confirm). The trailing footer line ("For medical advice or diagnosis, consult a professional…") is not a trading rule and must be ignored without a question.
- **One-line sample** — `samples/one_line_strategy.txt`: *"Buy ATM Nifty call when RSI 14 crosses above 60 on 5-minute chart, stop-loss 30%."* The system asks only for: holding type, expiry, lots (confirm), lot size (confirm), and — **only if the user chooses Positional** — what should happen to an open position, since no target or time exit is given (§6.1, input 13). If the user chooses Intraday, the 15:15 square-off is the time exit and nothing more is asked. The PE side is not used. Nothing about advanced options is asked.

---

## 7. Simulation rules and assumptions

These rules are fixed product behaviour. Every report discloses them (in a short "How this was simulated" section) so results are never misread.

### 7.1 Candles and indicators
- Candles are built from the 1-minute bars that exist, anchored at session open (09:15). The last candle of the day may be short (1-hour: 15:15–15:29; 4-hour: 13:15–15:29). With 4-hour candles an intraday strategy can only act on the 13:14 close, because the day's second candle closes after the 15:15 square-off; the review screen points this out.
- Indicators are computed continuously across days (no daily reset).
- An indicator value is used only after its warm-up period is complete.

### 7.2 Signals and fills
- **An entry is taken only when the entire strategy is satisfied at that moment.** For a side (CE or PE), all of the following must be true together; if any one fails, there is no entry and no partial or later "catch-up" entry:
  1. **Entry conditions:** the side's full condition set is true on the closing candle (§6.4).
  2. **Entry time:** if a fixed entry time is set, it is that time (for a fixed-time-only strategy, this is the trigger).
  3. **Every advanced rule the user turned on** allows a new entry: entry window, no-entry window, expiry-day cutoff, max trades per day, stop after N stop-losses, max daily loss.
  4. **Holding rules:** no position is already open (one at a time, below); for intraday, the entry is before the 15:15 square-off.
  5. **Contract and data:** the chosen expiry exists on that date (e.g. no weekly expiry before 11 Feb 2019), and the entry minute has both Nifty and VIX data so the option can be priced (§7.9). **Positional:** the contract's expiry day must be inside the data, because the position may have to be closed that day (the data ends 2026-05-14, before the 19 May 2026 expiry). Such signals are skipped and counted.
  6. **Exit rules can be set:** every stop-loss and target the strategy needs can be calculated at entry (e.g. trigger-candle SL needs that candle's modelled premium; an SL cap applies on top). If a trigger-candle stop would sit on the wrong side of the entry price, the trade is skipped (no fallback to the cap).
  7. **One clear side:** for option type "both", if the Call and Put conditions are true on the same candle, neither is entered (picking one would be a guess).
  8. **Same-day fill:** the fill must happen on the signal's trading day. A positional signal on the day's last candle is not filled the next morning (that would be a catch-up entry after an overnight gap).
- Signals are evaluated on candle close. An entry fills at the **next minute's open** modelled premium. If that minute cannot be priced, the entry is skipped (it is not moved to a later minute, because the strategy was satisfied at the candle close, not later).
- Fixed-time entries fill at that minute's open premium.
- Stop-loss and target are checked on every 1-minute bar using the modelled premium. If both are hit in the same minute, **the stop-loss is assumed to have been hit first** (conservative).
- The report counts entries that were skipped and why (e.g. "14 signals skipped: daily trade limit reached"), so a low trade count is never a mystery.
- **One position at a time** per strategy (a multi-leg position counts as one). A signal on the opposite side while a position is open is ignored.
- **Intraday:** any open position is squared off at **15:15**.
- **Positional:** positions carry overnight. At the next day's first priced minute, stops and targets are checked against that price, so a gap can fill worse than the stop level. The exit is whatever the user chose (target, time exit, N candles, or hold until expiry — asked if not given, §6.1 input 13). An option cannot outlive its contract, so a position still open on its expiry day is **settled at intrinsic value** using the expiry day's 15:29 spot close (Nifty options are cash-settled). When the user chose "Hold until expiry", this is their stated exit.
- **Multi-leg positions** (e.g. the short straddle) are one position: **stop-loss and target apply to both legs combined**, and all legs exit together. Combined entry premium = the sum of the legs' entry premiums. A % stop-loss triggers when the position's combined loss reaches that % of the combined entry premium (e.g. selling CE ₹100 + PE ₹100 with SL 30% → exit both when the combined loss reaches ₹60 per unit). A points stop-loss uses the combined loss in points; targets work the same way for profit.

### 7.3 Strike selection
- ATM strike = spot rounded to the nearest strike interval (Nifty: 50, from the instrument profile); an exact half rounds up (spot 24,525 → ATM 24,550).
- ITM / OTM: **apply the point distance to the ATM strike.** Example: spot 24,523 → ATM 24,500 → 100 points ITM CE = 24,400 CE; 100 points ITM PE = 24,600 PE.
- Required acceptance example: Nifty at 24,500, ITM 100, Call → **24,400 CE**.

### 7.4 Expiry calendar
Derived from rules in the instrument profile plus the trading days present in the data — no external holiday list.

Nifty 50 expiry history over the data period (2015-01-09 → 2026-05-14):

| Period (by contract expiry date) | Weekly expiry | Monthly expiry | Source |
|---|---|---|---|
| Up to 10 Feb 2019 | None (weekly options did not exist) | Last Thursday | NSE |
| 11 Feb 2019 – 31 Aug 2025 | Every Thursday (first: 14 Feb 2019) | Last Thursday | NSE press release, 11 Feb 2019 (weekly options launch) |
| From 1 Sep 2025 | Every Tuesday (first: 2 Sep 2025) | Last Tuesday | SEBI circular, May 2025 (exchanges choose Tuesday or Thursday); NSE revision of expiry day, effective 1 Sep 2025 |

- A planned move to **Monday** (announced Mar 2025, effective 4 Apr 2025) was **deferred and never implemented**; Thursday continued until 31 Aug 2025.
- In the week of the monthly expiry, the monthly contract is that week's nearest expiry (NSE lists no separate weekly contract that week).
- If the scheduled expiry date is not a trading day, expiry moves to the **previous trading day**.
- Ad hoc holiday changes (e.g. Bakri Id 2023 moved from 28 to 29 June, so the June 2023 expiry became Wed 28 June) are captured automatically, because trading days come from the data, not a fixed holiday list.
- **Trading-day set** = days present in the data **plus regular sessions removed during cleaning** (the 2021-02-24 NSE halt day and 2026-05-15, which was cut off mid-day). These are not holidays and must not shift an expiry. Days whose only session was a Muhurat or mock/DR session are **not** regular trading days.
- The derived calendar is **spot-checked against known actual expiry dates** (including at least one holiday-shifted expiry and dates on both sides of the Sep 2025 change). The check and its result are recorded in [`features/01-data-and-engine/expiry-calendar-check.md`](features/01-data-and-engine/expiry-calendar-check.md); the engine's calendar must reproduce that list exactly (test-backed).
- **Data end:** the data ends on 2026-05-14 (Thursday); the next expiry (Tue 19 May 2026) lies beyond it. Positional entries whose expiry falls after the last data date are skipped (§7.2), so no trade is ever left open at the end of the data.

### 7.5 Option pricing (modelled premiums)
- No option-premium data exists, so premiums are modelled per minute by a **PricingProvider** chosen by the instrument profile.
- MVP provider: **Black-Scholes with India VIX as implied volatility** (VIX ÷ 100), spot, strike, time to expiry, and a configurable risk-free rate (**6.5% p.a.**, from the instrument profile, shown in Settings used).
- Every report shows a **"Premiums modelled, not actual"** badge and a **volatility sensitivity**: the same backtest re-run with VIX −2 and +2 points.
- Known limitation, stated in every report: VIX is a 30-day, near-ATM measure; volatility skew and expiry-day IV behaviour are not captured, so expiry-day results are the least reliable.
- "Pre-market" VIX rules use the **09:15 opening VIX**, the earliest value in the data; this substitution is disclosed.
- Within a minute, the premium's high and low come from Nifty's high and low at that minute's closing VIX; this detail is listed in the report's "How this was simulated" notes.

### 7.6 Transaction costs (pre-filled, editable)

Current rates are applied **uniformly across the whole backtest**, the same way lot size is, so results reflect today's cost of trading. Historical rate changes are not modelled; the report says so. Rates verified 2026-10-14.

| Charge | Rate | Applies to | Source |
|---|---|---|---|
| Brokerage | ₹20 per executed order | Every entry and exit order | Typical flat discount-broker fee (Nikasha assumption; user-editable) |
| Securities Transaction Tax (STT) | 0.15% of premium | Sell side | Finance Act 2026 (Union Budget 2026-27), effective 1 Apr 2026 (was 0.1%) |
| STT on exercise | 0.15% of intrinsic value | Long options held to expiry and settled in the money | Finance Act 2026, effective 1 Apr 2026 (was 0.125%) |
| Exchange transaction charges (NSE) | 0.03553% of premium | Both sides | NSE circular NSE/FA/73061 (27 Feb 2026) revision of the 1 Oct 2024 uniform rate (0.03503%) — **to re-confirm against the circular text before final release** |
| SEBI turnover fee | ₹10 per crore of premium | Both sides | SEBI (Regulatory Fee on Stock Exchanges) regulations |
| Stamp duty | 0.003% of premium | Buy side | Indian Stamp Act, 1899, as amended by Finance Act 2019 (uniform rates from 1 Jul 2020) |
| GST | 18% of (brokerage + exchange transaction charges + SEBI fee) | — | CGST/IGST Acts, 2017 |
| Slippage | 0.5 premium points per side | Every fill | Nikasha assumption (no order-book data); user-editable |

The exact formula, rounding and the order of applying charges are defined in `backend.md` and tested in `01-data-and-engine`.

### 7.7 Backtest period and overfitting split
- Default period: weekly expiries → 11 Feb 2019 (weekly options launch) to the last date in the data; monthly → first to last date in the data.
- A trade belongs to the period in which it was **entered**. A positional trade entered before the period end is followed to its exit even if that falls after the period end (the data allows this up to the last data date).
- Each report shows the **in-sample** and **out-of-sample** periods separately. Nifty: in-sample **2019–2023** (weekly) or **2015–2023** (monthly); out-of-sample **1 Jan 2024 – last date in the data**. Periods are configured per instrument profile.
- The split is applied **inside the period the user selected**. If the selected period lies entirely in one side of the split (e.g. last 1 year), the overfitting check cannot be made and the report says so instead of showing a flag.
- The suggestions engine tunes parameters only on the in-sample period and reports their effect on the out-of-sample period.
- **"Possibly overfit"** is flagged when out-of-sample expectancy per trade is **below 50% of in-sample**, or **changes sign**, with **≥ 30 trades in each period**. With fewer trades the report says **"too few trades to judge"** instead.

### 7.8 Position size and VIX-based sizing
- Quantity per trade = lots × lot size, the same for every trade in the backtest. (Acceptance example: 2 lots × 65 → every trade's P&L uses quantity 130.)
- VIX-based sizing (advanced, OFF unless set) uses the user's percentage per VIX band; the result is **rounded down to whole lots, minimum 1 lot**.
- **When a sizing rule has no effect because of the 1-lot minimum, the report says so** (e.g. "Half size on VIX < 12 had no effect: 1 lot cannot be reduced").

### 7.9 Data gaps
- Missing minutes are **never filled** (constitution §7).
- A minute with Nifty but no VIX cannot be priced: no entry or exit is evaluated there; a due exit moves to the next minute that has both.
- A whole day without VIX (2019-07-02) is skipped entirely for trading.
- Every report states how many days and minutes were skipped in the tested period.

---

## 8. Instruments

No instrument-specific logic is hardcoded (constitution §10). Each instrument is a profile file (e.g. `instruments/nifty50.json`) validated against `contracts/instrument.schema.json`, defining:

- **Identity:** symbol, name, exchange (NSE / BSE / MCX), segment
- **Session hours**, including MCX evening sessions; the intraday square-off time
- **Contract rules:** strike interval, suggested current lot size (pre-fill only), multiplier, tick size
- **Expiry rules:** dated rules for expiry types and weekdays, including historical changes and the first weekly expiry date
- **Underlying type:** spot index or futures contract
- **Volatility source:** India VIX for Nifty; historical volatility where no index exists
- **Pricing model:** which PricingProvider applies, and its parameters (e.g. risk-free rate)
- **Default costs** (§7.6)
- **Overfitting split periods** (§7.7)
- **Data file paths**

A strategy references its instrument by symbol (`NIFTY50`). The MVP ships one profile. A test must prove that a second, dummy profile and data file can be validated and backtested with **no engine code change**.

---

## 9. Data

### 9.1 Source and files

Source: Kaggle dataset **"NSE - Nifty 50 Index Minute data (2015 to 2026)"** — https://www.kaggle.com/datasets/debashis74017/nifty-50-minute-data — pre-cleaned into `data/`:

| File | Rows | Trading days | Range |
|---|---|---|---|
| `nifty50_1min_clean.csv` | 1,047,566 | 2,794 | 2015-01-09 09:15 → 2026-05-14 15:29 |
| `indiavix_1min_clean.csv` | 1,047,192 | 2,793 | 2015-01-09 09:15 → 2026-05-14 15:29 |

- Columns: `datetime, open, high, low, close`; IST; each row labelled by the minute's start (09:15 … 15:29, 375 bars on a full day); 2-decimal prices.
- Cleaning already done, and kept as-is: see `data/README.md` and `data/cleaning_report.json`, which are the **traceability record for cleaning**. The cleaning script `clean.py` referred to in those files **is not available and is recorded as missing**; it will not be recreated.
- Known gaps (left unfilled): Nifty 184 missing minutes over 28 days; VIX 183 over 27 days; **no VIX at all on 2019-07-02**; the files share 1,047,188 minutes (378 Nifty-only, 4 VIX-only).
- Weekend full sessions (budget days 2015-02-28, 2020-02-01, 2025-02-01, 2026-02-01; special session 2024-01-20) are normal trading days.
- The CSVs stay committed in git as they are. Parquet files are **generated at build time** by a conversion script in the repo and are git-ignored.

### 9.2 Date range is read, never hardcoded
The UI, every report and the disclaimer show the actual first and last timestamps read from the loaded data.

### 9.3 Load-time checks (mandatory)
Data provenance is unverified, so the loader re-checks every load: required columns, sorted unique timestamps, session hours, OHLC consistency, positive prices. Bad days are logged (technical detail only) and skipped; the loader never crashes on bad data.

### 9.4 Data rights
The Kaggle licence label is CC0 1.0, but the uploader states they do not own the data, collected it from the internet, and intend it for research only. NIFTY 50 is owned by NSE Indices Limited. Nikasha therefore uses the data for **educational, non-commercial** purposes only. Any public commercial use needs a licence from NSE Indices or an authorised vendor.

---

## 10. Report

Risk is shown at least as prominently as profit. **Every figure in the report is calculated only on trades in the backtest period the user selected**, and that period (start date – end date, number of trading days) is shown at the top of the report and of every download. Each report contains:

1. **Plain-English summary** — how the strategy performed over the selected period, and when and why it worked or failed, worded as past simulated results.
2. **Risk first** — max drawdown (₹, and % if capital given), worst losing streak, largest loss, then net P&L, **win rate** (winning trades ÷ all trades in the selected period), average win, average loss, expectancy per trade, number of trades.
3. **Equity curve** and drawdown chart across the selected period.
4. **Breakdowns:** by year (each year's trades, win rate and P&L); **by month** (a month-by-month P&L table); by VIX band at entry (**< 12, 12–18, 18–25, > 25**); by market regime (**trending / mixed / sideways**, from daily ADX(14) — ≥ 25 trending, < 20 sideways, else mixed — using the previous day's value to avoid look-ahead); by weekday and expiry day vs non-expiry day; CE vs PE.
5. **Overfitting check** — in-sample vs out-of-sample results and the flag (§7.7).
6. **Volatility sensitivity** — results at VIX −2 / +2 (§7.5).
7. **Settings used** — lots × lot size, costs, period, holding type, risk-free rate, and every advanced option marked used or "Not used"; rules that had no effect (§7.8); signals skipped and why (§7.2).
8. **How this was simulated** — the rules in §7, briefly.
9. **Data source** line (dataset name and the date range read from the data) and **data gaps** line (days/minutes skipped in the tested period).
10. **"Premiums modelled, not actual"** badge.
11. **Short disclaimer** (§11.2).

Downloads, generated **in the browser** (the result never touches server storage): the report as **PDF**, and optionally a **CSV of individual trades**; both include settings used, data source and the short disclaimer.

## 11. Legal

### 11.1 Full disclaimer
Shown, with an "I understand and agree" checkbox, the **first time a visitor clicks Get started** on the intro page, or opens any strategy page directly (templates, builder, upload, review, evaluation, report). **No strategy can be built, uploaded, evaluated or viewed until it is accepted**; after accepting, the visitor continues to the page they were heading for. Acceptance is remembered in the browser. The intro page, the full Disclaimer page and the Learn pages can be read without accepting; they carry the short disclaimer in the footer. The full text is also on a Disclaimer page linked from the footer, and in the README. Text, with dates filled from the data:

> **Disclaimer**
>
> Nikasha is an educational and research tool. It is provided solely to help users learn how trading strategies might have behaved on historical data.
>
> **Not SEBI-registered.** The creator of Nikasha is not registered with the Securities and Exchange Board of India (SEBI) as an Investment Adviser, Research Analyst or in any other capacity, and is not a stockbroker or financial planner.
>
> **Not investment advice.** Nothing on this platform, including reports, summaries, suggestions, templates and alternative strategies, is investment, financial, trading, tax or legal advice, or a recommendation or solicitation to buy, sell or hold any security, derivative or commodity. Suggestions describe how changes to hypothetical rules would have affected past simulated results; they are not trade recommendations.
>
> **Hypothetical results.** All results are simulated backtests on historical data. Option premiums are modelled, not actual market prices, and may differ materially from real prices. Backtests do not account for every real-world factor (including liquidity, slippage, order execution, margin requirements, and regulatory or market changes). Past or simulated performance does not guarantee future results.
>
> **Data source.** Historical Nifty 50 and India VIX 1-minute data covering [first date] to [last date] (filled in automatically from the data) is taken from the publicly available Kaggle dataset "NSE - Nifty 50 Index Minute data (2015 to 2026)" (https://www.kaggle.com/datasets/debashis74017/nifty-50-minute-data). As stated by its uploader, this dataset was collected from various internet sources and is provided for research purposes only; it is not an official NSE data feed. Nikasha uses it solely for non-commercial, educational purposes. The data has not been independently verified and may contain errors, gaps or inaccuracies, and all results depend on it.
>
> **Trademarks.** NIFTY 50 and India VIX are trademarks of NSE Indices Limited / National Stock Exchange of India Limited. Nikasha is not affiliated with, endorsed by or sponsored by NSE, NSE Indices Limited or SEBI.
>
> **Your data and privacy.** Nikasha does not store your strategies, uploaded files, evaluation results, session data or any personal data on its servers. Uploaded files are processed in memory only and discarded once your strategy has been read. To read uploaded strategy text, it is sent to a third-party AI service (Anthropic), which, under its published policy for API use, automatically deletes inputs and outputs within 30 days, except where longer retention is needed to enforce its usage policy or comply with the law; do not upload personal or confidential information. Results exist only in your open browser tab until you download them. The only thing remembered is your acceptance of this disclaimer, stored in your own browser on your device.
>
> **High risk.** Trading in derivatives (futures and options) involves substantial risk and can result in losses exceeding your initial capital. Such trading is not suitable for everyone.
>
> **Your responsibility.** You are solely responsible for your trading and investment decisions and for any resulting profits or losses. Before trading, consult a SEBI-registered investment adviser or other qualified professional.
>
> **No liability.** To the maximum extent permitted by law, the creator and contributors of Nikasha accept no liability for any direct, indirect, incidental or consequential loss or damage, including trading losses or lost profits, arising from the use of, or reliance on, this platform or its outputs.
>
> **No warranty.** The platform, data and results are provided "as is" and "as available", without warranties of any kind, including accuracy, completeness, or fitness for a particular purpose.
>
> By using Nikasha, you acknowledge that you have read, understood and agreed to this disclaimer.

The privacy sentence quotes Anthropic's commercial/API retention article (privacy.claude.com, article 7996866, last updated 1 Jul 2026, checked 2026-10-14). It must be re-checked before each release.

### 11.2 Short disclaimer
In the footer of every page (linking to the full disclaimer), on every report, on every suggestion panel, and in every download:

> Educational use only. Not SEBI-registered; not investment advice. Not affiliated with NSE. Results are simulated backtests on unofficial Nifty 50 and India VIX data from Kaggle ([first date] – [last date], read from the data) with modelled option prices, and do not guarantee future returns. Nikasha stores none of your data. You are solely responsible for your trading decisions and any profits or losses.

### 11.3 Behaviour matches the disclaimer
No live signals, no "buy now / sell now", no profit promises, no ranking of strategies as "best to trade"; suggestions are worded "this change would have…".

### 11.4 Note
A disclaimer reduces risk but does not make the product immune to legal challenge. It must be reviewed by a lawyer familiar with Indian securities law before any public or commercial launch.

---

## 12. Non-functional requirements

| Area | Requirement |
|---|---|
| **Privacy** | Constitution §5. No database, no server-side files, no accounts, no session data, no analytics or tracking cookies. Request bodies never logged on Vercel or AWS; AWS log retention set to the minimum; logs contain only technical errors. Uploaded files read in memory only. Results live only in the open tab. |
| **Transparency** | Users never see JSON, code or schemas; errors in plain English with a next step. |
| **Performance** | Target: a single full-period backtest on 15-minute candles completes in ≤ 30 s on the engine; the progress screen gives a rough estimate. Sweeps and what-ifs run as parallel engine calls with a concurrency cap. Budgets per module in `backend.md`. |
| **Reliability** | Engine calls retry with backoff on throttling (new AWS accounts have reduced concurrency quotas). Bad data days are skipped, never crash a run. |
| **Portability** | Engine is a provider-agnostic container with a thin Lambda handler; moving to another host means swapping the handler and deploy config only. Everything (code, infra, data scripts) lives in GitHub; nothing exists only in AWS. |
| **Hosting** | Frontend on Vercel (static files only; no user content reaches Vercel). Engine and document extraction on AWS Lambda as two Python functions, each behind a Lambda Function URL with CORS limited to the Vercel domain in production (dev-stage functions accept any origin, `architecture.md` §3.2); the LLM API key is held only by the extraction function. AWS Free plan: account closes 6 months after creation or when credits run out — accepted. Billing alert from day one; no EC2, no NAT gateways. |
| **Cost** | No spend on hosting before MVP UAT: everything runs locally, automated tests never call paid services, and deployment uses only free tiers. The only spend is the LLM API (a few US cents per upload), capped by a monthly spend limit. Details in `architecture.md` §10. |
| **Accessibility** | WCAG 2.1 AA target: keyboard navigation, labels on every input, sufficient contrast, charts with text equivalents. Details in `frontend.md`. |
| **Responsiveness** | Usable on a phone; the builder and report work at narrow widths. |
| **Tone** | Plain, calm, educational English; risk before reward; no hype. |
| **Browser support** | Current versions of Chrome, Edge, Firefox and Safari. |
| **Testing** | Every requirement has ≥ 1 automated test, mapped in `traceability.md` (constitution §11). |

---

## 13. Success criteria

1. A public Vercel URL backed by the Lambda engine, where:
   - a beginner runs a template and reads the plain-English summary;
   - a trader uploads a strategy document, answers clarifying questions and gets a report;
   - a trader builds, validates, backtests and improves a strategy in the builder.
2. The spec set in `specs/` is complete: constitution, product, architecture, frontend, backend, contracts, traceability matrix, changelog, and one folder per feature with EARS requirements, design and tasks.
3. Evidence of the change process: spec changes recorded in `CHANGELOG.md` before the related code changes.
4. Users never see JSON, code or schemas anywhere.
5. Disclaimer accepted before any strategy page is used (on first Get started or direct link), shown in the footer of every page, and on every report.
6. Automated tests mapped to acceptance criteria, including at least:
   - Given an uploaded strategy with a vague rule, when it is parsed, then the system asks a clarifying question and does not run a backtest until it is answered.
   - Given an uploaded strategy missing a mandatory input (e.g. stop-loss), when it is parsed, then the system asks for that input and does not default it.
   - Given an uploaded strategy that mentions no advanced option, when it is parsed, then all advanced options are OFF, shown as "Not used", and no extra questions are asked.
   - Given holding type Intraday, when a position is still open at 15:15, then it is squared off at 15:15.
   - Given 2 lots and lot size 65, when a trade is simulated, then P&L is calculated on quantity 130 for every trade in the backtest period.
   - Given an evaluation is running, then the progress screen shows stage messages, educational content and a "keep this tab open" warning.
   - Given a completed report, when the user clicks Download, then a PDF (and optional trades CSV) is generated in the browser, including settings, data source and disclaimer.
   - Given any upload or evaluation, then no user content is written to disk, a database or server logs.
   - Given a visitor who has not accepted the disclaimer, when they click Get started or open any strategy page directly, then the full disclaimer is shown and no strategy page can be used until they accept; the intro, Disclaimer and Learn pages remain readable.
   - Given the loaded data files, then the date range shown in the UI, reports and disclaimer equals the actual first and last timestamps in the data.
   - Given the user selects a backtest period, when the report is built, then win rate, P&L, drawdown and every breakdown count only trades inside that period, and the period is shown at the top of the report and the download.
   - Given a backtest period that includes 2019-07-02, then no trades are taken that day and the report lists it as skipped.
   - Given a minute with Nifty data but no VIX data, then no entry or exit is evaluated at that minute and no price is filled in.
   - Given ITM with 100 points distance and Nifty at 24,500, when a Call is selected, then the strike used is 24,400 CE.
   - Given any mandatory input is missing, then the Evaluate Strategy button is disabled and the missing input is named.
   - Given a new instrument profile and data file, when it is registered, then strategies can be validated and backtested on it with no engine code changes.
   - Given VIX-based sizing that would reduce 1 lot below 1, then 1 lot is used and the report states the rule had no effect.
   - Given the derived expiry calendar, then it matches every date in the recorded spot-check list, and 2021-02-24 does not shift any expiry.
7. README: the Nikasha story, setup, local run, deployment (Vercel + AWS), assumptions, limitations, how to add an instrument, and the full disclaimer. No other products named.

---

## 14. Change process (after specs are approved)

1. The owner describes the change.
2. Classify it:
   - **Behaviour change** (what the user sees or what the system does) → step 3.
   - **Bug fix** (code doesn't match an existing requirement) → fix the code and add a test for that requirement; no spec change.
   - **Refactor, typo or styling** with no behaviour change → no spec change.
3. Propose the spec update: affected requirement IDs, new or changed EARS statements and acceptance criteria, design/contract impact. **Wait for approval.**
4. Update `CHANGELOG.md`, then design, contracts, tasks and `traceability.md` as needed; run the consistency check.
5. Update or add tests, then change the code.
6. Confirm every changed requirement has a passing test.

Requirement IDs are stable: a changed requirement keeps its ID and the change is noted in `CHANGELOG.md`; a removed ID is never reused.

Quality gates before a feature's tasks are approved: **Clarify** (list underspecified points and ask) and **Consistency check** (requirements, design, tasks and contracts don't contradict each other, this file, `architecture.md` or the constitution; report what was checked).

---

## 15. Delivery plan

The deadline is **2026-10-16**, two days after these specs were started, for a solo developer. The full scope below cannot all be finished and tested in that time, so it is split into priority tiers. Build order follows the brief; within the time available, **a smaller, fully specified, tested and deployed app beats an ambitious half-finished one.**

| Order | Step | Tier |
|---|---|---|
| 1 | Project-level specs + `07-privacy-and-legal` spec, then **every other feature spec (01–06) before any development starts** (owner decision, 2026-10-14); specs written in build order: 01, 02, 05, 04, 03, 06 | P0 |
| 2 | Instrument registry, NIFTY50 profile, data loader and checks, expiry calendar + spot-check | P0 |
| 3 | Backtest engine + tests (local), using Simple Trend Follower | P0 |
| 4 | Report, incl. plain-English summary, in/out-of-sample split, VIX sensitivity | P0 |
| 5 | Deploy engine to Lambda + minimal Vercel page calling it | P0 |
| 6 | Intro page, Get started → disclaimer acceptance → Choose a path, Review & Evaluate screen, template gallery (Simple Trend Follower) | P0 |
| 7 | Document upload + clarification, tested with both samples | P1 |
| 8 | Guided builder: mandatory steps | P1 |
| 9 | Progress screen with educational content; PDF/CSV download | P0 (progress + PDF) / P1 (CSV, educational articles beyond glossary) |
| 10 | What-if sliders (P1, owner decision 2026-10-14: they are the cheapest way to meet the "improves a strategy" success criterion) and suggestions (P2). The overfitting check itself is part of the report in step 4 | P1 (what-if) / P2 (suggestions) |
| 8b | Builder advanced options; Higher-Timeframe Trend template | P1 |
| — | Short straddle template (multi-leg selling) | P2 — **first cut** |
| 11 | Privacy audit, README, final deploy | P0 |

**Schedule (owner decision, 2026-10-14):**
- **Day 1 — 2026-10-15: complete development, locally.** Steps 2–4 and 6–10, run and tested on the local stack (`architecture.md` §10.1). Includes a **deployment rehearsal** that costs nothing and deploys nothing: build the engine container image, run `sam build` for both functions, and build the web app for production.
- **Day 2 — 2026-10-16 (deadline): deployment only.** Step 5 (engine and extraction to Lambda, Vercel project and minimal page — T-ENG-16, T-UPL-02 deploy, T-EVL-09) and step 11 (privacy audit on CloudWatch, README, final deploy), then the deployment smoke tests (`architecture.md` §9).
- Because deployment moves to the last day, the build order above is followed for development except that step 5's deploy is deferred; everything in step 5 that doesn't need AWS or Vercel (scaffolds, generated types, local runs) is still done on day 1.

**Cut order if time runs short:** short straddle → suggestions engine → builder advanced options → CSV download → what-if sliders (cut last among these because they carry the "improves a strategy" success criterion). P0 items are never cut. Anything cut stays in the specs, marked "Not built" in `traceability.md`, so the gap is visible rather than hidden.

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **Option** | A contract giving the right to buy (call) or sell (put) the underlying at a set price (strike) on expiry |
| **CE / PE** | Call option / put option |
| **Premium** | The price of an option |
| **Strike** | The price at which the option can be exercised |
| **ATM / ITM / OTM** | At / in / out of the money: strike at, favourably beyond, or unfavourably beyond the current price |
| **Strike interval** | Gap between available strikes (Nifty: 50) |
| **Expiry** | The date an option contract ends; weekly or monthly |
| **Lot / lot size** | Options trade in lots; lot size is the quantity per lot (Nifty: 65 today) |
| **India VIX** | NSE's index of expected 30-day Nifty volatility, used here as the option's implied volatility |
| **Implied volatility (IV)** | The volatility the market prices into an option |
| **Black-Scholes** | The formula used to model option premiums from spot, strike, time, rate and volatility |
| **Intraday / Positional** | Closed the same day / may be held overnight |
| **Stop-loss (SL)** | Exit level that limits loss |
| **Target** | Exit level that takes profit |
| **Trailing SL** | A stop that moves in the trade's favour (e.g. to cost) |
| **R:R (risk-reward)** | Target distance divided by stop distance |
| **Square-off** | Closing an open position |
| **Slippage** | Difference between expected and actual fill price |
| **Backtest** | Simulating a strategy on historical data |
| **Equity curve** | Cumulative P&L over time |
| **Drawdown / max drawdown** | Fall from a previous equity peak / the largest such fall |
| **Win rate** | Share of trades that made money |
| **Expectancy** | Average P&L per trade |
| **Losing streak** | Consecutive losing trades |
| **In-sample / out-of-sample** | Period used to tune / unseen period used to check |
| **Overfitting** | Rules that fit past noise and fail on unseen data |
| **Regime** | Market condition, e.g. trending vs sideways, low vs high volatility |
| **Theta decay** | Loss of option value as expiry approaches |
| **EMA / SMA** | Exponential / simple moving average |
| **RSI** | Relative Strength Index (momentum, 0–100) |
| **ADX** | Average Directional Index (trend strength) |
| **Supertrend** | Trend indicator based on ATR bands; "green" up, "red" down |
| **MACD** | Moving Average Convergence Divergence |
| **VWAP** | Volume-weighted average price. Not available in Nikasha: it needs traded volume, and Nifty 50 is an index with no volume of its own |
| **Bollinger Bands** | Moving average with standard-deviation bands |
| **STT** | Securities Transaction Tax |

---

## 17. Open items (to resolve in later spec steps)

| Item | Where it will be resolved |
|---|---|
| Re-confirm NSE transaction charge 0.03553% against circular NSE/FA/73061 text | `01-data-and-engine` design, before release |
| Re-confirm the Sep 2025 change against the NSE circular text (secondary sources agree; the circular could not be retrieved at drafting time) | `01-data-and-engine`, before release |
| Legal review of the disclaimer | Before any public or commercial launch (outside this project) |

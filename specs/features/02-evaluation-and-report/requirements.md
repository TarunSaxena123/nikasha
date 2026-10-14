# Feature 02 — Evaluation and Report: Requirements

Status: **Approved 2026-10-14** · Created 2026-10-14 · Prefixes: **REQ-EVL** (review, evaluate, progress) and **REQ-RPT** (report, downloads) · Priority: **P0** (CSV download P1) · Layers: **frontend and backend**

Implements [`product.md`](../../product.md) §6.3, §6.5 (Review & Evaluate), §7.7, §10 and §12, within [`frontend.md`](../../frontend.md) §6, §6a, §8, §11, §12 and [`backend.md`](../../backend.md) §4.7. Uses feature 01's `RunResult` (trades, skipped signals, gaps, no-effect notes) and feature 07's legal components. Obeys [`constitution.md`](../../constitution.md) §3, §4, §6 and §8.

**Boundary:** feature 01 simulates trades. This feature turns them into the report (engine side), shows it (web side), and runs the screens from **Review** to **Report**, including downloads. What-if sliders (05) and suggestions (06) sit on the report page but are specified in their own features.

---

## 1. User stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-EVL-1 | any user | to see my whole strategy in plain English, with every setting and every unused option, before running it | I know exactly what will be tested |
| US-EVL-2 | any user | to see and change the costs and the period before running | no assumption is applied without my knowing |
| US-EVL-3 | any user | to know what is still missing when I can't press Evaluate | I can fix it quickly |
| US-EVL-4 | any user | something useful to read while the test runs, and to be told when it's done | waiting isn't wasted, and I don't lose the result |
| US-RPT-1 | trader | the risks first, then the profits, over the period I chose | I judge the strategy honestly |
| US-RPT-2 | trader | to see when the strategy worked and failed (by year, month, VIX level, trend, weekday, expiry day, CE/PE) | I understand why, not just how much |
| US-RPT-3 | trader | to know if the result is likely overfit and how sensitive it is to volatility | I don't trust a fragile result |
| US-RPT-4 | beginner | a short plain-English summary | I understand the result without jargon |
| US-RPT-5 | any user | a PDF (and a trades CSV) with everything needed to understand it later | I keep the result, because Nikasha keeps nothing |

## 2. Requirements — review, evaluate, progress (REQ-EVL)

### 2.1 Review & Evaluate screen

| ID | Requirement |
|---|---|
| REQ-EVL-01 | WHEN a strategy draft reaches the review screen (from any entry path), THE web app SHALL show a plain-English rules table (Rule / Setting / What it means) produced by `describeStrategy`, covering every mandatory input and every advanced option, with each unused advanced option shown as **"Not used"**. |
| REQ-EVL-02 | THE review screen SHALL show the evaluation settings with their pre-filled values: backtest period (quick choices full range / last 1, 3, 5 years / custom dates, limited to the data range), each cost item with its label, what it applies to and its source, and an optional capital field. |
| REQ-EVL-03 | THE review screen SHALL give each rule line an **Edit** link that opens the guided builder at the step holding that rule, with the draft loaded (for templates and uploads too), and SHALL let the user edit the evaluation settings inline (D1). |
| REQ-EVL-04 | THE review screen SHALL require the user to confirm pre-filled values before evaluation: lots and lot size each with a **Confirm** control; costs and period together with one checkbox, "I've checked the costs and period"; editing a value counts as confirming it; unconfirmed pre-fills count as missing (D2). |
| REQ-EVL-05 | WHILE any mandatory input is missing or unconfirmed, or any validation rule (schema or SEM) fails, THE web app SHALL keep **Evaluate Strategy** disabled and show a short list naming each missing input or problem in plain English, each linking to where it can be fixed. |
| REQ-EVL-06 | WHERE a strategy uses 4-hour candles with intraday holding, THE review screen SHALL point out that only the 13:14 candle close can trigger entries, because the day's second candle closes after the 15:15 square-off. |
| REQ-EVL-07 | THE review screen SHALL show the short disclaimer and the "Premiums modelled, not actual" note near the Evaluate button. |

### 2.2 Evaluate and progress

| ID | Requirement |
|---|---|
| REQ-EVL-08 | WHEN the user clicks **Evaluate Strategy**, THE web app SHALL ask for browser-notification permission (only if not already granted or denied), send `POST /v1/evaluate` with the strategy and confirmed settings, and show the progress screen. |
| REQ-EVL-09 | WHILE the evaluation runs, THE progress screen SHALL show time-based stage messages ("Preparing data…" → "Simulating trades…" → "Building your report…") with a rough time estimate worded as an estimate, educational content from Learn, and the warning **"Keep this tab open. Closing it will lose your result."** |
| REQ-EVL-10 | WHILE the evaluation runs or a report or draft exists, THE web app SHALL warn before the tab is closed or refreshed. |
| REQ-EVL-11 | THE progress screen SHALL offer a **Cancel** button that stops waiting and returns to the review screen with the draft unchanged; a response arriving after Cancel SHALL be discarded (D3). |
| REQ-EVL-12 | WHEN the report arrives, THE web app SHALL keep it in memory, change the tab title to "✓ Report ready — Nikasha", show a browser notification if permitted, and open the report. |
| REQ-EVL-13 | IF the engine is busy (429/503), THEN THE web app SHALL retry with backoff (1, 2, 4 s; max 3 retries) and then show "Busy right now, please try again" with a retry action; IF the engine returns 422, THEN it SHALL return to the review screen with the problems listed; IF the engine is unreachable or fails, THEN it SHALL show a plain-English error with retry. |

## 3. Requirements — report (REQ-RPT)

### 3.1 Metrics (engine)

| ID | Requirement |
|---|---|
| REQ-RPT-01 | THE engine SHALL compute every report figure only from trades **entered** within the selected period, and SHALL return the period (start, end, number of trading days). |
| REQ-RPT-02 | THE engine SHALL compute: trades; wins (net P&L > 0); losses (net P&L < 0); break-even trades (net P&L = 0) count as neither but are included in trades and end a losing streak (D5); win rate = wins ÷ trades × 100 (null if no trades); net P&L, gross P&L, total costs, total slippage; average win and average loss; expectancy (mean net P&L per trade); largest win and largest loss; worst losing streak (most consecutive trades with net P&L < 0). |
| REQ-RPT-03 | THE engine SHALL build the equity curve as cumulative net P&L at each trade's exit, in exit order, starting from 0, with drawdown at each point = running peak (including the starting 0) − equity; max drawdown = the largest drawdown. |
| REQ-RPT-04 | WHERE capital is given, THE engine SHALL also report return % = net P&L ÷ capital × 100 and max drawdown % = largest (peak − equity) ÷ (capital + peak) × 100; WHERE it is not given, these SHALL be null and not shown. |

### 3.2 Breakdowns (engine)

| ID | Requirement |
|---|---|
| REQ-RPT-05 | THE engine SHALL break down trades, wins, win rate, net P&L and expectancy by: year; month; VIX band at entry (profile edges: < 12, 12–18, 18–25, > 25); market regime; weekday of entry; expiry day vs other days; and side (CE / PE / multi-leg). All grouping uses the entry. |
| REQ-RPT-06 | THE engine SHALL classify each trading day's regime from daily candles built from the 1-minute data: ADX(14) (feature 01 formulas) at the **previous** trading day's close; ≥ 25 trending, < 20 sideways, otherwise mixed; "unknown" before ADX warm-up. Thresholds and period come from the profile. |

### 3.3 Overfitting check and sensitivity (engine)

| ID | Requirement |
|---|---|
| REQ-RPT-07 | THE engine SHALL split the selected period's trades into in-sample and out-of-sample by entry date, using the profile's split for the strategy's expiry kind, and compute metrics for each part. |
| REQ-RPT-08 | THE engine SHALL set the overfitting status: **NOT_APPLICABLE** if the selected period lies entirely on one side of the split, or if in-sample expectancy ≤ 0 ("The strategy lost money in the earlier period too, so there is no good result to test for overfitting.") (D4); **TOO_FEW_TRADES** if either part has fewer than 30 trades; **POSSIBLY_OVERFIT** if out-of-sample expectancy is below 50% of in-sample expectancy or has the opposite sign; otherwise **OK**; each with a plain-English explanation. |
| REQ-RPT-09 | THE engine SHALL report the metrics of the −S and +S volatility runs (feature 01) next to the base run. |

### 3.4 Plain-English text (engine)

| ID | Requirement |
|---|---|
| REQ-RPT-10 | THE engine SHALL produce the summary as a few short paragraphs from **fixed templates** filled with computed numbers, **risk first** (drawdown and losing streak before profit), then when it worked best and worst (from the breakdowns, only for groups with at least **10 trades**; smaller groups are marked "few trades" in the tables) (D6), then the overfitting and sensitivity results, all worded as past simulated results. |
| REQ-RPT-11 | THE engine SHALL produce `settings_used`: quantity text (e.g. "2 lots × 65 = 130 quantity per trade"), holding, timeframe, expiry, period, each cost with value and source, risk-free rate, capital, **every** advanced option as used (with its value) or "Not used", and every rule that had no effect with the number of trades affected. |
| REQ-RPT-12 | THE engine SHALL produce the skipped-data lines (days skipped with reasons; missing minutes in the period) and the skipped-signal counts with plain-English reasons. |
| REQ-RPT-13 | THE engine SHALL produce the "How this was simulated" notes (`product.md` §7: fills, SL-first rule, square-off, settlement, strike rounding, pricing model and its limits, costs applied at current rates, data gaps) and the disclosures (modelled premiums, volatility limitation, costs note). |
| REQ-RPT-14 | IF a run produces no trades, THEN THE engine SHALL still return a complete report, with null/zero metrics, empty breakdowns, and a summary that explains why (using the skipped-signal counts). |

### 3.5 Report screen (web)

| ID | Requirement |
|---|---|
| REQ-RPT-15 | THE report screen SHALL show, in this order: header (strategy name, period, "Premiums modelled, not actual" badge); summary; **risk** tiles (max drawdown, worst losing streak, largest loss); **result** tiles (net P&L, win rate, average win/loss, expectancy, trades); equity and drawdown charts; breakdowns; overfitting check; volatility sensitivity; trades table; settings used; how this was simulated; data source and data gaps; short disclaimer; download buttons. |
| REQ-RPT-16 | THE report screen SHALL show every chart with a caption and a "Show as table" alternative, and SHALL never use colour as the only signal of gain or loss. |
| REQ-RPT-17 | THE report screen SHALL show the trades table in pages (50 trades per page), with plain-English column names and exit reasons. |
| REQ-RPT-18 | THE report screen SHALL show the overfitting status prominently when it is POSSIBLY_OVERFIT, and SHALL show "too few trades to judge" or "can't be checked for this period" instead of a flag otherwise. |

### 3.6 Downloads (web)

| ID | Requirement |
|---|---|
| REQ-RPT-19 | WHEN the user clicks **Download PDF**, THE web app SHALL generate in the browser a PDF containing the strategy rules in plain English and everything in REQ-RPT-15 except the interactive trades table (a trade summary instead), with the short disclaimer at the top and on every page footer, data source with dates, settings used, engine version and generation time; nothing is uploaded. |
| REQ-RPT-20 | WHERE the report has at least one trade (otherwise the button is hidden and the PDF says "no trades") (D7), WHEN the user clicks **Download trades (CSV)**, THE web app SHALL generate in the browser a CSV with one row per trade and plain-English column names, preceded by comment lines with the period, settings summary, data source and short disclaimer. |
| REQ-RPT-21 | THE downloads SHALL be named `nikasha-report-<strategy-name>-<YYYYMMDD>.pdf` and `nikasha-trades-<strategy-name>-<YYYYMMDD>.csv`, with the strategy name reduced to letters, digits and hyphens. |

## 4. Acceptance criteria

| AC | Req. | Given / When / Then |
|---|---|---|
| AC-EVL-01 | 01 | **Given** the Simple Trend Follower template, **then** the review table lists all 13 mandatory inputs in plain English, the entry window and max-2-trades rules as used, and every other advanced option as "Not used"; no internal key or JSON appears. |
| AC-EVL-02 | 02 | **Given** meta from the data, **then** the period choices are limited to the data range and the costs show the NIFTY50 values with their sources. |
| AC-EVL-03 | 04, 05 | **Given** a template not yet confirmed, **then** Evaluate is disabled and the message names the unconfirmed items; after confirming, it is enabled. |
| AC-EVL-04 | 05 | **Given** a draft missing the stop-loss, **then** Evaluate is disabled and "Stop-loss" is named with a link to fix it. |
| AC-EVL-05 | 06 | **Given** 4-hour candles and intraday holding, **then** the review screen shows the 13:14-only note. |
| AC-EVL-06 | 08, 09, 10 | **Given** an evaluation running (engine delayed in the test), **then** the progress screen shows stage messages, learning content and "Keep this tab open…", and closing the tab triggers a warning. |
| AC-EVL-07 | 11 | **Given** a running evaluation, **when** Cancel is clicked, **then** the review screen shows the unchanged draft, and a late response is ignored. |
| AC-EVL-08 | 12 | **Given** an evaluation completes, **then** the tab title is "✓ Report ready — Nikasha", a notification appears if permission was granted, and the report opens. |
| AC-EVL-09 | 13 | **Given** the engine answers 429 twice then 200, **then** the report appears without the user retrying; **given** four 503s, **then** the busy message with Retry appears; **given** 422, **then** the review screen lists the problems. |
| AC-RPT-01 | 01 | **Given** a period 2023-01-01 → 2023-12-31, **then** every figure, breakdown and the trades table include only trades entered in 2023, and the period is shown at the top of the report and the PDF. |
| AC-RPT-02 | 02, 03 | **Given** trade net P&Ls [+100, −50, 0, −30, +20], **then** trades 5, wins 2, losses 2, win rate 40%, expectancy 8, average win 60, average loss −40, worst losing streak 1, equity [100, 50, 50, 20, 40], max drawdown 80. |
| AC-RPT-03 | 04 | **Given** the same trades and capital ₹1,00,000, **then** return % = 0.04% and max drawdown % = 80 ÷ 1,00,100 × 100; **without** capital, both are null and not shown. |
| AC-RPT-04 | 05, 06 | **Given** fixture trades on known dates and VIX values, **then** each lands in the expected year, month, VIX band, regime (from the previous day's ADX), weekday, expiry-day and side groups. |
| AC-RPT-05 | 07, 08 | **Given** 40 in-sample trades with expectancy 100 and 35 out-of-sample with expectancy 40, **then** POSSIBLY_OVERFIT; with OOS expectancy 60, **then** OK; with 20 OOS trades, **then** TOO_FEW_TRADES; with period "last 1 year", **then** NOT_APPLICABLE; with in-sample expectancy −10, **then** NOT_APPLICABLE with the "lost money in the earlier period" text. |
| AC-RPT-15 | 20 | **Given** a report with zero trades, **then** the CSV button is not shown and the PDF states "no trades". |
| AC-EVL-10 | 03, 04 | **Given** the review screen, **when** Edit is clicked on the stop-loss line, **then** the builder opens at the Exit step with the draft loaded; **when** the lot size is changed, **then** it counts as confirmed. |
| AC-RPT-06 | 09 | **Given** any evaluation, **then** the sensitivity section shows base, −2 and +2 metrics. |
| AC-RPT-07 | 10 | **Given** golden reports for the test strategies, **then** the summary mentions drawdown before profit, makes "worked best/worst" statements only for groups meeting the minimum trades, and contains no banned phrase. |
| AC-RPT-08 | 11 | **Given** 2 lots × 65 and VIX sizing with one no-effect trade, **then** settings used shows "2 lots × 65 = 130 quantity per trade", lists every advanced option as used or "Not used", and lists the no-effect rule with 1 trade affected. |
| AC-RPT-09 | 12 | **Given** a period including 2019-07-02, **then** the data-gaps section lists that day with "no India VIX data" and the period's missing-minute counts. |
| AC-RPT-10 | 14 | **Given** a strategy that never triggers, **then** the report shows zero trades, no empty charts, and a summary explaining the skipped-signal reasons. |
| AC-RPT-11 | 15, 16, 18 | **Given** a report, **then** sections appear in the specified order, risk tiles before result tiles, each chart has a caption and a working table toggle, gains/losses carry signs, and an overfit flag is shown prominently when set. |
| AC-RPT-12 | 17 | **Given** 230 trades, **then** the table has 5 pages of at most 50 with plain-English columns. |
| AC-RPT-13 | 19, 21 | **Given** a report, **when** Download PDF is clicked, **then** a PDF named per REQ-RPT-21 is saved with no network request, and its text contains the rules, summary, risk metrics, settings used, data source with dates, the short disclaimer on every page, and the engine version. |
| AC-RPT-14 | 20, 21 | **Given** a report, **when** Download trades is clicked, **then** a CSV is saved with no network request, with the comment-line preamble and one row per trade. |

## 5. Edge cases

| Case | Expected | Req. |
|---|---|---|
| All trades break even | Win rate 0%, losses 0, losing streak 0; summary says so plainly | 02, 10 |
| Only one trade | Metrics computed; breakdown groups below the minimum get no "best/worst" statements; overfit TOO_FEW_TRADES | 08, 10 |
| Period inside one month | Month breakdown has one row; year breakdown one row | 05 |
| Capital smaller than max drawdown | Drawdown % may exceed 100%; shown as is, with the summary noting losses exceeded the capital entered | 04 |
| Refresh on the report page | Report lost (nothing stored); empty state with Choose a path (`frontend.md` §3) | 12 |
| Very long strategy name | Truncated in the header with full name in the PDF; file name sanitised (REQ-RPT-21) | 21 |
| Monthly strategy over 2015–2026 | Overfit split uses the MONTHLY profile periods (2015–2023 / 2024–) | 07 |

## 6. Clarify gate — resolved decisions (owner, 2026-10-14)

| # | Question | Decision |
|---|---|---|
| D1 | How "edit any line" works | Edit link → builder at that step with the draft loaded; settings edited inline (REQ-EVL-03) |
| D2 | Confirming pre-fills | Confirm control for lots and lot size; one checkbox for costs and period; editing counts as confirming (REQ-EVL-04) |
| D3 | Cancel a running evaluation | Yes; back to review; late response discarded (REQ-EVL-11) |
| D4 | Overfit check when in-sample expectancy ≤ 0 | NOT_APPLICABLE with the "lost money in the earlier period" text (REQ-RPT-08) |
| D5 | Break-even trades | Neither win nor loss; counted in trades; end a losing streak (REQ-RPT-02) |
| D6 | Minimum trades for best/worst statements | 10; smaller groups marked "few trades" (REQ-RPT-10) |
| D7 | CSV with no trades | Button hidden; PDF says "no trades" (REQ-RPT-20) |

# Feature 02 — Evaluation and Report: Design

Status: **Approved 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) (REQ-EVL-01…13, REQ-RPT-01…21) · Follows [`frontend.md`](../../frontend.md), [`backend.md`](../../backend.md), feature 01 design (RunResult), feature 07 design (legal components)

---

## 1. Frontend

### 1.1 Review & Evaluate screen (`/review`)

```
┌ Review your strategy ───────────────────────────────────────────────────────┐
│ 1. RULES (RuleTable from describeStrategy)                                   │
│    Rule            │ Setting                     │ What it means      │      │
│    Instrument      │ Nifty 50                    │ …                  │ Edit │
│    Lots            │ 1   [Confirm]               │ …                  │ Edit │
│    Lot size        │ 65  [Confirm]  (note)       │ …                  │ Edit │
│    …13 mandatory inputs, then advanced options (used ones first, then "Not used")
│                                                                              │
│ 2. EVALUATION SETTINGS                                                       │
│    Period: (•) Full range  ( ) Last 1y ( ) 3y ( ) 5y ( ) Custom [from][to]   │
│    Costs: table — Charge │ Value [editable] │ Applies to │ Source            │
│    Capital (optional): [ ₹ ______ ]  "Adds % return and % drawdown"         │
│    [ ] I've checked the costs and period                                     │
│                                                                              │
│ 3. NOTES  (4-hour intraday note, if applicable)                              │
│                                                                              │
│ 4. STILL NEEDED  (only while something is missing)                           │
│    • Lot size — please confirm   → link                                      │
│    • Stop-loss — not set         → link                                      │
│                                                                              │
│ "Premiums are modelled, not actual."     [ Evaluate Strategy ] (disabled)    │
│ Short disclaimer                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Rules (EVL-01).** `describeStrategy(strategy, meta)` (frontend §6) produces the rows. Order: the 13 mandatory inputs in `product.md` §6.1 order, then advanced options used, then every remaining advanced option as "Not used" (12 advanced options, labels in §1.7).
- **Edit links (EVL-03, D1).** Each row maps to a builder step: Basics (instrument, buy/sell, option type, expiry, timeframe, holding, lots, lot size), Strike, Entry, Exit, Advanced. The link navigates to `/build?step=<step>` with the current draft in the store. The builder returns to `/review` with a **Back to review** button.
- **Confirmations (EVL-04, D2).** `draft.confirmed = { lots, lotSize }` is set by `ConfirmPrefill` or by editing the value. `settings.checked` is set by the checkbox and cleared whenever a cost or the period changes (the user re-ticks after changing). Drafts from **Use this template** arrive with lots, lot size and `settings.checked` already set (feature 05 D1: the card displayed exactly those values), so one click on Evaluate Strategy runs them; drafts from Customize, the builder or a what-if/suggestion arrive as described in their features.
- **Left-out rules.** When `draft.leftOut[]` is not empty (an upload with unsupported rules, feature 04), a "Left out (can't be tested)" block follows the rules table, listing each quote and reason.
- **Period (EVL-02).** Quick choices are computed from `meta.data_range.last`: last N years = `[last − N years + 1 day, last]`. Every choice is clipped to the expiry kind's `available_from` (weekly: 2019-02-11). Custom dates use date inputs limited to `[available_from, last]`. Default selection = full range for the expiry kind (`default_period` from meta).
- **Costs (EVL-02).** Pre-filled from `meta.default_costs.items`; each value is editable (number ≥ 0) and shows its unit and source.
- **Still needed (EVL-05).** This is the union of the completeness module (frontend §6a), the unconfirmed items, and the Ajv + `strategyRules.ts` problems, each with a link to its row or setting. **Evaluate Strategy** is enabled only when the list is empty.
- **4-hour note (EVL-06):** shown when `timeframe_min = 240` and `holding = INTRADAY`.

### 1.2 Evaluation state and the request (EVL-08–13)

```
idle ──Evaluate──► running {requestId, startedAt, estimateMs, abort} ──200──► done {report}
                     │  ├─429/503 → retry (1 s, 2 s, 4 s) ──after 3──► error{busy}
                     │  ├─422 → back to /review with problems listed
                     │  └─network/500 → error{failed}
                     └─Cancel → aborted → /review (draft unchanged)
```

- The single API client (feature 07 T-PRV-19) sends the request with an `AbortController`. A response whose `requestId` no longer matches the current one is discarded (D3).
- Notification permission is requested inside the Evaluate click handler only when `Notification.permission === "default"` (EVL-08).
- On `done`: store the report, set `document.title = "✓ Report ready — Nikasha"` (restored on the next navigation), post `new Notification("Your Nikasha report is ready")` if granted, and navigate to `/report` (EVL-12).
- `beforeunload` is registered while `draft`, `running` or `done` exist (EVL-10).

### 1.3 Progress screen (`/evaluate`)

- **Estimate.** `estimateMs = 4,000 + years × perYear(timeframe)`, where `perYear` is 6,000 ms (1-min), 3,000 (3-min), 2,000 (5-min) and 1,500 (15-min and above). It is tuned against the engine benchmarks (feature 01 T-ENG-15) and shown as "About N seconds (estimate)".
- **Stages (EVL-09).** "Preparing data…" until 15% of the estimate → "Simulating trades…" until 70% → "Building your report…". Past 100%: "Still working — longer periods take a little more time." Updates go to an `aria-live="polite"` region.
- **Learning content.** Three cards from Learn (feature 05): "What is drawdown?", "Why most strategies fail", "How option premiums decay". Each opens in place without leaving the page.
- **Warning** (always visible): "Keep this tab open. Closing it will lose your result."
- **Cancel** button (EVL-11).

### 1.4 Report screen (`/report`) — layout (RPT-15)

```
 Header: strategy name · period (9 Jan 2015 – 14 May 2026 · 2,794 trading days) · [Premiums modelled, not actual]
 1  Summary (paragraphs from the engine)
 2  Risk tiles:    Max drawdown │ Worst losing streak │ Largest loss
 3  Result tiles:  Net P&L │ Win rate │ Avg win / Avg loss │ Expectancy │ Trades
 4  Equity curve, with the drawdown chart directly below (shared time axis)
 5  When it worked: breakdown tabs — Year · Month · India VIX · Market trend · Weekday · Expiry day · Call/Put
 6  Overfitting check
 7  Volatility sensitivity
 8  [What-if sliders — feature 05]   [Ideas to test — feature 06]
 9  Trades (table, 50 per page)
10  Settings used · How this was simulated · Data source and data gaps (collapsible, open by default in PDF)
11  Short disclaimer
    Sticky download bar: [Download PDF] [Download trades (CSV)]
```

**Stat tiles.** Label in sentence case, no colon. Value in Inter semibold with proportional figures (not tabular). Signed rupees (`−₹4,250`). A one-line plain-English explanation under the value. Risk tiles carry a small warning icon and come first (RPT-15). Values are in primary ink, never coloured; a small ▲/▼ icon beside a P&L value carries direction (frontend §5.2: colour is never the only signal). Percent tiles appear only when capital is given (RPT-04).

### 1.5 Charts (RPT-16) — designed with the data-visualisation method

| Chart | Form (job) | Colour | Marks | Interaction |
|---|---|---|---|---|
| **Equity curve** | Line over time (trend, single series) | `--chart-line` | 2px line, round joins; zero line as a darker hairline (`--chart-axis`); no area fill (equity can go below zero); end-label with the final value; no legend (the title names it) | Crosshair snapping to the nearest trade exit; tooltip: date, trade #, equity, this trade's net P&L |
| **Drawdown** | Area below zero, aligned under the equity chart (same x-domain and width; two charts, never two y-axes) | `--chart-negative` line + 10% wash | 2px line; label at the deepest point ("Max drawdown −₹X, 12 Mar 2020") | Same crosshair, synced with the equity chart (Recharts `syncId`) |
| **Breakdowns** (Year, VIX, Trend, Weekday, Expiry day, Call/Put) | A **table with an inline diverging bar** per row (polarity around zero) | Positive `--chart-positive`, negative `--chart-negative`, zero = no bar | Bar ≤ 12px tall in its cell, 4px rounded data end, square at the zero line; the zero line is a hairline at the column centre; columns: group · trades · win rate · net P&L (signed text) · bar · expectancy | Row hover highlights; the values are already text, so the table is its own table view |
| **Month** | Year × month grid **table** (12 columns) of signed net P&L; no colour fill | Text only; best and worst month outlined with a label | — | — |
| **Overfitting check** | Two side-by-side columns of stat tiles ("Tuning period 2019–2023" vs "Unseen period 2024 – 14 May 2026"): expectancy, win rate, trades, max drawdown | Status banner using the status colour (`--caution`) **with icon + label** | — | — |
| **Volatility sensitivity** | Small table, not a chart: rows = net P&L, win rate, expectancy, max drawdown; columns = VIX −2 · As tested · VIX +2 | Text only | — | — |

- **Why blue for gains.** `--gain` green and `--risk` red are too close for colour-blind readers (validator: deuteranopia ΔE 6.6, warning band). Blue `#2a78d6` against red `#B42318` passes strongly (deuteranopia ΔE 27.0, normal ΔE 32.6, both ≥ 3:1 on white). Charts therefore use blue for positive and red for negative. Text keeps signs, and P&L tiles keep their ▲/▼ icons.
- **Chart tokens** (added to `frontend.md` §5.2): `--chart-line #2a78d6`, `--chart-positive #2a78d6`, `--chart-negative #B42318`, `--chart-grid #E3E5E8`, `--chart-axis #8A8F98`. Axis and label text uses `--ink-muted`; text never takes a series colour.
- **Chrome.** Hairline solid gridlines (horizontal only), no dashed lines, ticks compact in Indian notation (`₹0`, `₹50K`, `₹1L`, `₹10L`), dates as `Mar 2020`. Containers are sized to include the axis band (no inner scroll). Animations off (reduced motion; identical PDF render).
- **Table toggle.** Every chart sits in `ChartFrame` with a caption and **Show as table**: equity → date, trade #, equity, drawdown (paged); drawdown shares that table.
- **Empty case (RPT-14).** No trades → charts replaced by an `EmptyState` explaining the skip reasons. No empty axes.
- **Dark mode:** not in the MVP (light theme only, `frontend.md` §5.2). The tokens allow adding it later, with its own validated steps.

### 1.6 Downloads (RPT-19–21)

**PDF** (jsPDF + svg2pdf + autotable, A4 portrait, generated in the browser):
1. Page 1: title, strategy name, period, badge "Premiums modelled, not actual", short disclaimer (feature 07 `pdfLegalBlocks`), summary, risk tiles, result tiles.
2. Strategy rules (`describeStrategy` table, incl. "Not used" rows), followed by "Left out (can't be tested)" with each rule's quote and reason when the strategy came from an upload with unsupported rules (feature 04 D2).
3. Equity and drawdown charts. Rendered off-screen at 760 × 240 px without tooltips, then converted to vector with svg2pdf.
4. Breakdown tables (all seven, incl. the month grid).
5. Overfitting check, volatility sensitivity.
6. Trade summary: count, first/last trade dates, exit-reason counts. The full list is in the CSV. With zero trades: "No trades" (D7).
7. Settings used, how this was simulated, data source and data gaps, skipped signals.
- Footer on every page: short disclaimer, page n/N, engine version, generation time.

**CSV** (only when trades ≥ 1, D7): preamble from `csvLegalPreamble` (feature 07), then the header row. Columns:
`Trade #, Side, Legs, Strike(s), Expiry, Signal time, Entry time, Exit time, Spot at entry, Entry premium(s), Exit premium(s), Quantity, Gross P&L (₹), Costs (₹), Net P&L (₹), Exit reason, India VIX at entry, VIX band, Market trend, Expiry day`.
Multi-leg strikes and premiums are joined with " / ". Quoting follows RFC 4180. UTF-8 with BOM, so spreadsheet apps show ₹ correctly.

**File names** (RPT-21): `slug(name)` = lower-case, non-alphanumerics → `-`, collapse repeats, trim to 40 characters; the date is the local date of generation.

### 1.7 Advanced option labels (shared by review screen, report and PDF)

SL cap · Trigger-candle stop-loss · Risk-reward target · Trail stop to cost · Exit after N candles · Volatility (VIX) sizing · Entry windows · No-entry windows · Expiry-day cutoff · Daily limits · Multiple legs · Strike by delta or premium.

The engine's `settings_used.advanced` uses the same 12 labels, in this order.

## 2. Backend (engine report builder, `report/`)

### 2.1 Input and output
`build_report(request, base: RunResult, minus: RunResult, plus: RunResult, instrument, market) → Report` (`api.openapi.yaml` → `Report`). Pure function: no I/O, deterministic. The response is validated against the schema in tests.

### 2.2 Metrics (`report/metrics.py`, RPT-01–04)

```
T = trades of the run with entry date in [period.start, period.end], sorted by exit time
wins   = [t for t in T if t.net > 0];  losses = [t for t in T if t.net < 0]       # 0 = neither (D5)
win_rate_pct = 100·len(wins)/len(T) if T else None
avg_win  = mean(net of wins) or None;  avg_loss = mean(net of losses) or None
expectancy = mean(net of T) or None
largest_win = max(net) if wins else None; largest_loss = min(net) if losses else None
streak: walk T; count consecutive net < 0; any net ≥ 0 resets; worst = max count
equity_i = Σ_{j≤i} net_j ; peak_i = max(0, equity_0..i) ; dd_i = peak_i − equity_i
max_drawdown = max(dd) or 0
with capital C:  return_pct = 100·Σnet/C ;  max_drawdown_pct = max_i 100·dd_i/(C + peak_i)
trading_days = number of trading days in [start, end] (feature 01 calendar)
```

Money values are rounded half-up to 2 decimals at output; percentages to 1 decimal in text, 2 in data.

### 2.3 Breakdowns (`report/breakdowns.py`, RPT-05)

| Key | Grouping (by entry) | Labels |
|---|---|---|
| `by_year` | entry year | "2019" … |
| `by_month` | entry year-month | "Mar 2024" |
| `by_vol_band` | VIX at entry vs profile edges | "India VIX below 12", "12–18", "18–25", "25 and above" |
| `by_regime` | day regime (§2.4) | "Trending days", "Mixed days", "Sideways days", "Not enough history" |
| `by_weekday` | entry weekday | "Monday" … (weekend sessions appear as "Saturday"/"Sunday" when present) |
| `by_expiry_day` | entry date = the contract's expiry date | "Expiry day", "Other days" |
| `by_side` | trade side | "Call (CE)", "Put (PE)", "Multi-leg" |

Rows are in natural order (time, band order, weekday order). Groups with no trades are omitted.

### 2.4 Regime (`report/regimes.py`, RPT-06)
Daily candles are built from all present 1-minute underlying bars of each trading day (feature 01 data). ADX(n) uses the feature 01 formulas, with n and thresholds from the profile. `regime[D]` = classification of ADX at the close of the trading day before D; `UNKNOWN` until ADX is valid. It is computed once per container and cached, because it depends only on market data. It fills `Trade.regime`.

### 2.5 Overfitting (`report/overfit.py`, RPT-07, 08; D4)

```
split = profile.periods[expiry_kind]       # WEEKLY or MONTHLY from the strategy's legs
IS  = trades with entry in [max(start, split.in_sample.from), min(end, split.in_sample.to)]
OOS = trades with entry in [max(start, split.out_of_sample_from), end]
if period lies wholly before out_of_sample_from or wholly on/after it → NOT_APPLICABLE (text A)
elif len(IS) < 30 or len(OOS) < 30                                   → TOO_FEW_TRADES   (text B)
elif expectancy(IS) ≤ 0                                              → NOT_APPLICABLE (text C)
elif expectancy(OOS) < 0.5·expectancy(IS)  (incl. opposite sign)     → POSSIBLY_OVERFIT (text D)
else                                                                 → OK               (text E)
```

**Included parts:** `overfit.in_sample` is returned whenever the selected period overlaps the in-sample range, and `overfit.out_of_sample` whenever it overlaps the out-of-sample range, **whatever the status** (incl. TOO_FEW_TRADES and NOT_APPLICABLE text C). This lets the report show the numbers behind every status and lets feature 06's tuning check use them. A part with no overlap is omitted.

Texts (fixed templates):
- **A** "This period doesn't include both the earlier tuning years and the unseen recent years, so overfitting can't be checked. Choose a longer period to see this check."
- **B** "Too few trades to judge: {n_is} in {is_label} and {n_oos} in {oos_label}. At least 30 in each are needed."
- **C** "The strategy lost money in the earlier period too, so there is no good result to test for overfitting."
- **D** "Possibly overfit: in the unseen period ({oos_label}) the average result per trade was {oos_exp}, compared with {is_exp} in {is_label}. Results that fade on unseen data are a common sign that rules fit past noise."
- **E** "Held up on unseen data: the average result per trade was {oos_exp} in {oos_label}, compared with {is_exp} in {is_label}."

### 2.6 Sensitivity (RPT-09)
`sensitivity = [{vol_shift_pts: −S, metrics(minus)}, {vol_shift_pts: +S, metrics(plus)}]`, using the same period filter. The base metrics are already in `metrics`.

### 2.7 Summary templates (`report/summary.py`, RPT-10, 14)

Paragraphs, in order. A paragraph is omitted when its data is missing.
1. **Risk.** "Over {period_text}, this strategy took {trades} trades. Its largest fall from a peak was {max_drawdown}, its longest run of losing trades was {streak}, and its single biggest loss was {largest_loss}."
2. **Result.** "In total it would have {made|lost} {abs_net} after {costs} in costs. {win_rate} of trades made money; the average winning trade made {avg_win} and the average losing trade lost {abs_avg_loss}." (+ capital variant: "…, a {return_pct} return on the {capital} capital you entered.")
3. **When it worked.** Among `by_vol_band`, `by_regime` and `by_side` groups with **≥ 10 trades** (D6), best = highest expectancy and worst = lowest. The sentence is emitted only if best > 0 and worst < 0: "It did best {phrase(best)} (on average {exp} per trade over {n} trades) and worst {phrase(worst)} ({exp} over {n} trades)." Phrases: "when India VIX was 12–18", "on trending days", "on call trades".
4. **Overfitting.** The status text from §2.5.
5. **Sensitivity.** "If volatility had been {S} points lower, the result would have been {net_minus}; {S} points higher, {net_plus}. {Fragility line}". Fragility line: "The result depends heavily on the volatility assumption." if the sign of net P&L differs between any two of the three runs; otherwise omitted.
- **No trades.** "This strategy took no trades in {period_text}." + one of: "Its entry conditions were never all true at the same time." (no signals) / "It had {n} signals, but none could be taken. The most common reason: {reason_text} ({count} times)."

All templates are past-simulated and checked against `banned-phrases.txt` (feature 07 T-PRV-11). Numbers use the formatting rules in `frontend.md` §5.5, applied by a shared Python formatter.

### 2.8 Settings used, notes and disclosures (RPT-11–13)
- `settings_used`: quantity_text "{lots} lots × {lot_size} = {qty} quantity per trade" (VIX sizing adds "(changed by volatility sizing on some trades)"); holding, timeframe ("15-minute candles"; "4-hour candles"), expiry, period text; costs (label, value with unit, source); risk-free rate; capital text ("Not entered" when absent); `advanced` = the 12 labels of §1.7, each with `used` and `value_text` ("Not used" when off); `no_effect_rules` from the RunResult notes, grouped, with counts.
- `skipped.data_days` and `data_minutes` from the period gap inventory. `skipped.signals` uses a fixed text for each of the 14 reasons, e.g. `MAX_TRADES` → "Daily trade limit reached", `NEXT_DAY_FILL` → "Signal on the last candle of the day (would only fill the next morning)", `CONFLICTING_SIGNALS` → "Call and put signals at the same time".
- `simulation_notes` (fixed lines, values filled in):
  - entries at the next minute's open after the signal candle
  - stop-loss and target checked every minute; stop first if both are hit in one minute
  - intraday square-off at {squareoff}
  - positions still open at expiry settled at intrinsic value
  - strikes from spot rounded to {interval} points
  - premiums modelled with Black-Scholes using India VIX as volatility (minute range uses that minute's closing VIX) and a {rate}% risk-free rate
  - slippage {slippage} points per fill
  - charges at current rates applied to the whole period
  - one position at a time
  - missing data never filled
- `disclosures`: modelled premiums text; volatility limitation (VIX is a 30-day near-ATM measure, so skew and expiry-day behaviour aren't captured; expiry-day results are least reliable); costs note (current rates, historical changes not modelled).

## 3. Contract

- **Uses** `POST /v1/evaluate` → `Report` as approved. No new fields are needed: "few trades" marking is computed in the web app from `BreakdownRow.trades < 10`.
- **Uses** `GET /v1/meta` for periods, costs and the data range on the review screen.
- **Uses** the `Error` model (422 problems listed on the review screen).
- **No contract change.**

## 4. Error handling

| Situation | Behaviour | Req. |
|---|---|---|
| 429/503 | Backoff 1/2/4 s, then busy message with Retry | EVL-13 |
| 422 | Back to review; problems listed under "Still needed" | EVL-13 |
| Network failure / 500 | Plain-English error, Retry, draft kept | EVL-13 |
| Late response after Cancel | Discarded by request id | EVL-11 |
| Report fails schema validation in the browser (shouldn't happen) | Generic error with Retry; nothing technical shown | frontend §7 |
| PDF generation error (e.g. memory on a phone) | "Couldn't create the PDF on this device. Try a desktop browser." The report stays on screen | RPT-19 |

## 5. Testing strategy

| Area | Tests | ACs |
|---|---|---|
| Review screen | Component: rules incl. "Not used"; confirmations; Still needed list with links; Edit link targets; 4-hour note; period clipping | AC-EVL-01–05, 10 |
| Evaluate flow | Playwright with a mocked engine: progress content, beforeunload, Cancel + late response, title + notification (permission mocked), retries 429/503, 422 path | AC-EVL-06–09 |
| Metrics | pytest with the AC-RPT-02/03 trade lists; break-even handling; capital variants | AC-RPT-02, 03 |
| Period filter | Golden report for 2023 only | AC-RPT-01 |
| Breakdowns, regime | Fixture trades with known dates/VIX; regime from a synthetic daily series with known ADX | AC-RPT-04 |
| Overfit | All five statuses incl. D4 | AC-RPT-05 |
| Sensitivity | Three-run fixture | AC-RPT-06 |
| Summary | Golden reports for the test strategies; ≥10-trade rule; no-trades variants; banned-phrase scan | AC-RPT-07, 10 |
| Settings/skips | 2 × 65 text; all 12 advanced labels; no-effect grouping; 2019-07-02 gap line; all 14 skip texts present | AC-RPT-08, 09 |
| Report screen | Playwright: section order, tile order, chart captions and table toggles, signs on values, overfit banner, paging 230 trades | AC-RPT-11, 12 |
| Downloads | Playwright: PDF and CSV saved with no network request; PDF text contains the required parts on every page; CSV preamble and rows; hidden CSV with zero trades; file-name slug | AC-RPT-13–15 |
| Contract | Engine responses validate against `Report`; web parses fixtures generated by the engine | — |

## 6. Consistency check

Checked against `constitution.md` (§3, §4, §6, §8), `product.md` §6.3, §6.5, §7.7, §10, `frontend.md` §5–§13, `backend.md` §4.7, `api.openapi.yaml`, feature 01 (RunResult, calendar, ADX formulas) and feature 07 (legal blocks, banned phrases). Findings:
- **Addition to `frontend.md` §5.2:** chart tokens, with blue for positive values in charts (colour-blind safety, validated). Text tokens are unchanged. Recorded in `CHANGELOG.md`.
- **What-if and suggestions** have reserved slots on the report page (§1.4 item 8), specified in features 05 and 06.
- No contradictions found; no contract change.

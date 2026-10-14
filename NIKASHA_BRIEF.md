# Nikasha — Project Brief (handoff from planning chat)

> Put this file in the repo root (or `docs/`). Tell Claude Code: "Read NIKASHA_BRIEF.md first. Do not write application code yet — ask me clarifying questions, then produce the specs as described in §7." This brief is the source input; after approval, `specs/` is the single source of truth.

Nikasha (Sanskrit: *touchstone*, the stone used to test whether gold is genuine).
Tagline: **"The touchstone for your trading strategy."**
Repo: `nikasha` ·

---

## 1. Decisions log (what was settled in planning)

| Topic | Decision |
|---|---|
| Name | Nikasha (other candidate names rejected: already in use) |
| MVP instrument | Nifty 50 options only |
| Future instruments | Bank Nifty, Sensex, MCX crude and other commodities, via instrument profiles (no engine rewrite) |
| Users | Trader (primary), Beginner (secondary) |
| Strategy input | 3 paths: document upload + clarification, guided builder, templates |
| Core rule | The system never guesses vague rules; it asks |
| Minimum inputs | A strategy only needs a small set of mandatory inputs to be evaluated. Missing mandatory inputs are always asked for |
| Advanced options | **No defaults.** Trailing, SL cap, daily limits, VIX sizing, time windows etc. are OFF unless the user explicitly sets them |
| Position size | User is asked for number of lots (pre-filled 1) and lot size (pre-filled 65, current NSE Nifty lot, editable). The chosen size applies across the whole backtest |
| Holding type | User is asked Intraday or Positional. Intraday positions are always squared off at 15:15 |
| Data source | Nifty 50 and India VIX 1-minute data from Kaggle, pre-cleaned into `nifty50_1min_clean.csv` and `indiavix_1min_clean.csv`, 9 Jan 2015 09:15 – 14 May 2026 15:29; disclosed in the disclaimer |
| Privacy | Nikasha stores nothing: no strategies, uploaded files, results, sessions or personal data on its servers |
| Results | Progress screen with educational content while evaluating; result downloadable (PDF, optional CSV of trades). No save feature |
| Strike input | Moneyness (ATM / ITM / OTM) + distance from spot in points (e.g., 100 points ITM) |
| User experience | Users never see JSON or code. They review their rules in plain English and click **Evaluate Strategy** |
| Legal | Professional disclaimer: not SEBI-registered, educational purpose only, no liability for profits or losses; shown on first visit, in the footer and on every report |
| Option prices | Modelled (Black-Scholes, India VIX as IV), because only spot + VIX data exist |
| Frontend | Next.js (React, TypeScript) on Vercel |
| Engine | Python (pandas/numpy) on AWS Lambda, container image, data baked in |
| API | Lambda Function URL (not API Gateway) |
| Storage | None. No database, no server-side files, no saved strategies. Results live only in the open browser tab until downloaded |
| AWS account | Created after 15 Jul 2025 → Free plan: closes after 6 months or when credits run out. Accepted; engine must stay portable |
| Overfitting | Tune on 2019–2023, report on Jan 2024 – 14 May 2026 |
| Positioning | Not "first of its kind"; differentiate on explanation, overfitting checks, doc-to-spec, beginner mode. Never name other products in the app, docs or README |

---

## 2. Problem statement

Retail traders in Indian derivatives (index options such as Nifty 50, Bank Nifty and Sensex, and commodity options on MCX such as crude oil) often trade strategies built on indicators, rules and gut feel, without knowing how those strategies would have performed historically. Their strategies usually exist as informal notes or documents with vague rules ("exit if it closes decisively below", "reduce size significantly"), which cannot be tested as written. Existing tools can run backtests, but they mostly report how a strategy performed, not why it worked or failed, whether the results are overfit, or how to improve it. Beginners face an even bigger gap: they don't understand the terminology and have no safe way to learn why most strategies fail.

Build Nikasha, a web application that serves two kinds of users:
- **Experienced traders** either upload their strategy as a document in any format or wording, or build it in a guided builder using almost any parameters (timeframe, indicators, entry conditions, strike selection, stop-loss, target, trailing, time filters, volatility-based sizing, daily limits). Only a small set of inputs is mandatory; advanced options are used only when the user sets them, never by default. If a mandatory input is missing or a rule is vague, the system asks the user. It never guesses. Users review their rules in plain English and click "Evaluate Strategy"; they never see code or data formats. While the evaluation runs, users can read educational content, and the finished report can be downloaded. Nikasha stores no user data of any kind.
- **Beginners** start from ready-made templates explained in plain language, run them without building anything, and learn through simple "what-if" experiments.

Every strategy is converted into a standard, validated strategy format and backtested on historical data, with option premiums modelled from the underlying price and a volatility source. The system then generates a clear performance report, with a plain-English summary and risk shown as prominently as profit. It explains when and why the strategy works or fails, checks for overfitting on unseen data, and suggests data-backed improvements or better-performing alternatives.

The first release supports Nifty 50 options, using 1-minute Nifty 50 and India VIX data from 2015 to 2026. The system must be designed so that other instruments can be added later by supplying their data and an instrument configuration, without rewriting the core engine.

The web interface is deployed on Vercel and the backtest engine on AWS Lambda, with the engine kept portable so it can move to another host later.

---

## 3. Detailed scope

### Goal
Turn any options strategy (uploaded document, guided build, or template) into a precise, validated spec; backtest it; and explain why it works or fails, whether it is overfit, and how to improve it.

### Positioning
Other platforms in the market already offer strategy builders and backtests, some with real option data and plain-English strategy input. Nikasha does not claim to be first of its kind, and **no other product is named anywhere in the app, docs or README**. Nikasha differentiates on:
- Document upload + clarification: never guesses, always asks
- Improvement suggestions with plain-English reasons, compared side by side
- Out-of-sample testing to expose overfitting
- Regime analysis: when the strategy works and fails (volatility bands, trend vs sideways)
- Beginner learning mode with risk-first, plain-English reports
- One consistent workflow across index and commodity options (future)

Pitch: *"Existing tools tell you how a strategy performed. Nikasha explains why, warns when results are overfit, and suggests how to improve it."*

### Data
MVP (in `/data`), source: Kaggle dataset **"NSE - Nifty 50 Index Minute data (2015 to 2026)"**, https://www.kaggle.com/datasets/debashis74017/nifty-50-minute-data
Files given to the project (already cleaned from the raw Kaggle download; see the data `README.md` and `cleaning_report.json`):

| File | Rows | Trading days | Range |
|---|---|---|---|
| `nifty50_1min_clean.csv` | 1,047,566 | 2,794 | 2015-01-09 09:15 → 2026-05-14 15:29 |
| `indiavix_1min_clean.csv` | 1,047,192 | 2,793 | 2015-01-09 09:15 → 2026-05-14 15:29 |

- Columns: `datetime, open, high, low, close` (volume removed; it was always 0 for indices)
- Times are IST; each row is labelled by the minute's start (09:15 … 15:29, 375 bars on a full day); prices to 2 decimals
- Cleaning already done: timestamps stamped seconds late (Jun–Nov 2015) moved to the whole minute; 4 duplicates dropped; non-regular sessions removed (10 Muhurat sessions, 2 Saturday mock/DR sessions in 2024, the 24 Feb 2021 NSE halt day, and 15 May 2026, which was cut off mid-day); 2,547 VIX rows with inconsistent high/low repaired (open/close untouched)
- Kept on purpose: full-hours weekend sessions (budget days 2015-02-28, 2020-02-01, 2025-02-01, 2026-02-01, and special session 2024-01-20), the 13 Mar 2020 circuit-reopening jump, large first-minute VIX jumps
- **Known gaps (left unfilled on purpose):** Nifty 184 missing minutes over 28 days; VIX 183 missing minutes over 27 days; **VIX has no data at all for 2019-07-02**; the files share 1,047,188 minutes (378 Nifty-only, 4 VIX-only)
- The Kaggle description's "Last update 26 July 2025" is stale; the actual data runs to 14 May 2026
- Licence label on Kaggle: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). **However**, the uploader states they do not own the data, collected it from the internet and Google Drive, accept no legal responsibility, and intend it for **research purposes only**. NIFTY 50 is owned and managed by NSE Indices Limited, so the CC0 label does not grant real reuse rights
- Consequence: use is limited to **educational, non-commercial** purposes (fits this course assignment). Any public commercial use requires a proper data licence from NSE Indices / an authorised data vendor
- Data provenance is unverified, so load-time quality checks are mandatory, not optional
- **The app must read the actual first and last timestamps from the data** and show that range in the UI, reports and disclaimer, instead of hardcoding dates
- No option premium data → premiums must be modelled

Future: each new instrument adds its own data files in the same normalized format.

### Instrument profiles (required in MVP)
No instrument-specific logic is hardcoded. Each instrument is a config file (e.g., `/instruments/nifty50.json`) defining:
- Identity: symbol, name, exchange (NSE / BSE / MCX), segment
- Trading session hours (incl. MCX evening sessions)
- Contract rules: strike interval, suggested current lot size (pre-fill only; the user confirms it), multiplier, tick size
- Expiry calendar: dated table of expiry types and days, incl. historical changes
- Underlying type: spot index or futures contract (MCX options are on futures)
- Volatility source: India VIX for Nifty; historical volatility where no index exists
- Pricing model: which PricingProvider applies (Black-Scholes, Black-76…)
- Default costs: slippage, brokerage, taxes
- Data file paths

Strategy JSON references an instrument by symbol (`"underlying": "NIFTY50"`). MVP ships one profile (NIFTY50). A test must prove a second dummy profile needs no engine code changes.

### In scope (MVP)
1. **Minimum mandatory inputs** (the same rule for upload, guided builder and templates)
   A strategy can be evaluated once these are known:

   | # | Mandatory input | Example |
   |---|---|---|
   | 1 | Instrument | Nifty 50 (pre-selected in MVP) |
   | 2 | Trade action | Buy options / Sell options |
   | 3 | Option type | CE, PE, or both (CE on bullish signal, PE on bearish) |
   | 4 | Strike moneyness | ATM / ITM / OTM |
   | 5 | Strike distance from spot | e.g., 100 points ITM (required when ITM or OTM; rounded to the nearest valid strike) |
   | 6 | Expiry | Current weekly / next weekly / monthly |
   | 7 | Candle timeframe | e.g., 15-minute |
   | 8 | Holding type | Intraday or Positional. **Intraday: position always squared off at 15:15** |
   | 9 | Number of lots | Pre-filled 1, user confirms or changes |
   | 10 | Lot size (quantity per lot) | Pre-filled 65 (current NSE Nifty lot, revised from 75 in Jan 2026), user confirms or changes; applied across the whole backtest so results reflect today's position size |
   | 11 | Entry trigger | At least one indicator condition per enabled side, OR a fixed entry time (e.g., 09:20) |
   | 12 | Stop-loss | e.g., 30% of premium, 30 points, or trigger-candle low |
   | 13 | Exit rule | A target or a time-based exit. Intraday: the 15:15 square-off counts as the time exit. Positional: if neither target nor time exit is given, the user is asked (e.g., "hold until expiry?") |

   **Advanced options have NO defaults.** Trailing SL, SL cap, exit after N candles, VIX-based sizing, entry/no-entry windows, expiry-day cutoff, daily limits, multi-leg, strike by delta/premium: each is OFF unless the user explicitly sets it. Nothing is assumed on the user's behalf.

   **Evaluation settings** (not strategy rules, but the engine needs a value): transaction costs (brokerage, taxes, slippage) and backtest period. These are shown upfront on the review screen with pre-filled values the user can see and edit, never applied silently.

   - A missing mandatory input is always asked for; pre-filled values (lots, lot size) are shown and must be confirmed
   - Every report lists the settings used and which advanced options were off

2. **Document upload with clarification** (any strategy, any wording; PDF, DOCX, TXT or pasted text)
   - An LLM extracts whatever rules are present
   - Each rule marked Found / Vague / Missing / Unsupported
   - **Missing mandatory inputs → asked**, one simple question each, multiple-choice where possible
   - **Vague rules the user wrote → asked** (e.g., "SL cap: 30 or 35 points?"), even if optional
   - **Advanced rules not mentioned → treated as OFF**, not asked and not defaulted (keeps questions to a minimum); the review screen shows them as "Not used"
   - Unsupported rules listed explicitly, never silently dropped
   - Works even for a very short strategy ("buy ATM call when RSI crosses 60, SL 30%") by asking only for what is missing
   - LLM API key as a Vercel environment variable
   - The uploaded file is read in memory only, never written to disk, a database or logs, and discarded once extraction is done

3. **Guided strategy builder** (mandatory first, advanced optional)
   - **Step 1 — Basics (mandatory):** instrument, buy/sell, CE/PE/both, expiry, candle timeframe, intraday/positional, number of lots (pre-filled 1), lot size (pre-filled 65)
   - **Step 2 — Strike (mandatory):** choose ATM / ITM / OTM; if ITM or OTM, enter distance from spot in points (e.g., 100); show a live example ("Nifty at 24,500 → 100 pts ITM Call = 24,400 CE")
   - **Step 3 — Entry (mandatory):** indicator conditions or a fixed entry time
     - Indicators with parameters, multiple instances: Supertrend, EMA, SMA, RSI, ADX, MACD, VWAP, Bollinger Bands
     - Conditions as simple sentence-style rows ("RSI 14 is above 55"), nested AND/OR; operators >, <, >=, <=, crosses above/below, turns (state flip), slope up/down over N candles; separate CE and PE sets
   - **Step 4 — Exit (mandatory):** stop-loss + target or time exit
   - **Advanced options (optional, collapsed, all OFF until the user sets them; no pre-filled values):** SL cap, trigger-candle SL, R:R targets, trailing to cost at xR, exit after N candles, volatility-band sizing, entry and no-entry windows, expiry-day cutoff, daily limits (max trades, stop after N SL hits, max daily loss), 1–4 legs, strike by delta or premium
   - Builder never lets the user continue past a mandatory step until it is complete

4. **Review & Evaluate**
   - After inputs are complete (any entry path), the user sees a **plain-English rules table**, the evaluation settings (lots × lot size, costs, period), and the advanced options marked "Not used"
   - User can edit any line, then clicks **"Evaluate Strategy"**
   - The button is disabled until all mandatory inputs are present and valid; a short message says what is still needed
   - **Users never see JSON, code or schemas** at any point

5. **Internal strategy format (hidden from users):** one JSON Schema = single source of truth, validated in UI (TypeScript, zod/ajv) and engine (pydantic). No save/load feature in the MVP
6. **Validation gate:** no evaluation until the strategy validates against the schema and instrument profile; validation errors are shown in plain English
7. **Beginner mode**
   - Template gallery with plain-English explanation + rules table (Rule / Setting / What it means)
   - Templates: Simple Trend Follower (see §5), Higher-Timeframe Trend (1-hour), simple short straddle
   - Templates already contain all mandatory inputs, so one click on "Evaluate Strategy" runs them; "Customize" opens the builder
   - Tooltips on every field + glossary (ATM/ITM/OTM, premium, VIX, SL, etc.)
   - What-if sliders (SL %, target %) that re-run the evaluation
8. **Backtest engine:** costs, expiry calendar, lot sizes, session hours all from the instrument profile
9. **Report**
   - Equity curve, win rate, max drawdown, expectancy, worst losing streak
   - Breakdowns: year, volatility band, trend vs sideways, weekday/expiry day, CE vs PE
   - Plain-English summary of when and why it works or fails
   - "Settings used" panel: lots × lot size, costs, period, holding type, and which advanced options were off
   - Data source line (Kaggle dataset, date range read from the data)
   - Data gaps line: number of skipped days/minutes in the tested period
   - Risk-first layout
   - Short disclaimer on every report (see §3a)
10. **Suggestions engine:** parameter sweeps, loss-regime filters (e.g., exclude VIX < 12), comparison with standard alternatives; each suggestion is an edited copy of the strategy, re-run and shown side by side with a plain-English reason. Worded as educational analysis of past simulated results ("this change would have…"), never as a trade recommendation
11. **Overfitting guard**
   - Nifty weekly: tune 2019–2023, report Jan 2024 – 14 May 2026
   - Nifty monthly may use data from 2015
   - Flag "possibly overfit" when unseen-period results are much worse
   - Periods configurable per instrument
12. **Evaluation progress & engagement**
   - After "Evaluate Strategy", a progress screen shows stage messages ("Preparing data… Simulating trades… Building your report…") and a rough time estimate
   - While waiting, the user can read educational content inside the app (glossary, "What is drawdown?", "Why most strategies fail", "How option premiums decay") without leaving the tab
   - When ready: browser notification (if permitted) and tab title change ("✓ Report ready")
   - Clear warning: **"Keep this tab open. Closing it will lose your result."** (nothing is stored, so there is nothing to come back to)
13. **Download result**
   - Report downloadable as PDF, plus an optional CSV of individual trades
   - Generated in the browser, so the result never touches the server's storage
   - The download includes the settings used, data source and the short disclaimer
14. **Privacy: zero data storage**
   - No database, no server-side files, no accounts, no session data, no saved strategies or results
   - Uploaded files processed in memory only and discarded after extraction
   - Request bodies never logged on Vercel or AWS; AWS log retention set to the minimum; logs contain only technical errors without user content
   - No analytics or tracking cookies
   - Only thing kept: the disclaimer acceptance flag, in the user's own browser (on their device, not on Nikasha's servers)
   - Honest disclosure: uploaded strategy text is sent to a third-party AI service to read it, and that provider may retain it temporarily under its own policy

### Pricing (modelled premiums)
- PricingProvider interface, selected by instrument profile
- MVP: `BlackScholesVIXProvider`: per minute, spot, strike, India VIX as IV, minutes to expiry, configurable risk-free rate
- Future: `Black76Provider` (options on futures, MCX), `HistoricalVolProvider`, `RealOptionDataProvider`
- Every report: "Premiums modelled, not actual" badge + volatility ± 2 points sensitivity rerun
- Known limitation: VIX is a 30-day, near-ATM measure; skew and expiry-day IV are not captured, so expiry-day results are least reliable

### Data rules (Nifty 50 profile)
- Weekly Nifty options start in 2019; earlier years monthly-only
- Nifty weekly expiry: Thursday until contracts expiring from 1 Sep 2025, then Tuesday
- Lot size: taken from the user (pre-filled 65) and applied uniformly across the backtest, so no historical lot-size table is needed
- The data is pre-cleaned, but the loader still re-checks it on load (cheap safety net): schema/columns, sorted unique timestamps, session hours 09:15–15:29, OHLC consistency, non-positive prices; log and skip bad days, never crash
- **Never fill missing minutes with copied prices.** Handling rules:
  - Indicators are calculated on the candles that exist; a resampled candle is built from the minutes present
  - A minute where Nifty exists but VIX is missing: the option cannot be priced for that minute, so no entry or exit is evaluated there; exits move to the next minute that has both
  - A whole day without VIX (2019-07-02): skip the day entirely for trading
  - Every report states how many days/minutes were skipped in the tested period
- Weekend full sessions (budget days, 2024-01-20) are treated as normal trading days
- The intraday square-off at 15:15 always falls inside the data (last bar 15:29)
- CSV → Parquet conversion script kept in the repo; the raw-to-clean script (`clean.py`) and `cleaning_report.json` are kept in the repo for traceability

### Architecture & deployment
- Frontend: Next.js (React, TypeScript) on Vercel via GitHub
- Engine: Python on AWS Lambda as a container image; Parquet data baked in
- API: Lambda Function URL, CORS restricted to the Vercel domain
- Document parsing: LLM call from a Vercel serverless function
- Engine modules (all instrument-agnostic): data loader, instrument registry, indicator library, condition evaluator, pricing providers, backtest runner, report builder, suggestion engine
- Each backtest/variant = one Lambda call; sweeps and what-ifs run in parallel with a concurrency cap
- Infrastructure as code (e.g., AWS SAM)
- Portability: provider-agnostic Docker container + thin Lambda handler; can move to e.g. Cloud Run by swapping handler and deploy config
- Everything (code, infra, data script) in GitHub; nothing exists only in AWS

### Hosting constraints
- AWS Free plan: account closes 6 months after creation or when credits run out
- Lambda always-free: 1M requests + 400,000 GB-seconds/month; max 15 min and 10,240 MB per invocation; container images up to 10 GB
- New accounts: no free API Gateway, S3 or EC2 (credits only); reduced Lambda concurrency/memory quotas at first → retry with backoff
- Set an AWS billing alert on day one; avoid idle EC2 and NAT gateways

### Out of scope (MVP)
- Instruments other than Nifty 50 (design supports them)
- Live trading/broker integration, real option-chain data, user accounts, position adjustments/rolling

### Future scope
- Bank Nifty, Sensex, then MCX crude and other commodities
- Black-76 and historical-volatility pricing
- Cross-instrument comparison
- Real option-premium data
- Move the engine to a long-term host before the AWS Free plan ends

### Build order (finish each end to end before adding more)
1. Project-level specs (`constitution.md`, `product.md`, `architecture.md`, `frontend.md`, `backend.md`, `contracts/`) and the `07-privacy-and-legal` feature spec (it constrains every feature); then each other feature's spec just before it is built (see §7)
2. Instrument registry + NIFTY50 profile + data loader and checks
3. Backtest engine + tests (local first), using Simple Trend Follower
4. Report (incl. plain-English summary)
5. Deploy engine to Lambda + minimal Vercel page calling it (prove deployment early)
6. Disclaimer acceptance + Review & Evaluate screen + template gallery (beginner path)
7. Document upload + clarification (minimum-inputs logic), tested with the advanced sample strategy and a very short one-line strategy
8. Guided strategy builder: mandatory steps first, then advanced options (trader path)
9. Progress screen with educational content + PDF/CSV download
10. Suggestions + overfitting check + what-if sliders
11. Privacy audit (no storage, no payload logging) + README + final deploy

Scope warning: get one complete path working (build → validate → backtest → report → deploy) before adding breadth. A smaller, fully specified, tested, deployed app beats an ambitious half-finished one.

### Success criteria
- Public Vercel URL backed by the Lambda engine. End to end:
  - A beginner runs a template and reads the plain-English summary
  - A trader uploads a strategy document, answers clarifying questions, gets a report
  - A trader builds, validates, backtests and improves a strategy in the builder
- Spec set in `specs/` as defined in §7.2: constitution, complete `product.md`, architecture, contracts, traceability matrix, changelog, and one folder per feature with EARS requirements, design and tasks
- Evidence of the change process (§7.5): spec changes recorded in `CHANGELOG.md` before related code changes
- Users never see JSON, code or schemas anywhere in the UI
- Disclaimer shown and accepted on first visit, in the footer, and on every report
- Automated tests mapped to acceptance criteria, including:
  - *Given an uploaded strategy with a vague rule, when it is parsed, then the system asks a clarifying question and does not run a backtest until it is answered.*
  - *Given an uploaded strategy missing a mandatory input (e.g., stop-loss), when it is parsed, then the system asks for that input and does not default it.*
  - *Given an uploaded strategy that does not mention any advanced option, when it is parsed, then all advanced options are OFF, shown as "Not used", and no extra questions are asked.*
  - *Given holding type Intraday, when a position is still open at 15:15, then it is squared off at 15:15.*
  - *Given 2 lots and lot size 65, when a trade is simulated, then P&L is calculated on 130 quantity for every trade in the backtest period.*
  - *Given an evaluation is running, then the progress screen shows stage messages, educational content, and a "keep this tab open" warning.*
  - *Given a completed report, when the user clicks Download, then a PDF (and optional trades CSV) is generated in the browser, including settings, data source and disclaimer.*
  - *Given any upload or evaluation, then no user content is written to disk, a database or server logs.*
  - *Given the loaded data files, then the date range shown in the UI, reports and disclaimer equals the actual first and last timestamps in the data.*
  - *Given a backtest period that includes 2019-07-02 (no VIX data), then no trades are taken that day and the report lists it as skipped.*
  - *Given a minute with Nifty data but no VIX data, then no entry or exit is evaluated at that minute and no price is filled in.*
  - *Given the user chooses ITM with 100 points distance and Nifty at 24,500, when a Call is selected, then the strike used is 24,400 CE.*
  - *Given any mandatory input is missing, then the "Evaluate Strategy" button is disabled and the missing input is named.*
  - *Given a new instrument profile and data file, when it is registered, then strategies can be validated and backtested on it with no engine code changes.*
- README: the Nikasha story, setup, local run, deployment (Vercel + AWS), assumptions, limitations, how to add an instrument, and the full disclaimer from §3a. No other products named

---

## 3a. Legal disclaimer

### Full disclaimer (README, "Disclaimer" page, and first-visit acceptance)

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
> **Your data and privacy.** Nikasha does not store your strategies, uploaded files, evaluation results, session data or any personal data on its servers. Uploaded files are processed in memory only and discarded once your strategy has been read. To read uploaded strategy text, it is sent to a third-party AI service, which may retain it temporarily under its own privacy policy; do not upload personal or confidential information. Results exist only in your open browser tab until you download them. The only thing remembered is your acceptance of this disclaimer, stored in your own browser on your device.
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

### Short disclaimer (footer and every report)

> Educational use only. Not SEBI-registered; not investment advice. Not affiliated with NSE. Results are simulated backtests on unofficial Nifty 50 and India VIX data from Kaggle ([first date] – [last date], read from the data) with modelled option prices, and do not guarantee future returns. Nikasha stores none of your data. You are solely responsible for your trading decisions and any profits or losses.

### Where it appears
- **First visit:** full disclaimer with an "I understand and agree" checkbox; the app is not usable until accepted (acceptance remembered in the browser)
- **Footer:** short disclaimer on every page, linking to the full disclaimer page
- **Every report and every suggestion panel:** short disclaimer
- **README:** full disclaimer
- **Product behaviour must match the disclaimer:** no live signals, no "buy now / sell now" messages, no profit promises, no rankings of strategies as "best to trade"; suggestions are worded as "this change would have…" on past data

### Note
A disclaimer reduces risk but cannot make a product immune to legal challenge. Get it reviewed by a lawyer familiar with Indian securities law before any public or commercial launch.

---

## 4. Strategy JSON — internal format only, never shown to users (illustrative shape; the spec phase decides)

```json
{
  "name": "Simple Trend Follower",
  "underlying": "NIFTY50",
  "timeframe": "15m",
  "holding": "INTRADAY",
  "position": {"lots": 1, "lot_size": 65},
  "indicators": {
    "ema9": {"type": "EMA", "period": 9},
    "ema21": {"type": "EMA", "period": 21}
  },
  "entry_CE": {"all": [["ema9", "crosses_above", "ema21"]]},
  "entry_PE": {"all": [["ema9", "crosses_below", "ema21"]]},
  "legs": [{"action": "BUY", "option_type": "SIGNAL", "moneyness": "ATM", "distance_pts": 0, "expiry": "CURRENT_WEEKLY"}],
  "exit": {"sl": {"type": "PCT_PREMIUM", "value": 30}, "target": {"type": "PCT_PREMIUM", "value": 50}},
  "advanced": {
    "entry_window": ["09:30-14:30"],
    "daily": {"max_trades": 2}
  }
}
```
Notes: `option_type: "SIGNAL"` means CE on the CE condition and PE on the PE condition. The intraday 15:15 square-off is implied by `holding`. Any advanced option not present in `advanced` is OFF (never defaulted).

---

## 5. Test strategies

### 5a. Beginner template — "Simple Trend Follower"
*Plain words:* when the short-term average crosses above the longer-term average, buy a Call; when it crosses below, buy a Put. Exit at a fixed loss or profit; never hold overnight.

| Rule | Setting | What it means |
|---|---|---|
| Chart | 15-minute candles | Each candle = 15 minutes of price movement |
| Expiry | Current weekly | The nearest weekly contract |
| Holding | Intraday | Every position is closed the same day |
| Buy Call when | 9 EMA crosses above 21 EMA | Short-term trend turns up |
| Buy Put when | 9 EMA crosses below 21 EMA | Short-term trend turns down |
| Strike | ATM | Nearest to the Nifty price |
| Stop-loss | 30% of premium | Bought at ₹100 → exit at ₹70 |
| Target | 50% of premium | Exit at ₹150 |
| Entry window | 09:30 – 14:30 | Avoid the noisy open and late entries |
| Force exit | 15:15 | No overnight risk |
| Daily limit | Max 2 trades | Prevents overtrading |
| Size | 1 lot × 65 quantity | Smallest position at the current lot size (user can change) |

All 13 mandatory inputs are set, so the template runs in one click. Entry window and daily limit are advanced options the template turns on explicitly; they are shown to the user as part of the template's rules.

### 5b. Advanced sample — user's "Nifty 15-min weekly option buying" (provided as `samples/nifty_weekly_options_strategy.pdf` for the upload test)

Note for the upload test: the PDF ends with an unrelated footer line ("For medical advice or diagnosis, consult a professional"), copied from another tool. The extractor must ignore text that is not a trading rule, without asking about it.
- **Pre-market VIX sizing:** VIX < 12 → half size; 12–18 → standard; > 18 → "reduce significantly"
- **Indicators (15-min):** Supertrend (10, 2), EMA 9, EMA 21, RSI 14 (levels 55/45), ADX 14 (level 20)
- **CE entry (on candle close):** Supertrend turns green; EMA 9 above EMA 21; candle closes "decisively" above both EMAs; RSI > 55; ADX > 20 and rising if 20–30 (slope ignored if > 30)
- **PE entry:** mirror: Supertrend turns red; EMA 9 below EMA 21; close "decisively" below both; RSI < 45; same ADX rule
- **Strike:** ITM by 100 points (CE: 100 below spot; PE: 100 above)
- **SL:** trigger-candle low (CE) / high (PE) on the option premium chart, capped at 30–35 premium points
- **Target:** 1:1.5 risk-reward; trail SL to cost at 1:1
- **Discipline:** exit at market if neither SL nor target hit within 4 candles (60 min); no new entries 11:00–13:30; no trades after 12:00 on expiry day; max 2 trades/day; stop for the day after 2 SL hits

**Ambiguities the clarification flow must catch** (good demo material):
- "Closes decisively above" → threshold in points or %?
- SL cap "30–35" → one number
- VIX > 18 "reduce significantly" → exact %
- "Supertrend turns green" → only the flip candle, or any candle while green?
- ADX "slopes up" → vs how many candles back?
- "Thursday" → must become "expiry day" (expiry weekday changed in Sep 2025)
- Not stated at all → asked as mandatory: intraday or positional, number of lots, lot size, expiry (weekly is implied by the title; confirm)

### 5c. Minimal one-line sample (tests the minimum-inputs flow)
`samples/one_line_strategy.txt`: "Buy ATM Nifty call when RSI 14 crosses above 60 on 5-minute chart, stop-loss 30%."
Expected: system asks only for the missing mandatory inputs (target or time exit, intraday/positional, expiry, lots, lot size; PE side not used) and nothing about advanced options.

---

## 6. Open items for the spec phase
- Confirm the LLM provider/API key for document parsing (check course rules)
- Exact cost assumptions (slippage, brokerage, taxes) for Nifty options
- Expiry calendar source for 2015–2026
- Data rights: Kaggle uploader disclaims ownership ("research purpose only"); fine for this educational assignment, but a commercial launch needs a licensed data source from NSE Indices or an authorised vendor
- Confirm the chosen AI provider's data-retention policy and quote it accurately in the privacy text
- Risk-free rate value
- Definition of "trend vs sideways" periods for the regime breakdown
- Threshold for flagging "possibly overfit"
- Pre-filled values for evaluation settings (costs, backtest period) and how they are displayed for confirmation
- Legal review of the disclaimer before any public launch

---

## 7. How to work (instructions for Claude Code)

### 7.1 Start
Do NOT write application code yet. First ask clarifying questions, then produce the spec set in §7.2 for review, in this order, waiting for my approval after each step:
1. `constitution.md` and `product.md`
2. `architecture.md`, `frontend.md`, `backend.md` and `contracts/`
3. `features/07-privacy-and-legal/` first (it constrains everything), then each other feature folder just before it is built, following the build order in §3: `requirements.md` → `design.md` → `tasks.md`

This brief is the **source input** for the specs. Once the specs are approved, `specs/` becomes the single source of truth; the brief is kept for history only.

### 7.2 Spec structure (project-level docs + one folder per feature)

```
specs/
├── constitution.md          Non-negotiable principles every feature must obey (§7.3)
├── product.md               Complete project requirements in ONE file: problem, users, scope,
│                            data, non-functional requirements, glossary, out of scope,
│                            existing solutions & differentiation (no product names)
├── architecture.md          Big picture: system diagram, how FE and BE talk, Vercel + Lambda,
│                            data flow, portability, hosting limits, deployment
├── frontend.md              FE spec (cross-cutting only): tech stack, app shell and navigation,
│                            screen map, design system (colours, typography, components),
│                            state management (in-memory only, nothing persisted except the
│                            disclaimer flag), loading/error/empty states, accessibility,
│                            mobile responsiveness, tone of UI copy, browser-side PDF/CSV export
├── backend.md               BE spec (cross-cutting only): tech stack, engine module map
│                            (loader, indicators, conditions, pricing, backtest, report,
│                            suggestions), Lambda handler + portable container, instrument
│                            registry, error model, performance budgets, logging rules (no
│                            user content), LLM extraction service on Vercel
├── contracts/               Shared contracts used by all features
│   ├── api.openapi.yaml     THE frontend ↔ backend contract (endpoints, requests, responses, errors)
│   ├── strategy.schema.json Internal strategy format (never shown to users)
│   └── instrument.schema.json
├── traceability.md          Requirement ID → design section → task → test
├── CHANGELOG.md             Every spec change: date, IDs affected, what and why
└── features/                One folder per feature (numbers are IDs, not build order;
                             build order is in §3. 07-privacy-and-legal is specified first)
    ├── 01-data-and-engine/        data loading, gap rules, indicators, pricing, backtest   (REQ-DAT, REQ-ENG)
    ├── 02-evaluation-and-report/  review screen, Evaluate, progress, report, download      (REQ-EVL, REQ-RPT)
    ├── 03-strategy-builder/       minimum inputs, guided builder, strike selection         (REQ-INP)
    ├── 04-document-upload/        extraction, Found/Vague/Missing/Unsupported, questions   (REQ-UPL)
    ├── 05-beginner-mode/          templates, glossary, educational content, what-if        (REQ-BEG)
    ├── 06-suggestions/            sweeps, regime filters, alternatives, overfitting guard  (REQ-SUG)
    └── 07-privacy-and-legal/      zero storage, disclaimer, trademark, data source         (REQ-PRV)
```

Each feature folder contains:
- `requirements.md`: user stories; requirements in **EARS** format ("WHEN … THE SYSTEM SHALL …"), each with a unique ID (e.g., REQ-UPL-03); Given/When/Then acceptance criteria; edge cases and error handling
- `design.md`, with three fixed sections:
  - **Frontend:** screens, components, user flow, states for this feature (follows `frontend.md`)
  - **Backend:** modules, logic, algorithms for this feature (follows `backend.md`)
  - **Contract:** which endpoints/schema parts in `contracts/` this feature adds or uses
  - Plus error handling and testing strategy
- A feature that is purely one layer (e.g., `01-data-and-engine` is backend-only) says so and leaves the other section as "Not applicable"
- `tasks.md`: small ordered tasks, each tagged **[FE]**, **[BE]** or **[CONTRACT]**, referencing the requirement IDs it implements and the tests that prove it. Contract tasks come first, so FE and BE can then proceed independently

Rules:
- Frontend and backend are built against `contracts/` only, so either side can be developed and tested independently
- Keep files focused; cross-link instead of repeating. `frontend.md`/`backend.md` hold only what applies across features; feature-specific FE/BE details live in that feature's `design.md`
- The strategy schema must express both test strategies in §5 and separate mandatory inputs (§3, In scope item 1) from advanced options, which are OFF unless the user sets them

### 7.3 Constitution (must be the content of `constitution.md`)
1. **Spec first:** any change in behaviour updates the spec before the code (§7.5)
2. **Never guess:** vague or missing mandatory inputs are always asked; nothing is invented
3. **No hidden defaults:** advanced options are OFF unless the user sets them; pre-filled values (lots, lot size, costs, period) are always shown for confirmation
4. **No technical exposure:** users never see JSON, code or schemas
5. **Zero data storage:** no strategies, files, results, sessions or personal data stored or logged
6. **Honesty:** modelled premiums, data source and data gaps are always disclosed; disclaimer everywhere it is specified
7. **No fabricated data:** missing market data is never filled with copied or estimated prices
8. **Educational, not advisory:** no signals, recommendations or profit promises
9. **No product names:** other products are never named in the app, specs or docs
10. **Instrument-agnostic:** no instrument-specific logic in engine code; everything comes from instrument profiles
11. **Test-backed:** every requirement has at least one test, tracked in `traceability.md`

### 7.4 Quality gates (before a feature's tasks are approved)
- **Clarify:** list any underspecified points in the feature and ask me before finalising
- **Consistency check:** confirm the feature's requirements, design, tasks and contracts don't contradict each other, `product.md`, `architecture.md` or the constitution; report what was checked

### 7.5 Change process (after specs are approved)
1. I describe the change
2. Classify it:
   - **Behaviour change** (what the user sees or what the system does) → continue with step 3
   - **Bug fix** (code doesn't match an existing requirement) → fix the code and add a test for that requirement; no spec change
   - **Refactor, typo or styling** with no behaviour change → no spec change
3. Propose the spec update: affected requirement IDs, new or changed EARS statements and acceptance criteria, design/contract impact. **Wait for my approval**
4. Update `CHANGELOG.md`, then design, contracts, tasks and `traceability.md` as needed; run the consistency check
5. Update or add tests, then change the code
6. Confirm every changed requirement has a passing test

### 7.6 CLAUDE.md
Once the specs are approved, create a `CLAUDE.md` in the repo root that:
- Points to `specs/constitution.md`, `specs/product.md`, `specs/architecture.md`, `specs/frontend.md`, `specs/backend.md` and `specs/contracts/`
- States the change process from §7.5, including: *"Before changing code, decide whether the change alters behaviour. If it does, propose the spec update first and wait for approval."*
- Lists how to run the tests locally

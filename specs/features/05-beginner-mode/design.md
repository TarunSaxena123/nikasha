# Feature 05 — Beginner Mode: Design

Status: **Approved under delegation 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) (REQ-BEG-01…18) · Follows [`frontend.md`](../../frontend.md), feature 02 design (review, evaluate, report), feature 07 design (gate, legal texts)

---

## 1. Frontend

### 1.1 Intro page (`/`, open route) — layout and draft copy (BEG-01, 02)

All copy lives in `web/src/copy/intro.ts` and is scanned against `banned-phrases.txt` and the hashed name list (feature 07). `{first}`/`{last}` come from `/v1/meta`; while loading, the sentence omits dates (`frontend.md` §3).

1. **Hero.** "**Nikasha** — The touchstone for your trading strategy." · "Test a Nifty 50 options strategy on past market data and see *why* it worked or failed, not just whether it did." · **[Get started]**
2. **What Nikasha is** (four numbered steps with icons): **Describe** your strategy: pick a template, build it step by step, or upload your notes. · **We ask** about anything unclear; nothing is guessed. · **We test it** on Nifty 50 and India VIX data from {first} to {last}, with modelled option prices. · **We explain** the results: risk first, then when and why it worked or didn't.
3. **How it helps** (five cards):
   - **Never guesses.** Vague rules like "exit decisively" become a question, not an assumption.
   - **Explains why.** Results by year, volatility level, trending vs sideways days, weekday and expiry day.
   - **Risk first.** Largest fall and losing streaks come before profit.
   - **Checks for overfitting.** Results on recent years the rules weren't tuned on.
   - **Learn as you go.** Templates, a glossary and what-if sliders.
4. **How to get the best from it** (tips):
   - Write exact numbers: "stop-loss 30 points", not "tight stop".
   - Start with the full period, then narrow it.
   - Read the risk section before the profit.
   - Trust results that also hold up in the unseen recent period.
   - Few trades means little evidence.
   - Move the what-if sliders to see how fragile a rule is.
   - Keep the tab open and download the PDF before closing.

   → "Read the full guide: How to use Nikasha".
5. **What Nikasha is not:**
   - Not investment advice, and no live buy or sell signals.
   - Option prices are modelled, not real market prices.
   - Past results, real or simulated, don't predict the future.
6. **Your data and our data:**
   - "Nikasha stores nothing you enter. Your strategy and results live only in this browser tab."
   - `DataSourceLine` (feature 07).
   - Link to the full disclaimer.
7. **[Get started]** again.

Layout: the hero fills the first viewport on desktop and phone; the sections below are short blocks, at most about 60 words each. Both buttons link to `/start`, which is gated (feature 07 handles the disclaimer).

### 1.2 Choose a path (`/start`, gated) (BEG-03)

Three equal cards (stacked on phones):

| Card | Suits | Next |
|---|---|---|
| **Templates** | New to options | "Pick a ready-made strategy, explained in plain words. Run it in one click." → `/templates` |
| **Build a strategy** | Have rules in your head | "Answer a few steps: basics, strike, entry, exit. Add advanced options only if you want them." → `/build` |
| **Upload your strategy** | Have rules written down | "Upload a PDF, Word or text file, or paste it. We'll read it and ask about anything unclear." → `/upload` |

### 1.3 Templates (BEG-04–08)

**Data.** One folder per template in `web/src/templates/<id>/`:
- `strategy.json` — the strategy; also copied into `specs/contracts/fixtures/strategies/valid/` so both test suites validate it (feature 01 T-DAT-02).
- `meta.ts` — `{ id, name, priority: "P0"|"P1"|"P2", explanation, riskNote, whatItMeans: { [ruleKey]: string } }`. `whatItMeans` overrides `describeStrategy`'s generic text with template-specific examples (e.g. "Bought at ₹100 → exit at ₹70").
- A build-time list `AVAILABLE_TEMPLATES` includes only built templates, so a template cut for time simply doesn't appear (and is "Not built" in `traceability.md`).

| Template | strategy.json | Explanation (draft) | Risk note (draft) |
|---|---|---|---|
| Simple Trend Follower (P0) | `strategy.schema.json` example 1 | "When the short-term average price crosses above the longer-term average, buy a call; when it crosses below, buy a put. Exit at a fixed loss or profit, and never hold overnight." | "Trend signals often reverse quickly on sideways days, which can mean several small losses in a row." |
| Higher-Timeframe Trend (P1) | §5 below (validated) | "The same crossover idea on 1-hour candles, used only when the trend is strong (ADX above 20). Trades are held overnight until a stop, a target, or midday on expiry day." | "Holding overnight means gaps: the market can open far beyond your stop-loss." |
| Simple short straddle (P2) | `strategy.schema.json` example 3 | "Sell both an at-the-money call and put at 09:20 to collect premium, betting the market stays quiet. Both close together at a combined stop-loss or at 15:15." | **Prominent:** "Selling options can lose much more than the premium you receive. A single big move can wipe out many small gains." |

**Card.**

```
┌ Simple Trend Follower ───────────────────────────────┐
│ Explanation · Risk note                               │
│ Rules table (Rule / Setting / What it means)          │
│ You'll evaluate with: 1 lot × 65 = 65 quantity        │
│   Costs: ₹20/order brokerage, STT 0.15% (sell) … [details]
│   Period: 11 Feb 2019 – 14 May 2026 (full range)      │
│ [ Use this template ]                      [ Customize ]   │
└───────────────────────────────────────────────────────┘
```

- **Use this template (D1).** Builds the draft from `strategy.json`, sets `confirmed = { lots, lotSize }`, builds the settings from meta (default period for the expiry kind, all default costs, no capital), sets `settings.checked = true`, and opens `/review`. The review screen therefore shows the template with nothing left to confirm, and one click on **Evaluate Strategy** runs it with exactly the values displayed on the card (AC-BEG-04). Disabled until meta has loaded. Changing any setting on the review screen clears `settings.checked` as usual (feature 02 D2).
- **Customize** loads the draft with nothing confirmed and goes to `/build?step=basics`.
- The straddle's risk note sits in a `--risk`-bordered callout with a warning icon, above the buttons (BEG-08).

### 1.4 Glossary and tooltips (BEG-09–11)

- `web/src/copy/glossary.ts`: `{ slug, term, aliases[], definition }[]`. It covers all `product.md` §16 terms, including VWAP with the feature-wide explanation.
- `/learn` shows the glossary alphabetically, with an A–Z jump bar and `id={slug}` anchors (D6).
- **Marking terms in copy:** catalogue strings use `[[slug]]` or `[[slug|shown text]]`. A tiny parser renders these as `<GlossaryTerm slug>`. `GlossaryTerm` is a Radix Popover opened by hover, focus or tap, with a dotted underline and the definition.
- `web/src/copy/tooltips.ts`: one entry per builder field id and per report metric key. The ids come from typed enums (`BuilderFieldId`, `ReportMetricKey`), so a coverage test can enumerate them (AC-BEG-08).

### 1.5 Learn articles (BEG-12, 13; D5)

`web/src/content/learn/<slug>.md` with front-matter `title`, `summary` (≤ 30 words), `minutes`. They are rendered at build time with a small markdown renderer (no remote content) and may use `[[glossary]]` links.

| Slug | Outline |
|---|---|
| `how-to-use-nikasha` | The three paths · What happens when you're asked a question · Reading the review screen · Reading the report (risk first, breakdowns, overfitting, sensitivity) · Using what-if · Downloading before you close |
| `what-is-drawdown` | Peak-to-trough fall · Worked example with ₹ figures · Why drawdown matters more than average profit · Losing streaks |
| `why-most-strategies-fail` | Costs and slippage · Overfitting to the past · Regime change · Too few trades · Ignoring risk |
| `how-option-premiums-decay` | Time value and theta · Why decay speeds up near expiry · Why buying options is fighting the clock · Expiry-day behaviour |
| `what-is-overfitting` | Rules that fit noise · The tuning vs unseen split in Nikasha · What "possibly overfit" means · How to read it |
| `modelled-vs-real-prices` | Why Nikasha models prices · Black-Scholes in one paragraph · India VIX as volatility · Limits (skew, expiry day) · The ±2 VIX sensitivity |

All articles are written in past-simulated, educational language and are reviewed by the owner before release (`docs/release-checklist.md`, feature 07). The progress screen shows cards for `what-is-drawdown`, `why-most-strategies-fail` and `how-option-premiums-decay`; a card opens the article in an in-page panel (BEG-13).

### 1.6 What-if panel (report page slot, BEG-14–18; D4)

```
┌ What if…? ───────────────────────────────────────────────────────┐
│ Stop-loss (% of premium)   10 ──────●────────── 60    [30 → 25]   │
│ Target (% of premium)      20 ────────────●──── 150   [50]        │
│                                                                   │
│            Original    What-if                                    │
│ Net P&L    +₹41,250    +₹38,900                                   │
│ Win rate   43.2%       39.8%                                      │
│ Max drawdown −₹18,400   −₹16,950                                  │
│ Expectancy +₹96        +₹88                                       │
│ Trades     430         431                                        │
│ "With a stop-loss of 25% instead of 30%, this strategy would have │
│  made ₹38,900 (₹2,350 less), with a largest fall of ₹16,950."     │
│ [ Use these settings ]                        Short disclaimer    │
└───────────────────────────────────────────────────────────────────┘
```

- **Which sliders.** One slider per stop-loss or target of type `PCT_PREMIUM` or `POINTS`. Ranges: SL % 10–60 step 5; target % 20–150 step 10; SL points 5–100 step 5; target points 10–200 step 10. A range is extended to include the strategy's own value if it lies outside. Radix Slider (keyboard accessible), with the current and original value shown as text.
- **One change at a time.** Moving one slider resets the other to its original value, so each what-if differs from the original in exactly one value and the sentence stays truthful.
- **Requests.** `whatIf` store slice `{ requestId, field, value, status, report }`. Debounce 600 ms after the last change; then `POST /v1/evaluate` with a deep copy of the strategy with one value changed and the **same** settings, through the same client (backoff on 429/503; AbortController cancels the previous request; stale responses dropped by request id) (BEG-15).
- **Comparison and sentence.** A fixed template in `web/src/copy/whatif.ts`: "With a {fieldLabel} of {new} instead of {old}, this strategy would have {made|lost} {abs_net} ({diff} {more|less}), with a largest fall of {max_dd}." Signs, no colour-only (BEG-16).
- **Use these settings** replaces the draft's strategy with the what-if strategy, keeps existing confirmations (lots, lot size and settings are unchanged), and navigates to `/review`. Nothing is evaluated (BEG-17).
- **Not applicable** (BEG-18): "What-if sliders work when the stop-loss or target is set in % of premium or in points. This strategy uses {types}."

### 1.7 Back links (BEG-19, added 2026-10-15)
- One shared component, `BackLink`, renders "← Back to <page>" as the first element of the page content (a plain link, keyboard reachable, before the page heading). Targets come from one table in `web/src/lib/navigation.ts` that mirrors `frontend.md` §2.1, so every page uses the same rule.
- Targets are routes in the flow, not browser history, so a refresh or a shared link still gives a sensible way back. In-app navigation keeps the Zustand store, so the draft and the report survive.
- Review's target depends on the draft's `origin`: TEMPLATE → Templates, BUILDER → Builder at its last step, UPLOAD → Upload. The builder's target is the previous step (first step → Choose a path); "Back to review" replaces it when the builder was opened from review.
- The report page offers "View report" on the review screen while a report for the unchanged draft is held, so going back is never a dead end.
- The evaluating screen has no Back link; its Cancel already returns to review.

## 2. Backend

**Not applicable.** Templates are static web data; what-if uses the existing `POST /v1/evaluate` unchanged. The engine validates every template through the shared fixtures (feature 01 T-DAT-02).

## 3. Contract

- No new endpoints or schema changes.
- Adds `higher-timeframe-trend.json` to `specs/contracts/fixtures/strategies/valid/`. The Simple Trend Follower and short straddle are already there.
- Uses `/v1/meta` (data range, default periods and costs) and `POST /v1/evaluate` → `Report`.

## 4. Error handling

| Situation | Behaviour | Req. |
|---|---|---|
| Meta not loaded | Card values show "loading…"; Use this template disabled | 06 |
| What-if request fails or is busy | Panel shows "Couldn't run this what-if. Try again." with Retry; the original report is untouched | 15, 17 |
| Article markdown references an unknown glossary slug | Build fails (test), so it never ships broken | 10, 12 |

## 5. Higher-Timeframe Trend — `strategy.json` (validated against `strategy.schema.json`, 2026-10-14)

```json
{"schema_version":"1.0","name":"Higher-Timeframe Trend","origin":"TEMPLATE","template_id":"higher-timeframe-trend",
 "underlying":"NIFTY50","timeframe_min":60,"holding":"POSITIONAL","position":{"lots":1,"lot_size":65},
 "indicators":{"ema9":{"type":"EMA","period":9,"source":"close"},"ema21":{"type":"EMA","period":21,"source":"close"},
               "adx14":{"type":"ADX","period":14}},
 "legs":[{"action":"BUY","option_type":"SIGNAL","expiry":"NEXT_WEEKLY",
          "strike":{"method":"MONEYNESS","moneyness":"ATM","distance_pts":0}}],
 "entry":{"ce":{"type":"all","conditions":[
            {"type":"cross","left":{"ind":"ema9","output":"value"},"direction":"above","right":{"ind":"ema21","output":"value"}},
            {"type":"compare","left":{"ind":"adx14","output":"value"},"op":"gt","right":{"const":20}}]},
          "pe":{"type":"all","conditions":[
            {"type":"cross","left":{"ind":"ema9","output":"value"},"direction":"below","right":{"ind":"ema21","output":"value"}},
            {"type":"compare","left":{"ind":"adx14","output":"value"},"op":"gt","right":{"const":20}}]}},
 "exit":{"stop_loss":{"type":"PCT_PREMIUM","value":30},"target":{"type":"PCT_PREMIUM","value":60},
         "time_exit":{"at":"12:00","on":"EXPIRY_DAY"}}}
```

## 6. Testing strategy

| Area | Tests | ACs |
|---|---|---|
| Intro | Playwright: section order, both buttons, meta dates; copy scans (banned phrases, hashed names, no literal date range) | AC-BEG-01 |
| Choose a path | Playwright: three cards and links | AC-BEG-02 |
| Templates | Template files validate (schema + SEM) in both suites; card content; Use this template opens review fully confirmed and one Evaluate click sends exactly the displayed values; Customize route | AC-BEG-03–06 |
| Glossary/tooltips | Coverage of §16 terms; popover on hover and focus (axe); tooltip coverage over the `BuilderFieldId` / `ReportMetricKey` enums; unknown-slug build failure | AC-BEG-07, 08 |
| Articles | Existence, word count 300–700, banned-phrase scan; progress cards | AC-BEG-09 |
| What-if | Playwright with a mocked engine: debounce timing, single changed field, cancel-on-move, comparison and sentence, original untouched, Use these settings, not-applicable text | AC-BEG-10–13 |

## 7. Consistency check

Checked against `constitution.md` (§3, §4, §8, §9), `product.md` §6.5, §6.6, §16, `frontend.md` §3, §5, §6, §13, feature 02 (confirmation rules D2, evaluate flow, report slots) and feature 07 (gate, legal components, scans). Findings:
- `product.md` §6.5–§6.6 "all paths end at Review" and "one click on Evaluate Strategy" are both met by D1 without weakening the "pre-filled values are shown for confirmation" rule (constitution §3): the values are shown on the card and again on the review screen.
- What-if changes one value at a time, so the "would have" sentence always describes exactly one change (constitution §6, honesty).
- No contract change beyond adding a valid fixture.

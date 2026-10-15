# Feature 05 — Beginner Mode: Requirements

Status: **Approved under delegation 2026-10-14** (owner delegated approval of the remaining specs; decisions in §6 may be revisited) · Created 2026-10-14 · Prefix: **REQ-BEG** · Layers: **frontend** (templates are static data; what-if re-uses `/v1/evaluate`) · Priority: P0 (intro, Choose a path, Simple Trend Follower, glossary, tooltips, learning cards), P1 (Higher-Timeframe Trend, more articles, what-if sliders — raised from P2 by owner decision 2026-10-14), P2 (short straddle)

Implements [`product.md`](../../product.md) §3 (beginner user), §6.5 (intro, Choose a path), §6.6 (templates), §16 (glossary) and the beginner items of §4, within [`frontend.md`](../../frontend.md) §3, §5, §13. Uses feature 02 (review, evaluate, report) and feature 07 (gate, legal texts). Obeys [`constitution.md`](../../constitution.md) §3, §4, §8, §9.

---

## 1. User stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-BEG-1 | first-time visitor | a clear intro to what Nikasha is and how to use it well | I know what to expect before I start |
| US-BEG-2 | beginner | to pick a ready-made strategy explained in plain words and run it quickly | I can learn without building anything |
| US-BEG-3 | beginner | every term explained where I meet it | jargon doesn't stop me |
| US-BEG-4 | beginner | short articles on why strategies fail, drawdown and premium decay | I learn the ideas behind the numbers |
| US-BEG-5 | any user | to drag a stop-loss or target slider and see how the past result would have changed | I see how fragile or robust a rule is |
| US-BEG-6 | trader | to start from a template and change it | I don't build from scratch |

## 2. Requirements

### 2.1 Intro page and Choose a path

| ID | Requirement |
|---|---|
| REQ-BEG-01 | THE intro page (`/`) SHALL show, in order: hero (name, tagline, one sentence on what Nikasha does, **Get started**); what Nikasha is (four steps); how it helps (five points); how to get the best from it (tips, link to the "How to use Nikasha" article); what Nikasha is not; your data and our data (data source and range from `/v1/meta`); **Get started** again — with the content of `product.md` §6.5. |
| REQ-BEG-02 | THE intro page SHALL contain no "first of its kind" claim, no other product's name, no profit promise and no hardcoded date range. |
| REQ-BEG-03 | THE Choose a path page (`/start`) SHALL show three options — **Templates**, **Build a strategy**, **Upload your strategy** — each with who it suits ("New to options", "Have rules in your head", "Have rules written down") and one sentence on what happens next. |

### 2.2 Templates

| ID | Requirement |
|---|---|
| REQ-BEG-04 | THE template gallery (`/templates`) SHALL show one card per available template with: name; a plain-English explanation (2–4 sentences); a risk note; and a rules table (Rule / Setting / What it means) that includes every advanced option the template turns on. |
| REQ-BEG-05 | THE templates SHALL be: **Simple Trend Follower** (exact rules in `product.md` §6.6), **Higher-Timeframe Trend** and **Simple short straddle**, with rules as decided in §6 (D2, D3). Each SHALL set all 13 mandatory inputs and validate against the strategy schema and SEM rules. |
| REQ-BEG-06 | WHERE a template card is shown, THE card SHALL display the values it will confirm (lots × lot size, costs summary, period) and offer **Use this template**, which opens the review screen (feature 02) with the template loaded and exactly those displayed values already confirmed, so that one click on **Evaluate Strategy** runs it (D1). |
| REQ-BEG-07 | THE card SHALL also offer **Customize**, which opens the guided builder at step 1 with the template loaded and nothing confirmed. |
| REQ-BEG-08 | THE short straddle card SHALL show a prominent risk note that selling options can lose much more than the premium received. |

### 2.3 Glossary, tooltips and learning content

| ID | Requirement |
|---|---|
| REQ-BEG-09 | THE Learn section (`/learn`) SHALL contain a glossary of at least every term in `product.md` §16 (incl. the VWAP note), each with a one- or two-sentence plain-English definition, listed alphabetically with jump links. |
| REQ-BEG-10 | WHERE a glossary term appears in UI copy (builder, review, report, templates), THE web app SHALL mark it as a `GlossaryTerm` that shows its definition on hover, focus or tap. |
| REQ-BEG-11 | THE web app SHALL give every input field and every report metric a tooltip in plain English, from one copy catalogue. |
| REQ-BEG-12 | THE Learn section SHALL contain the six articles listed in §6 D5, each 300–700 words, plain English, past-tense and educational (no advice), written by the assistant and reviewed by the owner. |
| REQ-BEG-13 | THE progress screen (feature 02) SHALL show three of these articles as cards ("What is drawdown?", "Why most strategies fail", "How option premiums decay"), readable in place. |

### 2.4 What-if sliders

| ID | Requirement |
|---|---|
| REQ-BEG-14 | WHERE a report exists and the strategy's stop-loss and/or target is in % of premium or premium points, THE report SHALL show a **What-if** panel with a slider for each such value, ranges and steps as decided in §6 D4, starting at the strategy's own value (if that value lies outside the range, the range is extended to include it). |
| REQ-BEG-15 | WHEN a slider settles (no movement for 600 ms), THE web app SHALL evaluate a copy of the strategy with only that value changed, using the same settings and period, via `POST /v1/evaluate`, cancelling any earlier what-if request still running. |
| REQ-BEG-16 | WHEN the what-if result arrives, THE panel SHALL show the original and the what-if side by side for net P&L, win rate, max drawdown, expectancy and trades, with a sentence of the form "With a stop-loss of 25% instead of 30%, this strategy would have…", and the short disclaimer. |
| REQ-BEG-17 | THE what-if panel SHALL NOT change the original report, and SHALL offer **Use these settings** to load the changed strategy into the review screen (nothing evaluated automatically). |
| REQ-BEG-18 | IF the strategy has no %-or-points stop-loss or target (e.g. trigger-candle stop and R:R target only), THEN THE panel SHALL explain that what-if sliders work with % or points values. |

### 2.5 Finding your way back (added 2026-10-15, owner request)

| ID | Requirement |
|---|---|
| REQ-BEG-19 | WHILE any page other than the intro is shown, THE app SHALL show a "← Back to <page>" link at the top of the page content that leads to that page's parent in the flow (`frontend.md` §2.1), not to the browser history, and SHALL keep the strategy and report held in the tab. |

## 3. Acceptance criteria

| AC | Req. | Given / When / Then |
|---|---|---|
| AC-BEG-01 | 01, 02 | **Given** `/`, **then** the seven sections appear in order, both Get started buttons work, the data range equals the meta fixture, and a scan finds no banned phrase, product name or literal date range. |
| AC-BEG-02 | 03 | **Given** `/start` (after acceptance), **then** three options with their "suits" lines link to `/templates`, `/build`, `/upload`. |
| AC-BEG-03 | 04, 05 | **Given** `/templates`, **then** each available template shows name, explanation, risk note and a rules table listing its advanced options; each template file validates against the schema and SEM rules. |
| AC-BEG-04 | 06 | **Given** the Simple Trend Follower card, **then** it shows "1 lot × 65", the cost summary and the period; **when** Use this template is clicked, **then** the review screen opens with the template, lots, lot size, costs and period confirmed and **Evaluate Strategy** enabled; **when** Evaluate Strategy is clicked once, **then** the evaluation starts and the request carries exactly the displayed values. |
| AC-BEG-05 | 07 | **Given** a card, **when** Customize is clicked, **then** the builder opens at step 1 with the template loaded and lots, lot size, costs and period unconfirmed. |
| AC-BEG-06 | 08 | **Given** the short straddle card, **then** the risk note about losses beyond the premium is visible above its buttons. |
| AC-BEG-07 | 09, 10 | **Given** `/learn`, **then** every `product.md` §16 term is defined; **given** the review screen, **then** "ATM" shows its definition on hover and on keyboard focus. |
| AC-BEG-08 | 11 | **Given** the copy catalogue, **then** every builder input and report metric key has a tooltip (test fails on any missing key). |
| AC-BEG-09 | 12, 13 | **Given** `/learn`, **then** each listed article exists, is within 300–700 words, and passes the banned-phrase scan; the progress screen shows the three named cards. |
| AC-BEG-10 | 14, 15, 16 | **Given** a Simple Trend Follower report, **when** the SL slider is moved from 30 to 25 and released, **then** after 600 ms one evaluate request is sent with SL 25 and everything else unchanged, and the panel shows original vs what-if with the "would have" sentence and disclaimer. |
| AC-BEG-11 | 15 | **Given** a what-if request running, **when** the slider is moved again, **then** the earlier request is cancelled and only the latest result is shown. |
| AC-BEG-12 | 17 | **Given** a what-if result, **then** the original report is unchanged; **when** Use these settings is clicked, **then** the review screen opens with the changed strategy and nothing is evaluated. |
| AC-BEG-13 | 18 | **Given** the advanced sample (trigger-candle SL, R:R target), **then** the what-if panel shows the explanation instead of sliders. |
| AC-BEG-14 | 19 | **Given** each page in `frontend.md` §2.1, **then** a Back link at the top names its target and leads there; **given** a report, **when** Back to review is clicked and then Evaluate is not clicked, **then** the draft is unchanged and the report can be reopened. |

## 4. Edge cases

| Case | Expected | Req. |
|---|---|---|
| Template uses weekly expiry; meta not yet loaded | Card shows "loading…" for period/costs; Use this template disabled until loaded | 06 |
| User changes nothing on Customize and returns to review | Values remain unconfirmed until confirmed there (feature 02 D2) | 07 |
| What-if slider moved while the engine is busy (429) | Same backoff as feature 02; the panel shows "busy" without affecting the original report | 15 |
| Template's period for "full range" changes when new data is added | Period comes from meta, never stored in the template | 06 |
| Very fast slider movements | Debounce prevents a request per pixel; at most one in flight | 15 |

## 5. Out of scope for this feature

- Saving templates or custom strategies (no saving anywhere).
- User-submitted templates.
- Video or interactive tutorials.

## 6. Clarify gate — decisions (taken under the owner's delegation, 2026-10-14; may be revisited)

| # | Question | Decision |
|---|---|---|
| D1 | One click vs confirmation | **Owner decision (review, 2026-10-14):** the card **shows** lots × lot size, costs summary and period; **Use this template** opens the review screen with exactly those values confirmed, so one click on **Evaluate Strategy** runs it — matching the brief ("one click on Evaluate Strategy") and `product.md` §6.5 (all paths end at Review & Evaluate). **Customize** opens the builder (REQ-BEG-06, 07). |
| D2 | Higher-Timeframe Trend rules | 60-minute candles · buy ATM CE when EMA 9 crosses above EMA 21 **and** ADX 14 > 20; ATM PE on the mirror · next weekly expiry · positional · SL 30% of premium · target 60% · time exit 12:00 on expiry day · 1 lot × 65 · no other advanced options. |
| D3 | Short straddle rules | 5-minute candles · sell ATM CE + ATM PE at 09:20 · current weekly · intraday (15:15 square-off) · combined SL 30% of combined premium · no target · 1 lot × 65 · no other advanced options. |
| D4 | What-if slider ranges | SL %: 10–60, step 5 · Target %: 20–150, step 10 · SL points: 5–100, step 5 · Target points: 10–200, step 10 · for any strategy using these types; one what-if at a time. |
| D5 | Learn articles | How to use Nikasha · What is drawdown? · Why most strategies fail · How option premiums decay · What is overfitting? · Modelled vs real option prices — drafted by the assistant, reviewed by the owner before release. |
| D6 | Glossary search | Not in the MVP; A–Z list with jump links and in-place popovers. |

# Nikasha — Frontend Specification (cross-cutting)

Status: **Approved 2026-10-14** · Created 2026-10-14 · Obeys [`constitution.md`](constitution.md), [`product.md`](product.md), [`architecture.md`](architecture.md)

Only what applies across features lives here. Each feature's screens, components and flows are in its `design.md` → **Frontend** section.

---

## 1. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router), React, TypeScript `strict` | Current stable versions, pinned in `web/package.json` at setup |
| Hosting | Vercel | `architecture.md` §5.1 |
| Styling | Tailwind CSS with design tokens as CSS variables (§5) | |
| Accessible primitives | Radix UI (dialog, tooltip, popover, tabs, radio group, slider, accordion) | Keyboard and screen-reader behaviour built in |
| Charts | Recharts (SVG) | Every chart has a data-table alternative (§9) |
| PDF export | jsPDF + svg2pdf.js (charts embedded as vectors) + jspdf-autotable (tables) | Generated in the browser (§11) |
| CSV export | Small RFC 4180 serializer, downloaded as a Blob | |
| Strategy validation | Ajv (JSON Schema 2020-12) compiled from `specs/contracts/strategy.schema.json`, plus `strategyRules.ts` implementing `contracts/strategy-rules.md` | Same files the engine uses |
| Types | Generated from the JSON Schemas and `api.openapi.yaml` (json-schema-to-typescript, openapi-typescript) | Never hand-written; CI checks they are current |
| State | Zustand store with **no persistence middleware** | §4 |
| Fonts | Inter (UI) via `next/font`, self-hosted at build | No runtime request to a font CDN |
| Unit tests | Vitest + Testing Library | |
| End-to-end | Playwright + axe-core accessibility checks | |

## 2. App shell and navigation

```
┌─────────────────────────────────────────────────────────────┐
│ Nikasha · The touchstone…        Learn   [ Get started ]    │  ← header (logo → intro page; Learn → /learn;
│                                                             │     Get started → /start, via the disclaimer if needed)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   page content                                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Short disclaimer (data dates read from /v1/meta) · Full     │  ← footer on every page
│ disclaimer · Data source · Engine version                   │
└─────────────────────────────────────────────────────────────┘
```

- **Disclaimer gate (feature 07):** the intro page (`/`), `/disclaimer` and `/learn` are open to everyone. Every other route is **gated**: until the disclaimer is accepted, it renders the full disclaimer with an "I understand and agree" checkbox and a Continue button, then continues to the route the visitor asked for (e.g. Get started → disclaimer → `/start`). A gated route never shows its content, even briefly, before acceptance is confirmed.

```
First visit:      /  ─[Get started]─►  disclaimer gate  ─[I agree]─►  /start  ─►  /templates · /build · /upload
Returning visit:  /  ─[Get started]─►  /start
Direct link:      /build (not accepted)  ─►  disclaimer gate  ─[I agree]─►  /build
```
- The header shows a small **step indicator** on the strategy paths: *Choose → Rules → Review → Evaluate → Report*.

### 2.1 Back links (REQ-BEG-19)

Every page except the intro starts with "← Back to <page>", leading to the page's parent in the flow (not the browser history). In-app navigation keeps the draft and report.

| Page | Back link goes to |
|---|---|
| `/start` Choose a path | Intro (`/`) |
| `/templates`, `/upload`, `/build` (first step) | Choose a path |
| `/build` (later steps) | The previous step; "Back to review" instead when opened from review |
| `/review` | Where the strategy came from: Templates, Builder (last step) or Upload |
| `/evaluate` | None; Cancel returns to review |
| `/report` | Review (the report stays in the tab until the next evaluation) |
| `/learn/<article>` | Learn |
| `/learn`, `/disclaimer` | Intro |

## 3. Screen map

| Route | Screen | Feature | Gated | Needs in-memory state |
|---|---|---|---|---|
| `/` | **Intro (home):** what Nikasha is, how it helps, how to get the best from it, what it is not, your data; **Get started** at top and bottom (`product.md` §6.5) | 05 | No | — |
| `/start` | **Choose a path:** Templates · Build · Upload, with "which is for you" guidance | 05 | Yes | — |
| `/templates` | Template gallery: cards with plain-English explanation and rules table | 05 | Yes | — |
| `/build` | Guided builder; steps 1–4 + Advanced (`?step=` keeps the step in the URL) | 03 | Yes | Draft strategy |
| `/upload` | Upload or paste → extraction → Found/Vague/Missing/Unsupported list → questions | 04 | Yes | Extraction result |
| `/review` | Review & Evaluate: plain-English rules table, evaluation settings, "Not used" advanced options, **Evaluate Strategy** | 02 | Yes | Complete draft |
| `/evaluate` | Progress screen with stage messages, learning content and "keep this tab open" | 02 | Yes | Running evaluation |
| `/report` | Report (risk first), what-if sliders, suggestions, downloads | 02 / 05 / 06 | Yes | Report |
| `/learn`, `/learn/[slug]` | Glossary and short articles, incl. "How to use Nikasha" | 05 | No | — |
| `/disclaimer` | Full disclaimer | 07 | No | — |

**Intro page layout:** a hero (name, tagline, one sentence, **Get started**) fills the first screen on desktop and phone; the remaining sections follow as short blocks with headings, icons and at most a few lines each, ending with **Get started** again. The data date range on the page comes from `/v1/meta`; while it loads, the sentence reads "on past Nifty 50 data" with no dates or number of years, never a hardcoded range.

**Refresh / direct link behaviour:** state lives only in memory (constitution §5), so a route that needs state and finds none shows a friendly empty state — "Nothing to show here. Nikasha doesn't store anything, so a refreshed or closed tab starts fresh." — with a button to **Choose a path** (`/start`). It never shows a broken page.

**Leaving the page:** while a draft, running evaluation or report exists, a `beforeunload` prompt warns that closing or refreshing will lose it.

## 4. State management

One in-memory Zustand store, split into slices. **No `persist` middleware, no `sessionStorage`, no IndexedDB, no cookies.**

| Slice | Holds | Cleared when |
|---|---|---|
| `meta` | `/v1/meta` response (data range, instrument summary, pre-filled costs, default periods) | Tab closes |
| `draft` | The strategy being built/edited, its origin (template/builder/upload), which pre-filled values the user has confirmed | Start over / tab closes |
| `extraction` | Rule items and vague-rule questions from `/v1/extract`, the missing-input questions added in the browser (§6a), and the user's answers | Leaving the upload flow / tab closes |
| `settings` | Evaluation settings (period, costs, optional capital) and their confirmation state | Tab closes |
| `evaluation` | Status (`idle` · `running` · `done` · `error`), stage, start time, the report | New evaluation / tab closes |
| `whatIf`, `suggestions` | Variant settings and their reports | New base evaluation / tab closes |

**The only persistent value:** `localStorage["nikasha.disclaimer"] = { accepted: true, version: "<hash of disclaimer text>" }`. If the disclaimer text changes, the hash changes and the user is asked to accept again. All reads and writes are wrapped so that blocked storage simply means the gate shows each visit.

## 5. Design system

### 5.1 Principles
Calm, trustworthy, educational. **Risk before reward.** Numbers are easy to scan (tabular figures, right-aligned). Nothing looks like a trading terminal or a "buy" button.

### 5.2 Colour tokens (CSS variables; light theme for the MVP)

| Token | Use | Value |
|---|---|---|
| `--bg` | Page background | `#FAFAF7` |
| `--surface` | Cards, panels | `#FFFFFF` |
| `--ink` | Primary text | `#1C1F24` |
| `--ink-muted` | Secondary text | `#5B6270` |
| `--line` | Borders, dividers | `#E3E5E8` |
| `--brand` | Brand mark, primary buttons (touchstone charcoal) | `#2B2F36` |
| `--accent` | Highlights, focus ring (touchstone gold) | `#B08A2E` |
| `--risk` | Losses, drawdown, warnings | `#B42318` |
| `--gain` | Profits | `#1F7A4D` |
| `--caution` | "Possibly overfit", modelled-data badges | `#B54708` |
| `--info` | Educational callouts | `#1D4E89` |
| `--chart-line` | Single-series lines (equity curve) | `#2a78d6` |
| `--chart-positive` | Chart marks for gains (bars above zero) | `#2a78d6` |
| `--chart-negative` | Chart marks for losses and drawdown | `#B42318` |
| `--chart-grid` | Gridlines (solid hairline) | `#E3E5E8` |
| `--chart-axis` | Axis and zero lines | `#8A8F98` |

**Charts use blue for gains, not green.** The `--gain` / `--risk` pair is hard to tell apart for colour-blind readers (validated: deuteranopia ΔE 6.6, warning band), while blue `#2a78d6` / red `#B42318` passes strongly (deuteranopia ΔE 27.0; both ≥ 3:1 on white). `--gain` and `--risk` remain for text, always with a sign or icon. Chart details: feature 02 design §1.5.

- All text/background pairs meet WCAG AA (4.5:1 body, 3:1 large text and UI parts); checked by an automated contrast test on the tokens.
- **Colour is never the only signal:** gains and losses always carry a sign (+ / −) and, in tables, an icon or label.
- Tokens are defined once so a dark theme can be added later without touching components.

### 5.3 Typography
Inter; base 16 px; scale 12 / 14 / 16 / 20 / 24 / 32; line height 1.5 for text. Numbers use `font-variant-numeric: tabular-nums`.

### 5.4 Shared components
`Button` (primary / secondary / quiet; no red "buy"-style buttons) · `Card` · `Badge` (e.g. "Premiums modelled, not actual", "Possibly overfit", "Not used") · `Tooltip` (every field) · `GlossaryTerm` (inline term → definition popover) · `RuleTable` (Rule / Setting / What it means) · `MetricTile` (value, label, explanation tooltip) · `DataTable` · `ChartFrame` (chart + "show as table" toggle + caption) · `Stepper` · `QuestionCard` (single question, multiple choice or number) · `EmptyState` · `ErrorPanel` · `ProgressStages` · `DisclaimerShort` · `ConfirmPrefill` (pre-filled value with an explicit confirm control).

### 5.5 Formatting
- Currency: `₹` with Indian digit grouping (`en-IN`: ₹1,23,456.50); negatives as `−₹4,250`.
- Percentages: one decimal (`54.3%`).
- Dates: `14 May 2026`; times 24-hour IST (`09:15`); periods `9 Jan 2015 – 14 May 2026`.
- Premiums and points: two decimals.

## 6. Plain-English rendering of rules

- A single module, `describeStrategy(strategy, instrument) → RuleLine[]`, turns the internal strategy into rows of **Rule / Setting / What it means**, using fixed sentence patterns per schema element (e.g. `{type:"cross", direction:"above"}` → "9 EMA crosses above 21 EMA").
- Used by the review screen, template cards, the report's strategy-rules section and the PDF's rules table, so the wording is identical everywhere. (The report's "Settings used" section is built by the engine from the same 12 advanced-option labels in `contracts/advanced-options.json`.)
- Every advanced option in `strategy.schema.json` has a pattern for "used" and the line **"Not used"** when absent.
- A unit test renders every schema element and fails on any untranslated element, so no internal key can reach the screen.

## 6a. Completeness check (missing mandatory inputs)

- One module, `completeness.ts`, decides which of the 13 mandatory inputs (`product.md` §6.1) are still missing or unconfirmed, and produces a fixed plain-English question for each (e.g. "Intraday or positional?", or the positional exit question).
- It is the **only** definition of "missing" (`architecture.md` decision A9), used by the builder (blocking steps), the review screen (disabled Evaluate button naming what is missing) and the upload flow (questions added after `/v1/extract` returns).
- Pre-filled values (lots, lot size) count as missing until the user confirms them.

## 7. Never exposing technical detail (constitution §4)

- No JSON, code, schema names, field paths, stack traces, HTTP codes or internal IDs in the UI, PDFs or CSV headers.
- Validation and API errors are mapped to plain-English messages (message catalogue keyed by error code and rule ID); unknown errors show a generic plain-English message with a "Try again" action.
- **Automated guard:** an e2e test walks every screen in the main flows and fails if rendered text contains JSON-like fragments (`{"`, `":`), schema keys (e.g. `option_type`, `PCT_PREMIUM`), or stack-trace patterns.

## 8. Loading, error and empty states

| Situation | Behaviour |
|---|---|
| `/v1/meta` loading (first engine call may be a cold start) | Skeletons; disclaimer dates show "loading dates…" until known, and the Accept button waits for the dates so the user accepts the real text |
| Engine unreachable | `ErrorPanel`: "Nikasha's evaluation service isn't responding. Please try again in a minute." + retry |
| Engine busy (429/503) | Automatic retry with backoff (`architecture.md` §3.3); after that, "Busy right now, please try again." |
| Validation failed | List of plain-English problems, each linking to the field to fix; Evaluate stays disabled |
| Extraction failed / unreadable file | Explain (e.g. "We couldn't read text from this PDF — it may be a scanned image. Try pasting the text.") and offer the guided builder |
| Zero trades in the report | Explain why, using the skipped-signal counts (`product.md` §7.2), instead of empty charts |
| Too few trades to judge overfitting | Show the "too few trades to judge" message, not a flag |

## 9. Accessibility (WCAG 2.1 AA target)

- Full keyboard use; visible focus ring (`--accent`); logical headings; skip-to-content link.
- Every input has a visible label and a tooltip/description linked with `aria-describedby`.
- Builder steps announce progress; validation errors announced via an `aria-live` region.
- Charts: descriptive caption plus a "Show as table" toggle with the same data.
- Progress screen updates via `aria-live="polite"`; the notification is not the only completion signal.
- `prefers-reduced-motion` respected.
- axe-core checks run in Playwright on every main screen; zero serious/critical violations allowed.

## 10. Responsiveness

- Breakpoints: ≤ 640 px (phone), 641–1024 px (tablet), > 1024 px (desktop). Minimum supported width 360 px.
- Phone: single column; tables become stacked cards or scroll horizontally inside their frame (never the whole page); charts full width with fewer axis labels.
- The builder, review, report and downloads must all be usable on a phone.

## 11. Browser-side PDF and CSV export

- Generated entirely in the browser from the in-memory report; nothing is uploaded.
- **PDF contents:** title, strategy name, period tested; short disclaimer at the top and in every page footer; the strategy rules table (incl. "Not used" rows) and, for uploads, the "Left out (can't be tested)" list; plain-English summary; risk-first metrics; equity and drawdown charts; breakdown tables; overfitting check; VIX sensitivity; settings used (incl. every "Not used" advanced option, rules with no effect, skipped signals); how this was simulated; data source and data gaps; "Premiums modelled, not actual"; engine version and generation time.
- **CSV:** one row per trade (columns in plain English, e.g. "Entry time", "Strike", "Exit reason"), preceded by comment lines with the period, settings summary, data source and short disclaimer.
- File names: `nikasha-report-<strategy-name>-<YYYYMMDD>.pdf` / `nikasha-trades-…csv`.

## 12. Progress screen and completion (shared behaviour)

- One engine request is in flight, so **stage messages are time-based estimates** ("Preparing data… → Simulating trades… → Building your report…"), advanced on a timer scaled by the expected duration (period length × timeframe). Wording makes clear the time is a rough estimate.
- Shows educational content from `/learn` and the warning **"Keep this tab open. Closing it will lose your result."**
- On completion: tab title becomes "✓ Report ready — Nikasha"; a browser notification is shown if permission was granted. Permission is requested only when the user clicks Evaluate (a user gesture) and never re-asked after a denial.

## 13. UI copy and tone

- Plain, calm, short sentences; explain jargon on first use (`GlossaryTerm`).
- Risk first: losses and drawdown appear before profit in every summary.
- Past simulated results only: "this change **would have**…", "in this backtest…".
- **Banned in UI copy and engine-generated text:** "buy now", "sell now", "guaranteed", "sure-shot", "best strategy", "we recommend", "you should trade", "profit target achieved for you", or any ranking of strategies as "best to trade". A unit test scans the copy catalogue and the summary templates for these phrases.
- No other product or platform is named (constitution §9).

## 14. Privacy in the browser

- No analytics, tracking pixels, third-party scripts, or external fonts at runtime.
- Content-Security-Policy and other security headers set in `next.config` (`architecture.md` §7); `connect-src` allows only the site itself, the engine URL and the extraction URL.
- No `console.log` of strategies, uploads or reports in production builds (lint rule + build-time strip).
- Uploads are sent only to the extraction function (`/v1/extract`); strategies and settings only to the engine. Nothing the user enters is sent to Vercel, which only serves the app's static files.

## 15. Testing (frontend)

| Level | What |
|---|---|
| Unit (Vitest) | `describeStrategy` coverage of every schema element; `strategyRules.ts` against shared fixtures; formatters; completeness / missing-input logic; banned-phrase scan |
| Component | Builder steps block progress until complete; Evaluate disabled with named missing inputs; `ConfirmPrefill` behaviour |
| End-to-end (Playwright) | Main flows against a local engine; no-technical-text guard (§7); axe checks (§9); downloads produce a PDF and CSV containing settings, data source and disclaimer |
| Privacy | Only `localStorage["nikasha.disclaimer"]` exists after a full flow; no other storage keys, cookies or third-party requests |

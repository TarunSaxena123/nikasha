# Feature 07 — Privacy and Legal: Requirements

Status: **Approved 2026-10-14** · Created 2026-10-14 · Prefix: **REQ-PRV** · Priority: **P0**

Implements [`constitution.md`](../../constitution.md) §5 (zero data storage), §6 (honesty), §8 (educational, not advisory) and §9 (no product names), and [`product.md`](../../product.md) §6.5 (getting-started flow), §9.4 (data rights), §11 (legal) and §12 (privacy). This feature is specified first because it constrains every other feature: their requirements must not contradict anything here.

EARS patterns used: *Ubiquitous* "THE SYSTEM SHALL…", *Event* "WHEN … THE SYSTEM SHALL…", *State* "WHILE … THE SYSTEM SHALL…", *Unwanted behaviour* "IF … THEN THE SYSTEM SHALL…". "The system" means the web app, the engine and the extraction function together, unless a requirement names one.

---

## 1. User stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-PRV-1 | first-time visitor | to read what Nikasha is before agreeing to anything | I can decide whether it is for me |
| US-PRV-2 | visitor | to be told clearly, before I use it, that Nikasha is educational, not advice, and uses modelled prices on unofficial data | I don't mistake results for recommendations or real prices |
| US-PRV-3 | trader | to know that my strategy, upload and results are not stored | I can test my own ideas without worrying about who keeps them |
| US-PRV-4 | trader uploading a document | to know that its text goes to a third-party AI service and how long they may keep it | I can decide what to upload |
| US-PRV-5 | any user | to see the short disclaimer on every page, report and download | the context of any result I share is never lost |
| US-PRV-6 | project owner | to be sure no user content ever reaches a log or storage | the privacy promise is true, not just written |

## 2. Requirements

### 2.1 Disclaimer gate and acceptance

| ID | Requirement |
|---|---|
| REQ-PRV-01 | THE SYSTEM SHALL let any visitor read the intro page (`/`), the full Disclaimer page (`/disclaimer`) and the Learn pages (`/learn`, `/learn/*`) without accepting the disclaimer. |
| REQ-PRV-02 | WHEN a visitor who has not accepted the current disclaimer clicks **Get started** or opens any gated route (`/start`, `/templates`, `/build`, `/upload`, `/review`, `/evaluate`, `/report`), THE SYSTEM SHALL show the full disclaimer (§11.1 text) with an "I understand and agree" checkbox and a **Continue** button, instead of the requested page. |
| REQ-PRV-03 | WHILE the "I understand and agree" checkbox is not ticked, THE SYSTEM SHALL keep the **Continue** button disabled. |
| REQ-PRV-04 | WHEN the visitor ticks the checkbox and clicks **Continue**, THE SYSTEM SHALL record acceptance in the visitor's browser and take them to the page they were heading for (`/start` after Get started; otherwise the gated route they opened). |
| REQ-PRV-05 | IF the gate is showing, THEN THE SYSTEM SHALL NOT render, fetch or reveal any content of the gated page (not even briefly) until acceptance is recorded. |
| REQ-PRV-06 | THE SYSTEM SHALL store acceptance only as `localStorage["nikasha.disclaimer"] = { accepted: true, version: <hash of the full disclaimer text template> }`, and nowhere else (no cookie, no server call). |
| REQ-PRV-07 | WHEN the full disclaimer text changes (its version hash differs from the stored one), THE SYSTEM SHALL treat the visitor as not having accepted and show the gate again at the next gated action. |
| REQ-PRV-08 | IF browser storage is unavailable or blocked, THEN THE SYSTEM SHALL still work, showing the gate at the first gated action of each visit, and SHALL NOT show an error. |
| REQ-PRV-09 | WHILE the data date range is still loading from `/v1/meta`, THE SYSTEM SHALL show the gate's date placeholders as "loading dates…" and keep **Continue** disabled, so the visitor accepts the text with the real dates. IF loading fails, THEN THE SYSTEM SHALL show "dates unavailable", keep **Continue** disabled, and offer a **Try again** button that reloads the dates. |
| REQ-PRV-35 | THE gate SHALL offer a **Back to intro** link next to **Continue**; WHEN the visitor uses it, THE SYSTEM SHALL return them to `/` and store nothing. |
| REQ-PRV-36 | THE SYSTEM SHALL keep an acceptance valid until the disclaimer text changes (REQ-PRV-07); acceptance SHALL NOT expire by time. |

### 2.2 Disclaimer text and where it appears

| ID | Requirement |
|---|---|
| REQ-PRV-10 | THE SYSTEM SHALL show the full disclaimer exactly as in `product.md` §11.1, with `[first date]` and `[last date]` filled from the actual first and last timestamps of the loaded data (never hardcoded), on the gate, on `/disclaimer`, and in the README. |
| REQ-PRV-11 | THE SYSTEM SHALL show the short disclaimer exactly as in `product.md` §11.2, with dates filled from the data, in the footer of every page, with a link to `/disclaimer`. |
| REQ-PRV-12 | THE SYSTEM SHALL show the short disclaimer on every report screen and every suggestion panel. |
| REQ-PRV-13 | WHEN a PDF report is generated, THE SYSTEM SHALL include the short disclaimer at the top of the first page and in the footer of every page. |
| REQ-PRV-14 | WHEN a trades CSV is generated, THE SYSTEM SHALL include the short disclaimer, the data source and the period in comment lines before the header row. |
| REQ-PRV-15 | IF the data date range cannot be loaded, THEN THE SYSTEM SHALL show the disclaimers with "dates unavailable" in place of the dates and SHALL NOT substitute a hardcoded range. |

### 2.3 Data source, trademarks and data rights

| ID | Requirement |
|---|---|
| REQ-PRV-16 | THE SYSTEM SHALL state on the intro page, on every report and in every download: the data source (Kaggle dataset name and URL), that it is unofficial and not an NSE feed, and its date range read from the data. |
| REQ-PRV-17 | THE SYSTEM SHALL include the trademark notice (NIFTY 50 and India VIX are trademarks of NSE Indices Limited / NSE; Nikasha is not affiliated with, endorsed by or sponsored by NSE, NSE Indices Limited or SEBI) in the full disclaimer, on `/disclaimer` and in the README. |
| REQ-PRV-18 | THE SYSTEM SHALL describe its use of the data as non-commercial and educational wherever the data source is stated in full (full disclaimer, README). |

### 2.4 Zero data storage

| ID | Requirement |
|---|---|
| REQ-PRV-19 | THE SYSTEM SHALL NOT store any strategy, uploaded file, extracted text, evaluation setting, result, session or personal data in any database, file, object store, cache or queue, on any server. |
| REQ-PRV-20 | WHEN a file or text is uploaded, THE extraction function SHALL read it from memory only, SHALL NOT write it (or any derivative) to disk including `/tmp`, and SHALL discard it when the response is sent. |
| REQ-PRV-21 | THE web app SHALL keep strategies, settings, extraction results and reports only in the open tab's memory, and SHALL NOT write them to `localStorage`, `sessionStorage`, IndexedDB, cookies or any server. |
| REQ-PRV-22 | THE web app SHALL NOT set cookies and SHALL NOT load analytics, tracking pixels, third-party scripts or third-party fonts. |
| REQ-PRV-23 | THE web app SHALL send uploads only to the extraction function and strategies/settings only to the engine; it SHALL NOT send any user content to Vercel or any other destination. |
| REQ-PRV-24 | THE extraction function SHALL send only the extracted strategy text to the AI provider — never the file name, file bytes, IP address, user agent or any other information about the user. |

### 2.5 Logging

| ID | Requirement |
|---|---|
| REQ-PRV-25 | THE engine and the extraction function SHALL log only allow-listed technical fields (timestamp, level, request id, endpoint, HTTP status, error code, duration, engine version, cold-start flag, memory used, counts) and SHALL NOT log request or response bodies, strategies, settings, uploaded or extracted text, file names, prompts, LLM output, reports, validation problem details, IP addresses or user agents. |
| REQ-PRV-26 | IF an exception occurs, THEN THE engine and the extraction function SHALL log the exception type and code location only, replacing the exception message (which may contain user values) before logging. |
| REQ-PRV-27 | THE deployment SHALL set CloudWatch log retention for both functions to 1 day and SHALL NOT enable Function URL access logging or any log drain. |
| REQ-PRV-28 | THE web app production build SHALL NOT write strategies, uploads, extraction results or reports to the browser console. |

### 2.6 Honest disclosure about the AI provider

| ID | Requirement |
|---|---|
| REQ-PRV-29 | THE upload screen SHALL tell the user, before they upload or paste, that the text is sent to a third-party AI service (Anthropic) to read it, that the provider may keep it for up to 30 days under its API policy, and that personal or confidential information should not be uploaded; with a link to `/disclaimer`. |
| REQ-PRV-30 | THE privacy text about the AI provider SHALL match Anthropic's published API retention policy, and a release checklist item SHALL require re-checking it before each release. |

### 2.7 Behaviour matches the disclaimer

| ID | Requirement |
|---|---|
| REQ-PRV-31 | THE SYSTEM SHALL NOT show live signals, "buy now / sell now" messages, profit promises, or any ranking of strategies as "best to trade". |
| REQ-PRV-32 | THE SYSTEM SHALL word every suggestion and summary as past simulated results (e.g. "this change would have…", "in this backtest…"), never as a recommendation. |
| REQ-PRV-33 | THE SYSTEM SHALL NOT use any phrase from the banned-phrase list (`frontend.md` §13) in UI copy, engine-generated summaries, suggestion text, PDFs or CSVs. |
| REQ-PRV-34 | THE SYSTEM SHALL NOT name any competing product or platform in the app, downloads, specs, docs or README (constitution §9). |

## 3. Acceptance criteria

| AC | Requirement(s) | Given / When / Then |
|---|---|---|
| AC-PRV-01 | 01 | **Given** a visitor who has never accepted, **when** they open `/`, `/disclaimer` or `/learn`, **then** the page content is shown with no gate. |
| AC-PRV-02 | 02, 04 | **Given** a visitor who has not accepted, **when** they click Get started, **then** the full disclaimer gate is shown; **when** they tick the box and click Continue, **then** they arrive at `/start`. |
| AC-PRV-03 | 02, 04, 05 | **Given** a visitor who has not accepted, **when** they open `/build` directly, **then** the gate is shown, no builder content is rendered, and after accepting they arrive at `/build`. |
| AC-PRV-04 | 03 | **Given** the gate is shown, **when** the checkbox is not ticked, **then** Continue is disabled. |
| AC-PRV-05 | 04, 06 | **Given** a visitor accepts, **when** they click Get started on a later visit, **then** they go straight to `/start`; and the only stored item is `localStorage["nikasha.disclaimer"]` with `accepted: true` and the current version. |
| AC-PRV-06 | 07 | **Given** a stored acceptance with an older version hash, **when** the visitor clicks Get started, **then** the gate is shown again. |
| AC-PRV-07 | 08 | **Given** `localStorage` throws on access, **when** the visitor clicks Get started, **then** the gate is shown, acceptance lets them continue for that visit, and no error appears. |
| AC-PRV-08 | 09, 10, 15 | **Given** `/v1/meta` returns first/last timestamps, **then** the gate, `/disclaimer`, footer, report and downloads show exactly those dates; **given** meta is still loading, **then** the gate shows "loading dates…" and Continue is disabled; **given** meta fails, **then** "dates unavailable" is shown and no hardcoded date appears anywhere. |
| AC-PRV-09 | 11 | **Given** any page (gated or not), **then** the footer shows the short disclaimer text and a link to `/disclaimer`. |
| AC-PRV-10 | 12, 13, 14, 16 | **Given** a completed report, **then** the report screen and each suggestion panel show the short disclaimer and data source; **when** the user downloads the PDF and CSV, **then** both contain the short disclaimer, the data source with dates, and the period. |
| AC-PRV-11 | 17, 18 | **Given** `/disclaimer` and the README, **then** both contain the trademark notice and the non-commercial, educational data-use statement. |
| AC-PRV-12 | 19, 20, 27 | **Given** a deployed or local stack, **when** a document is uploaded and a strategy evaluated, **then** no new file exists on the server filesystem (incl. `/tmp`), no storage service is configured in the SAM template, and log retention is 1 day. |
| AC-PRV-13 | 21, 22 | **Given** a complete flow (Get started → template → evaluate → report → download), **then** the browser holds no cookies, no `sessionStorage`/IndexedDB entries, and no `localStorage` key other than `nikasha.disclaimer`; and no request went to a third-party domain. |
| AC-PRV-14 | 23 | **Given** the same flow plus an upload, **then** every request carrying user content went to the engine or extraction URL, and none to the Vercel origin. |
| AC-PRV-15 | 24 | **Given** an upload of `my-secret-name.pdf`, **when** the extraction function calls the AI provider (recorded in tests), **then** the request contains the extracted text and instructions only — not the file name or any user metadata. |
| AC-PRV-16 | 25, 26, 28 | **Given** a test strategy and upload containing the marker string `NIKASHA-PRIVACY-MARKER-7f3a`, including one request that triggers a validation error and one that triggers an exception, **when** the logs of both functions and the browser console (production build) are searched, **then** the marker appears nowhere. |
| AC-PRV-17 | 29 | **Given** the upload screen, **then** before any upload control is used, the notice about the third-party AI service, the 30-day retention and "don't upload personal or confidential information" is visible, with a link to `/disclaimer`. |
| AC-PRV-18 | 31, 32, 33 | **Given** the UI copy catalogue, the summary and suggestion templates, and generated PDFs/CSVs for the test strategies, **then** none contains a banned phrase, and every suggestion sentence uses past-simulated wording. |
| AC-PRV-19 | 34 | **Given** the repository (app source, specs, docs, README), **then** a check against the maintained list of competing product names finds none. |
| AC-PRV-20 | 09 | **Given** `/v1/meta` fails, **when** the gate is shown, **then** "dates unavailable" and a Try again button appear and Continue is disabled; **when** Try again succeeds, **then** the real dates appear and Continue becomes available once the box is ticked. |
| AC-PRV-21 | 35 | **Given** the gate is shown, **when** the visitor clicks Back to intro, **then** they are on `/` and `localStorage` has no `nikasha.disclaimer` entry. |
| AC-PRV-22 | 36 | **Given** an acceptance stored with the current version, **when** the visitor's clock is moved a year ahead, **then** Get started goes straight to `/start`. |

## 4. Edge cases and error handling

| Case | Expected behaviour | Req. |
|---|---|---|
| Visitor bookmarks `/report` and returns later | Gate first if not accepted; then the empty state ("Nikasha doesn't store anything…") with a link to Choose a path | 02, 21 |
| Visitor declines (doesn't tick, leaves) | Nothing is stored; they can keep reading the open pages | 01, 06 |
| Two tabs open; acceptance in one | The other tab reads the flag at its next gated action and does not show the gate again | 06 |
| Private/incognito window | Works; acceptance lasts for that window only (REQ-PRV-08 if storage blocked) | 08 |
| Engine unreachable on first load | Open pages still render; disclaimers show "dates unavailable"; the gate's Continue stays disabled until dates load or the visitor retries, so acceptance always covers the real text | 09, 15 |
| Upload contains a person's name or phone number | Not detected or filtered by Nikasha; the pre-upload notice warns users; the text is not stored or logged by Nikasha | 20, 25, 29 |
| Validation error message would echo a user value | The engine's plain-English problem messages may echo the value to the user in the response, but never to logs | 25, 26 |
| Disclaimer text edited in a later release | Version hash changes; all visitors re-accept | 07 |

## 5. Out of scope for this feature

- Legal review of the disclaimer (required before any public or commercial launch; outside this project, `product.md` §11.4).
- A separate privacy policy page: the "Your data and privacy" section of the disclaimer, the intro page section and the upload notice cover it (decision D3).
- Cookie banner: not needed, because no cookies are set (REQ-PRV-22).

## 6. Clarify gate — resolved decisions (owner, 2026-10-14)

| # | Question | Decision |
|---|---|---|
| D1 | Should acceptance expire by time? | No; only when the disclaimer text changes (REQ-PRV-07, REQ-PRV-36). |
| D2 | Should the gate offer an "I don't agree" option? | Yes: **Back to intro**; declining stores nothing (REQ-PRV-35). |
| D3 | Is a separate Privacy page needed? | No, for the MVP. |
| D4 | Should Continue wait for the data dates? | Yes, with **Try again** if loading fails (REQ-PRV-09). |

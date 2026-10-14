# Feature 04 — Document Upload: Requirements

Status: **Approved under delegation 2026-10-14** (owner delegated approval of the remaining specs; decisions in §6 may be revisited) · Created 2026-10-14 · Prefix: **REQ-UPL** · Layers: **frontend and backend (extraction function)** · Priority: **P1**

Implements [`product.md`](../../product.md) §6.5 (document upload path) and §6.7 (sample strategies), within [`backend.md`](../../backend.md) §9 (extraction function) and [`frontend.md`](../../frontend.md) §6a (completeness). Obeys [`constitution.md`](../../constitution.md) §2 (never guess), §3, §4, §5 and feature 07 (privacy notice, in-memory handling, logging).

---

## 1. User stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-UPL-1 | trader | to upload my strategy notes in whatever form and wording I have | I don't have to re-enter them |
| US-UPL-2 | trader | to see what Nikasha understood, rule by rule, with my own words quoted | I can check it read me correctly |
| US-UPL-3 | trader | one simple question for each vague or missing item | I fix gaps quickly without guessing |
| US-UPL-4 | trader | to be told which of my rules can't be tested | nothing is silently dropped |
| US-UPL-5 | trader | to be asked only what's needed | a short strategy needs only a few answers |

## 2. Requirements

### 2.1 Input

| ID | Requirement |
|---|---|
| REQ-UPL-01 | THE upload screen SHALL accept a file (PDF, DOCX or TXT, ≤ 4 MB) or pasted text (≤ 20,000 characters), with the AI-provider privacy notice (feature 07 REQ-PRV-29) shown above the controls. |
| REQ-UPL-02 | IF a file has another type, exceeds 4 MB, or the pasted text exceeds 20,000 characters, THEN THE web app SHALL refuse it before sending, with a plain-English reason. |
| REQ-UPL-03 | WHEN the user submits, THE web app SHALL send the file or text to `POST /v1/extract` and show a waiting state ("Reading your strategy… this usually takes 10–40 seconds") with a **Cancel** button. |

### 2.2 Extraction (extraction function)

| ID | Requirement |
|---|---|
| REQ-UPL-04 | THE extraction function SHALL read the file into text in memory (feature 07 REQ-PRV-20) and, IF no text can be read (scanned PDF, password, empty), THEN return `UNREADABLE_FILE` with a suggestion to paste the text. |
| REQ-UPL-05 | THE extraction function SHALL call the LLM with structured output (flat extraction schema) and SHALL mark each extracted rule **FOUND** (clear), **VAGUE** (needs a number or choice the text doesn't give, or a term whose meaning changed — e.g. "Thursday" for expiry day) or **UNSUPPORTED** (outside Nikasha's vocabulary), quoting the source words. |
| REQ-UPL-06 | THE extraction function SHALL NOT fill in any value the text doesn't state; values not stated are left out of the draft. |
| REQ-UPL-07 | THE extraction function SHALL ignore text that is not a trading rule (e.g. unrelated footers) without creating an item or a question, and SHALL report that some text was ignored. |
| REQ-UPL-08 | THE extraction function SHALL leave every advanced option the text doesn't mention out of the draft (OFF) and SHALL NOT ask about it. |
| REQ-UPL-09 | FOR each VAGUE item, THE extraction function SHALL return one question — multiple choice where the text offers candidates (e.g. "30 or 35 points?"), otherwise a number or time input — whose answers are applied to the draft as patches. |
| REQ-UPL-10 | THE extraction function SHALL convert the LLM output into a partial strategy in the shape of `strategy.schema.json` with deterministic code, and SHALL return `EXTRACTION_FAILED` rather than partial output when the LLM output is truncated, refused or fails validation. |

### 2.3 Results and questions (web)

| ID | Requirement |
|---|---|
| REQ-UPL-11 | WHEN the extraction result arrives, THE web app SHALL run the completeness check (frontend §6a) on the draft and add a **MISSING** item and question for each missing mandatory input (incl. the positional exit question when relevant). |
| REQ-UPL-12 | THE web app SHALL show the results as a list grouped Found / Needs an answer (vague and missing) / Can't be tested (unsupported), each with the plain-English understanding and the quoted source words; and a note when non-rule text was ignored. |
| REQ-UPL-13 | THE web app SHALL ask the questions one at a time (vague first, in document order, then missing in `product.md` §6.1 order), with progress ("Question 3 of 8"), Back, and multiple choice where possible (D1). |
| REQ-UPL-14 | WHEN a question is answered, THE web app SHALL apply its patch to the draft; WHEN all questions are answered, it SHALL re-run the completeness check and ask any newly missing input (e.g. the positional exit question after "Positional" is chosen). |
| REQ-UPL-15 | WHILE any question is unanswered, THE web app SHALL NOT allow evaluation, and SHALL NOT show the Review & Evaluate button. |
| REQ-UPL-16 | IF any items are UNSUPPORTED, THEN THE web app SHALL list them with the reason and require "I understand these rules will be left out" before continuing; the list SHALL also appear on the review screen and in the PDF's rules section (D2). |
| REQ-UPL-17 | WHEN all questions are answered (and unsupported items acknowledged), THE web app SHALL open the review screen (feature 02) with the draft and origin UPLOAD; lots and lot size answered as questions in the upload flow count as confirmed (the user actively answered them), while the costs/period checkbox remains to be ticked on the review screen. |
| REQ-UPL-18 | IF extraction finds no trading rules, THEN THE web app SHALL say so and offer the guided builder and Try again. |
| REQ-UPL-19 | IF extraction fails (`UNSUPPORTED_FILE`, `UNREADABLE_FILE`, `EXTRACTION_FAILED`, `EXTRACTION_BUSY`, `PAYLOAD_TOO_LARGE`, network), THEN THE web app SHALL show a plain-English message with the next step (paste text, try again, or use the builder). |

### 2.4 Sample behaviour (`product.md` §6.7)

| ID | Requirement |
|---|---|
| REQ-UPL-20 | FOR `samples/nifty_weekly_options_strategy.pdf`, THE system SHALL ask at least about: "closes decisively above/below" (threshold); SL cap "30–35" (one number); VIX > 18 "reduce significantly" (exact %); "Supertrend turns green/red" (flip candle only or any candle while green); ADX "slope up" (over how many candles); "Thursday" (→ expiry day); "pre-market 09:00 VIX" (→ 09:15 opening VIX); weekly expiry (confirm, implied by the title); and the missing holding type, lots and lot size — and SHALL NOT ask about the "medical advice" footer. |
| REQ-UPL-21 | FOR `samples/one_line_strategy.txt`, THE system SHALL ask only for holding type, expiry, lots and lot size, plus the positional exit question only if Positional is chosen; nothing about advanced options or the PE side. |

## 3. Acceptance criteria

| AC | Req. | Given / When / Then |
|---|---|---|
| AC-UPL-01 | 01, 02 | **Given** the upload screen, **then** the privacy notice is above the controls; a 5 MB PDF, a `.xlsx`, or 20,001 pasted characters are refused with a reason and no request is sent. |
| AC-UPL-02 | 03 | **Given** a submission, **then** the waiting state with Cancel appears; Cancel returns to the upload screen and a late response is ignored. |
| AC-UPL-03 | 04 | **Given** a scanned (image-only) PDF, **then** the response is `UNREADABLE_FILE` and the message suggests pasting text. |
| AC-UPL-04 | 05, 06, 09, 10 | **Given** the recorded LLM response for the advanced sample, **then** each expected VAGUE item has a question with the expected kind and options; no draft value exists for any vague or unstated input. |
| AC-UPL-05 | 07 | **Given** the advanced sample, **then** no item or question refers to the footer, and `ignored_text_found` is true. |
| AC-UPL-06 | 08 | **Given** an uploaded strategy mentioning no advanced option (the one-line sample), **then** the draft has no `advanced` properties, the review screen shows all advanced options "Not used", and no question mentions them. |
| AC-UPL-07 | 11, 21 | **Given** the one-line sample, **then** the questions are exactly: holding type, expiry, lots (confirm), lot size (confirm); **when** Positional is chosen, **then** the positional exit question is added. |
| AC-UPL-08 | 12 | **Given** a result, **then** the three groups appear with understandings and quotes; the ignored-text note appears when applicable. |
| AC-UPL-09 | 13, 14 | **Given** the advanced sample, **then** vague questions come first in document order, then missing ones; Back changes an earlier answer; each answer updates the draft as specified by its patch. |
| AC-UPL-10 | 15 | **Given** an uploaded strategy with a vague rule, **when** it is parsed, **then** a clarifying question is asked and no backtest can run until it is answered. |
| AC-UPL-11 | 11, 15 | **Given** an uploaded strategy missing the stop-loss, **when** it is parsed, **then** the system asks for the stop-loss and does not default it. |
| AC-UPL-12 | 16 | **Given** a document with a VWAP rule, **then** it is listed as "Can't be tested" with the VWAP reason; continuing requires the acknowledgement; the review screen and PDF list it. |
| AC-UPL-13 | 17 | **Given** all questions answered (incl. lots and lot size), **then** the review screen opens with origin UPLOAD, lots and lot size confirmed, and the costs/period checkbox unticked. |
| AC-UPL-14 | 18, 19 | **Given** a text with no rules ("hello"), **then** the "no trading rules found" message offers the builder; **given** each error code, **then** the matching plain-English message and next step appear. |
| AC-UPL-15 | 20 | **Given** the advanced sample (recorded response in CI; live run before release), **then** every ambiguity in REQ-UPL-20 produces a question and the footer produces none. |

## 4. Edge cases

| Case | Expected | Req. |
|---|---|---|
| Document contains instructions to the AI ("ignore previous instructions…") | Treated as text; at most an UNSUPPORTED/ignored item; schema-constrained output; user reviews every rule | 05, 10 |
| Same rule stated twice with different values | VAGUE: "Your document gives two values for stop-loss: 30% and 25%. Which one?" | 05, 09 |
| Rule refers to another instrument (e.g. Bank Nifty) | UNSUPPORTED in the MVP ("Only Nifty 50 is available now") | 05 |
| Multi-timeframe rule ("1-hour EMA rising") | UNSUPPORTED with the one-timeframe reason | 05 |
| User uploads again after answering | The new extraction replaces the old one; answers are discarded (D6) | 03 |
| Non-English document | Extraction is attempted; if nothing usable, REQ-UPL-18 applies (D7) | 18 |

## 5. Out of scope

Saving uploads or answers; merging several documents; OCR of scanned PDFs; editing the document inside Nikasha.

## 6. Clarify gate — decisions (taken under the owner's delegation, 2026-10-14; may be revisited)

| # | Question | Decision |
|---|---|---|
| D1 | Questions one at a time or all on one page? | One at a time with progress and Back (the brief's "one simple question each"); a summary list stays visible beside them on desktop. |
| D2 | What happens to UNSUPPORTED rules? | Listed with reasons; the user must acknowledge they'll be left out; shown again on the review screen and in the PDF, so the gap is never hidden. |
| D3 | "Stop-loss 30%" without "of premium" | Read as 30% of premium (Nikasha's meaning of a % stop on an option), shown as FOUND with that interpretation visible so the user can change it on review. Matches the brief's expectation that the one-line sample isn't asked about its stop-loss. |
| D4 | "Closes decisively above" threshold | Asked as a number of points above the EMA (0 allowed = "just above"); % thresholds can be set in the builder. |
| D5 | Questions for "Thursday" and "pre-market VIX" | Confirm-type questions with the recommended reading pre-selected but not applied until confirmed: "Thursday → the expiry day (Thursday until Aug 2025, Tuesday since)"; "09:00 VIX → the 09:15 opening VIX, the earliest available". |
| D6 | Re-upload | Replaces the previous extraction; earlier answers are discarded. |
| D7 | Languages | English is supported; other languages are attempted without a guarantee. |

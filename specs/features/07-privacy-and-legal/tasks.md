# Feature 07 — Privacy and Legal: Tasks

Status: **Approved 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) via [`design.md`](design.md)

Rules for this list:
- Tags: **[CONTRACT]** first, then **[BE]** and **[FE]**, which can proceed independently against the contracts. Repo-wide scripts are tagged [BE].
- **Build step** refers to the build order in `product.md` §15. This feature is specified first, but its tasks are built alongside the features they protect. A task is never left for "later": it is done in the build step shown.
- **Done** means: code written, its tests passing, and `traceability.md` updated.
- No task calls a paid service in tests (`architecture.md` §10).

## Contract tasks

| ID | Task | Req. | Tests that prove it | Build step |
|---|---|---|---|---|
| T-PRV-01 | [CONTRACT] Create `specs/contracts/banned-phrases.txt` from `frontend.md` §13 (one phrase per line, lower-case) | 31, 32, 33 | Read by the web and engine scans in T-PRV-11 / T-PRV-20 | 1 |
| T-PRV-02 | [CONTRACT] Create `specs/contracts/excluded-names.sha256` and `scripts/hash-names.mjs` (reads names from stdin, prints SHA-256 of each lower-cased name). The owner runs it with their private list; only hashes are committed | 34 | Used by T-PRV-22 | 1 |
| T-PRV-03 | [CONTRACT] Add `specs/contracts/fixtures/meta.example.json` (a valid `MetaResponse` with real data dates) for web tests and mocks | 09, 10, 15, 16 | Validates against `api.openapi.yaml` in the contract test | 1 |

## Backend tasks

| ID | Task | Req. | Tests that prove it | Build step |
|---|---|---|---|---|
| T-PRV-04 | [BE] `pylib/nikasha_log`: `log()` with the allow-list and value rules, `log_exception()` (type + code location only), third-party logger silencing (design §2.1) | 25, 26 | pytest: unknown field rejected; long/odd string value dropped; exception message and args never in output; `anthropic`/`httpx` debug output suppressed | 3 |
| T-PRV-05 | [BE] Lint config for `engine/` and `extractor/`: ban `print(` and direct `logging` use outside `nikasha_log` (ruff rules) | 25 | CI lint fails on a planted `print` in a test fixture branch | 3 |
| T-PRV-06 | [BE] Engine `core/api.dispatch` wrapper: error mapping (validation / known / unexpected), plain-English responses, logging via `nikasha_log` only (design §2.2) | 25, 26 | pytest: invalid strategy → 422 with problems, log line has `code` only; forced exception → 500 `ENGINE_ERROR`, log has `exc_type`/`exc_where` and no message | 3 |
| T-PRV-07 | [BE] Extraction `core/api.dispatch` wrapper, same as T-PRV-06 | 25, 26 | pytest, same cases for the extraction function | 7 |
| T-PRV-08 | [BE] Extraction in-memory upload handling: base64 → multipart → `BytesIO` → pypdf / python-docx / UTF-8; file name ignored; no disk writes (design §2.3) | 20, 24 | pytest: `open`/`tempfile`/`os.open` writes monkeypatched to raise and never triggered; `/tmp` listing unchanged; file name not present in any value passed onward | 7 |
| T-PRV-09 | [BE] `llm.py` builds the Anthropic request from the system prompt and extracted text only (design §2.4) | 24 | pytest with a recording client stub: payload has only the system prompt and text; the uploaded file name and any metadata are absent (AC-PRV-15) | 7 |
| T-PRV-10 | [BE] SAM template: one log group per function with `RetentionInDays: 1`; no storage resources; `ANTHROPIC_API_KEY` as `NoEcho` parameter given only to the extraction function (design §2.5) | 19, 24, 27 | Template test (parses `infra/template.yaml`): retention = 1 for both; no S3/DynamoDB/RDS/EFS/ElastiCache/SQS types; key absent from the engine's environment (AC-PRV-12) | 5 (engine), 7 (extraction) |
| T-PRV-11 | [BE] Engine wording check: summary and suggestion templates (features 02/06) scanned against `banned-phrases.txt`; suggestion templates must use past-simulated wording | 31, 32, 33 | pytest scan over templates and golden-report `summary` arrays (AC-PRV-18) | 4 (summary), 10 (suggestions) |
| T-PRV-21 | [BE] `scripts/sync-readme-disclaimer.mjs`: writes the full disclaimer into the README between markers, dates from `data/nifty50_1min_clean.csv`; CI fails if the README is out of date | 10, 17, 18 | CI check; unit test of the date reading (AC-PRV-11) | 11 |
| T-PRV-22 | [BE] `scripts/check-names.mjs`: hash 1–3-word sequences in app source, specs, docs and README; fail on a match with `excluded-names.sha256` | 34 | CI check; self-test with a known test hash (AC-PRV-19) | 1 (script), runs in every CI build |
| T-PRV-23 | [BE] Privacy marker E2E script (design §3.3): local stack, marker in strategy + upload, one validation error, one injected exception (test builds only), recorded LLM response; search function output and browser console | 25, 26, 28 | The script itself (AC-PRV-16); runs in CI | 11 |
| T-PRV-25 | [BE] README: the Nikasha story, setup, local run, deployment (Vercel + AWS, free tiers, budget alert, spend limit), assumptions, limitations (modelled premiums, data provenance, costs at current rates), how to add an instrument (profile + data, no engine change), and the full disclaimer section from T-PRV-21; no other product named (T-PRV-22 scan) | 10, 17, 18, 34 | README sync check (T-PRV-21) and name scan (T-PRV-22) pass; a checklist test asserts each required README heading exists | 11 |
| T-PRV-24 | [BE] `docs/release-checklist.md`: re-check Anthropic API retention against the privacy text; CloudWatch marker search on the deployed stack; confirm Anthropic spend limit and AWS budget alert; **re-confirm the NSE exchange transaction charge (0.03553%) against circular NSE/FA/73061 and the 1 Sep 2025 Tuesday-expiry change against the NSE circular** (`product.md` §17), updating `instruments/nifty50.json` and `expiry-calendar-check.md` through the change process if either differs; owner review of the Learn articles (feature 05) | 27, 30 | Checklist completed before each release (manual); automated part in T-PRV-17 | 11 |

## Frontend tasks

| ID | Task | Req. | Tests that prove it | Build step |
|---|---|---|---|---|
| T-PRV-12 | [FE] `web/src/legal/disclaimer.ts`: `FULL_DISCLAIMER`, `SHORT_DISCLAIMER`, `fillDates()`, build-time `DISCLAIMER_VERSION` (SHA-256 of the unfilled full template) (design §1.3) | 07, 10, 11, 15 | Vitest: text equals `product.md` §11.1/§11.2 (placeholders normalised); `fillDates` for ready / loading / unavailable; no literal date in the output when dates are missing; version changes when the text changes, not when the dates change | 6 |
| T-PRV-13 | [FE] `web/src/legal/consent.ts` (`read`, `accept`, in-memory fallback) + ESLint ban on `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` outside it (design §1.2, §1.6) | 06, 07, 08, 21, 22, 36 | Vitest: write/read; version mismatch; corrupt JSON; throwing storage; fake clock +1 year still accepted (AC-PRV-05, 06, 07, 22); lint fails on a planted `localStorage` use | 6 |
| T-PRV-14 | [FE] `useMeta()` hook and `meta` store slice: `loading / ready / error`, `reload()` (design §1.5) | 09, 15 | Vitest with mocked fetch: each state and reload | 5 |
| T-PRV-15 | [FE] Route groups `(open)` / `(gated)` and `<DisclaimerGate>`: in-place gate, skeleton before the consent check, Continue rules, Back to intro, Try again, `storage` event (design §1.1) | 01, 02, 03, 04, 05, 09, 35 | Component tests (AC-PRV-04); Playwright: open routes ungated, Get started → gate → `/start`, direct `/build` → gate with no builder DOM → `/build`, Back to intro stores nothing, meta failure → Try again (AC-PRV-01, 02, 03, 08, 20, 21) | 6 |
| T-PRV-16 | [FE] `DisclaimerFull` (gate and `/disclaimer` page), `DisclaimerShort`, `Footer`, `DataSourceLine` (design §1.4) | 10, 11, 12, 16, 17, 18 | Playwright: footer short disclaimer on every route; `/disclaimer` has the trademark and non-commercial statements; dates equal the mocked meta (AC-PRV-08, 09, 11) | 6 |
| T-PRV-17 | [FE] `UploadPrivacyNotice` component (placed by feature 04 above every upload/paste control); retention days and provider name from one constant | 29, 30 | Component test: text contains the provider, the retention constant and the link; Playwright on `/upload` (AC-PRV-17) | 7 |
| T-PRV-18 | [FE] `pdfLegalBlocks()` and `csvLegalPreamble()` for feature 02's downloads (design §1.4) | 12, 13, 14, 16 | Vitest on both functions; Playwright: downloaded PDF text and CSV preamble contain the short disclaimer, data source with dates and period (AC-PRV-10) | 9 |
| T-PRV-19 | [FE] Browser hardening: `vercel.json` security headers (CSP, Referrer-Policy, Permissions-Policy, nosniff); `no-console` + `removeConsole` in production; single API client sending uploads only to the extraction URL and strategies only to the engine URL (design §1.6) | 22, 23, 28 | Playwright on a production build: no cookies, no storage keys other than `nikasha.disclaimer`, no third-party requests, no user-content request to the Vercel origin (AC-PRV-13, 14); header check on the preview deployment | 5 (client), 6 (headers) |
| T-PRV-20 | [FE] Banned-phrase scan of the UI copy catalogue (`web/src/copy/**`), legal texts and generated PDF/CSV text | 31, 32, 33 | Vitest scan against `banned-phrases.txt` (AC-PRV-18) | 6, extended at 9 |

## Order of work (summary)

```
Step 1  T-PRV-01, 02, 03, 22         contracts + name check
Step 3  T-PRV-04, 05, 06             logging helper + engine wrapper
Step 4  T-PRV-11 (summary part)
Step 5  T-PRV-10 (engine), 14, 19 (API client)
Step 6  T-PRV-12, 13, 15, 16, 19 (headers), 20   gate, texts, footer
Step 7  T-PRV-07, 08, 09, 10 (extraction), 17    upload privacy
Step 9  T-PRV-18, 20 (downloads)
Step 10 T-PRV-11 (suggestions part)
Step 11 T-PRV-21, 23, 24, 25         README, marker test, release checklist
```

There is no separate "write the Playwright suite" task: each FE task adds its own Playwright cases, as listed above.

# Traceability Matrix

Requirement ID → design section → task(s) → test(s). Constitution §11: every requirement has at least one automated test. Updated whenever a requirement, design, task or test changes (`product.md` §14).

**Status values:** `Specified` (spec approved, not built) · `Built` (code done, tests passing) · `Not built` (cut for time; gap kept visible, `product.md` §15).

All seven features are specified (written in the order 07, 01, 02, 05, 04, 03, 06; listed here by feature number) and built (2026-10-15). Only T-EVL-09, the deployed page, waits for deployment day.

## Totals (all features)

| Feature | Requirements | Traced to design + task + automated test |
|---|---|---|
| 07 Privacy and legal | 36 | 36 |
| 01 Data and engine | 66 | 66 |
| 02 Evaluation and report | 34 | 34 |
| 05 Beginner mode | 18 | 18 |
| 04 Document upload | 21 | 21 |
| 03 Strategy builder | 21 | 21 |
| 06 Suggestions | 12 | 12 |
| **Total** | **208** | **208** |

## Enabling tasks (no single requirement)

These tasks build the foundations, fixtures and pipelines that the requirement tasks and their tests depend on. They are tracked here so no task is untraced.

| Task | Feature | What it enables | Status |
|---|---|---|---|
| T-DAT-03 | 01 | Engine project, generated pydantic models, drift check | Built |
| T-DAT-11 | 01 | CI pipeline and `scripts/check-contracts.sh` (contract tests for every feature) | Built |
| T-UPL-02 | 04 | Extraction function project, adapters, deployment | Built |
| T-EVL-07 | 02 | Web app scaffold, design tokens, shared components, store, test tooling | Built |
| T-EVL-08 | 02 | Generated TypeScript types from the contracts, drift check | Built |
| T-EVL-09 | 02 | Minimal deployed page proving Vercel → Lambda (build step 5) | Specified (done on deployment day; locally proven by the `@stack` Playwright test) |
| T-RPT-02, T-RPT-10 | 02 | Engine-generated report fixtures and golden reports used by web and engine tests | Built |
| T-UPL-01 | 04 | Extraction fixtures used by web tests | Built |

## Feature 01 — Data and Engine

Design sections refer to [`features/01-data-and-engine/design.md`](features/01-data-and-engine/design.md); AC IDs to its [`requirements.md`](features/01-data-and-engine/requirements.md) §4. All tests are automated (pytest) in `engine/tests/` (`test_registry`, `test_data`, `test_gaps`, `test_calendar`, `test_candles`, `test_indicators`, `test_conditions`, `test_pricing`, `test_strikes`, `test_gates`, `test_exits`, `test_costs_runner`, `test_contracts`, `test_api`, `test_agnostic`, `test_lambda_handler`; benchmarks in `tests/perf/`).

| Requirement | Summary | Design | Task(s) | Test(s) | Status |
|---|---|---|---|---|---|
| REQ-DAT-01 | Load + validate profiles at start-up | §2.1 | T-DAT-01, T-DAT-05 | AC-DAT-01; profile contract test | Built |
| REQ-DAT-02 | Fail fast on an invalid profile | §2.1, §4 | T-DAT-05 | AC-DAT-01 | Built |
| REQ-DAT-03 | No instrument constants in engine code | §2.1 | T-DAT-01, T-DAT-05, T-DAT-09 | AC-DAT-02 (grep test) | Built |
| REQ-DAT-04 | Second profile works with no code change | §2.1 | T-DAT-09 | AC-DAT-02 | Built |
| REQ-DAT-05 | CSV → Parquet at build; engine reads Parquet | §2.1 | T-DAT-04 | Row-count/dtype unit test | Built |
| REQ-DAT-06 | Load-time checks | §2.3 | T-DAT-06 | AC-DAT-03 | Built |
| REQ-DAT-07 | Bad day excluded, never crash | §2.3 | T-DAT-06 | AC-DAT-03 | Built |
| REQ-DAT-08 | Load once per container | §2.2 | T-DAT-06, T-ENG-16 | Loader cache unit test | Built |
| REQ-DAT-09 | Data range read from data | §2.2, §2.16 | T-DAT-06, T-DAT-10 | AC-DAT-04 | Built |
| REQ-DAT-10 | Never fill missing minutes | §2.2 | T-DAT-07 | AC-DAT-05 | Built |
| REQ-DAT-11 | Gap inventory (whole data, per period) | §2.4 | T-DAT-07 | AC-DAT-07 | Built |
| REQ-DAT-12 | Nifty-without-VIX minute unpriceable | §2.2, §2.9 | T-DAT-07 | AC-DAT-05 | Built |
| REQ-DAT-13 | VIX-less day skipped and listed | §2.2, §2.4 | T-DAT-07 | AC-DAT-06 | Built |
| REQ-DAT-14 | Expiries from rules + trading days | §2.5 | T-DAT-08 | AC-DAT-08 | Built |
| REQ-DAT-15 | Trading days incl. extra trading days | §2.5 | T-DAT-08 | AC-DAT-08 | Built |
| REQ-DAT-16 | Holiday → previous trading day | §2.5 | T-DAT-08 | AC-DAT-08 | Built |
| REQ-DAT-17 | Calendar equals the recorded check | §2.5 | T-DAT-08 | AC-DAT-08 | Built |
| REQ-DAT-18 | No weekly expiries before availability | §2.5 | T-DAT-08 | AC-DAT-09 | Built |
| REQ-DAT-19 | `/v1/meta` response | §2.16 | T-DAT-10 | AC-DAT-04; schema validation of response | Built |
| REQ-ENG-01 | Candles from present minutes, anchored at session open | §2.6 | T-ENG-01 | AC-ENG-01 | Built |
| REQ-ENG-02 | No cross-day candles; short last candle | §2.6 | T-ENG-01 | AC-ENG-01 | Built |
| REQ-ENG-03 | Indicator formulas | §2.7 | T-ENG-02, T-ENG-03 | AC-ENG-02 | Built |
| REQ-ENG-04 | Warm-up from data start | §2.7 | T-ENG-03 | AC-ENG-03 | Built |
| REQ-ENG-05 | No VWAP | §2.7, §3 | T-DAT-02, T-ENG-03 | Invalid VWAP fixture fails schema | Built |
| REQ-ENG-06 | All/any trees on candle close | §2.8 | T-ENG-04 | AC-ENG-05 | Built |
| REQ-ENG-07 | Compare with offsets | §2.8 | T-ENG-04 | Evaluator unit tests | Built |
| REQ-ENG-08 | Cross definition | §2.8 | T-ENG-04 | AC-ENG-04 | Built |
| REQ-ENG-09 | Turns / state | §2.8 | T-ENG-04 | Evaluator unit tests | Built |
| REQ-ENG-10 | Slope definition | §2.8 | T-ENG-04 | AC-ENG-05 | Built |
| REQ-ENG-11 | Missing operand → false | §2.8 | T-ENG-04 | Evaluator NaN tests | Built |
| REQ-ENG-12 | Black-Scholes with VIX | §2.9 | T-ENG-05 | AC-ENG-06 | Built |
| REQ-ENG-13 | Tick rounding, one-tick floor | §2.9 | T-ENG-05 | AC-ENG-06 | Built |
| REQ-ENG-14 | Minute premium range from spot high/low | §2.9 | T-ENG-05 | Monotonicity unit tests | Built |
| REQ-ENG-15 | Three runs (0, −S, +S) | §2.11 | T-ENG-13 | AC-ENG-25 | Built |
| REQ-ENG-16 | Moneyness strike selection | §2.10 | T-ENG-06 | AC-ENG-07 | Built |
| REQ-ENG-17 | Delta / premium strike selection | §2.10 | T-ENG-06 | Strike search unit tests | Built |
| REQ-ENG-18 | Expiry kind → contract | §2.5 | T-DAT-08 | Contract lookup unit tests | Built |
| REQ-ENG-19 | Entire strategy satisfied | §2.12, §2.13 | T-ENG-08 | AC-ENG-08, AC-ENG-22 | Built |
| REQ-ENG-20 | No catch-up; first failing reason counted | §2.13 | T-ENG-08 | AC-ENG-08; ordering test | Built |
| REQ-ENG-21 | Fill at the next minute's open ± slippage | §2.12, §2.14 | T-ENG-09 | AC-ENG-09 | Built |
| REQ-ENG-22 | One position at a time | §2.11 | T-ENG-08 | AC-ENG-08 | Built |
| REQ-ENG-23 | Stop/target per minute; gap fills | §2.14 | T-ENG-09 | AC-ENG-10 | Built |
| REQ-ENG-24 | SL before target in one minute | §2.14 | T-ENG-09 | AC-ENG-10 | Built |
| REQ-ENG-25 | Stop-loss levels incl. trigger candle and cap | §2.14 | T-ENG-09 | AC-ENG-12 | Built |
| REQ-ENG-26 | Targets incl. R:R | §2.14 | T-ENG-09 | AC-ENG-12 | Built |
| REQ-ENG-27 | Trail to cost | §2.14 | T-ENG-09 | AC-ENG-12 | Built |
| REQ-ENG-28 | Exit after N candles | §2.14 | T-ENG-09 | AC-ENG-13 | Built |
| REQ-ENG-29 | Time exit and 15:15 square-off | §2.14 | T-ENG-09 | AC-ENG-11 | Built |
| REQ-ENG-30 | Unpriceable exit → next priceable minute | §2.14 | T-ENG-09 | Exit unit test | Built |
| REQ-ENG-31 | Expiry settlement at intrinsic | §2.14 | T-ENG-09 | AC-ENG-14 | Built |
| REQ-ENG-32 | Multi-leg combined position | §2.14 | T-ENG-10 | AC-ENG-15 | Built |
| REQ-ENG-33 | Overnight checks from next day's first priceable minute | §2.14 | T-ENG-09 | Overnight gap unit test | Built |
| REQ-ENG-34 | Quantity = lots × lot size | §2.15 | T-ENG-11 | AC-ENG-16 | Built |
| REQ-ENG-35 | VIX sizing, 1-lot minimum, no-effect note | §2.15 | T-ENG-11 | AC-ENG-17 | Built |
| REQ-ENG-36 | Costs per order | §2.15 | T-ENG-11 | AC-ENG-18 | Built |
| REQ-ENG-37 | No defaults for missing values | §2.16 | T-ENG-07, T-ENG-11 | AC-ENG-20 | Built |
| REQ-ENG-38 | Max trades per day | §2.11, §2.13 | T-ENG-12 | AC-ENG-19 | Built |
| REQ-ENG-39 | Stop after N STOP_LOSS exits | §2.11, §2.13 | T-ENG-12 | AC-ENG-19 | Built |
| REQ-ENG-40 | Max daily loss blocks entries only | §2.11, §2.13 | T-ENG-12 | AC-ENG-19 | Built |
| REQ-ENG-41 | Validate request (schema + SEM) | §2.16 | T-DAT-02, T-ENG-07, T-ENG-14 | AC-ENG-20; SEM fixtures | Built |
| REQ-ENG-42 | Entries only inside period; follow to exit | §2.12 | T-ENG-08 | AC-ENG-21 | Built |
| REQ-ENG-43 | RunResult for feature 02 | §2.11 | T-ENG-13, T-ENG-14 | RunResult shape test; contract test | Built |
| REQ-ENG-44 | Deterministic | §2.11 | T-ENG-13 | AC-ENG-23 | Built |
| REQ-ENG-45 | Performance budgets | §2.17 | T-ENG-15, T-ENG-16 | AC-ENG-24 (reference machine; Lambda timing after deploy) | Built |
| REQ-ENG-46 | Next-day fill skipped | §2.12, §2.13 | T-ENG-08 | AC-ENG-26 | Built |
| REQ-ENG-47 | Conflicting CE/PE signals skipped | §2.12, §2.13 | T-ENG-08 | AC-ENG-27 | Built |

**Coverage check (feature 01):** 66 requirements (19 DAT + 47 ENG) · all have a design section, at least one task and at least one automated test.

## Feature 02 — Evaluation and Report

Design sections refer to [`features/02-evaluation-and-report/design.md`](features/02-evaluation-and-report/design.md); AC IDs to its [`requirements.md`](features/02-evaluation-and-report/requirements.md) §4. Web tests: `web/e2e/evaluate.spec.ts`, `web/e2e/more.spec.ts` (Playwright), `web/src/api/client.test.ts`, `web/src/features.test.ts` (Vitest). Report building: `engine/tests/test_report.py`.

| Requirement | Summary | Design | Task(s) | Test(s) | Status |
|---|---|---|---|---|---|
| REQ-EVL-01 | Plain-English rules incl. "Not used" | §1.1, §1.7 | T-RPT-01, T-EVL-01 | AC-EVL-01 (component) | Built |
| REQ-EVL-02 | Evaluation settings with pre-fills and sources | §1.1 | T-EVL-02 | AC-EVL-02 (component) | Built |
| REQ-EVL-03 | Edit links to builder steps; inline settings | §1.1 | T-EVL-01 | AC-EVL-10 (component) | Built |
| REQ-EVL-04 | Confirm pre-fills | §1.1 | T-EVL-02, T-EVL-03 | AC-EVL-03, AC-EVL-10 (component) | Built |
| REQ-EVL-05 | Evaluate disabled; missing items named | §1.1 | T-EVL-03 | AC-EVL-04 (component) | Built |
| REQ-EVL-06 | 4-hour intraday note | §1.1 | T-EVL-03 | AC-EVL-05 (component) | Built |
| REQ-EVL-07 | Disclaimer and modelled-premium note on review | §1.1 | T-EVL-03 | Playwright review test | Built |
| REQ-EVL-08 | Evaluate: permission, request, progress | §1.2 | T-EVL-04, T-EVL-06 | AC-EVL-06, AC-EVL-08 (Playwright) | Built |
| REQ-EVL-09 | Progress stages, learning content, warning | §1.3 | T-EVL-05 | AC-EVL-06 (Playwright) | Built |
| REQ-EVL-10 | Leave-page warning | §1.2 | T-EVL-06 | AC-EVL-06 (Playwright) | Built |
| REQ-EVL-11 | Cancel; late response discarded | §1.2 | T-EVL-04 | AC-EVL-07 (Playwright) | Built |
| REQ-EVL-12 | Report ready: title, notification, open | §1.2 | T-EVL-06 | AC-EVL-08 (Playwright) | Built |
| REQ-EVL-13 | Busy retries, 422, errors | §1.2, §4 | T-EVL-04 | AC-EVL-09 (Playwright) | Built |
| REQ-RPT-01 | Figures from the selected period only | §2.2 | T-RPT-03 | AC-RPT-01 (pytest) | Built |
| REQ-RPT-02 | Metric definitions | §2.2 | T-RPT-03 | AC-RPT-02 (pytest) | Built |
| REQ-RPT-03 | Equity curve and drawdown | §2.2 | T-RPT-03 | AC-RPT-02 (pytest) | Built |
| REQ-RPT-04 | Capital-based % | §2.2, §1.4 | T-RPT-03, T-RPT-11 | AC-RPT-03 (pytest, component) | Built |
| REQ-RPT-05 | Seven breakdowns | §2.3, §1.5 | T-RPT-05, T-RPT-13 | AC-RPT-04 (pytest); component | Built |
| REQ-RPT-06 | Regime from previous-day ADX | §2.4 | T-RPT-04 | AC-RPT-04 (pytest) | Built |
| REQ-RPT-07 | In/out-of-sample split | §2.5 | T-RPT-06 | AC-RPT-05 (pytest) | Built |
| REQ-RPT-08 | Overfitting status | §2.5, §1.5 | T-RPT-06, T-RPT-14 | AC-RPT-05 (pytest); AC-RPT-11 | Built |
| REQ-RPT-09 | Volatility sensitivity | §2.6 | T-RPT-07, T-RPT-14 | AC-RPT-06 (pytest) | Built |
| REQ-RPT-10 | Summary from fixed templates, risk first | §2.7 | T-RPT-08 | AC-RPT-07 (golden + scan) | Built |
| REQ-RPT-11 | Settings used incl. "Not used" and no-effect rules | §2.8 | T-RPT-01, T-RPT-09, T-RPT-16 | AC-RPT-08 (pytest) | Built |
| REQ-RPT-12 | Skipped data and signals | §2.8 | T-RPT-09, T-RPT-16 | AC-RPT-09 (pytest) | Built |
| REQ-RPT-13 | Simulation notes and disclosures | §2.8 | T-RPT-09, T-RPT-16 | Golden report check | Built |
| REQ-RPT-14 | Complete report with zero trades | §2.7, §1.5 | T-RPT-08, T-RPT-16 | AC-RPT-10 (pytest, Playwright) | Built |
| REQ-RPT-15 | Report section order, risk first | §1.4 | T-RPT-11 | AC-RPT-11 (Playwright) | Built |
| REQ-RPT-16 | Captions, table toggle, never colour only | §1.5 | T-RPT-12, T-RPT-13 | AC-RPT-11 (Playwright) | Built |
| REQ-RPT-17 | Trades table, 50 per page | §1.4 | T-RPT-15 | AC-RPT-12 (component) | Built |
| REQ-RPT-18 | Overfit flag prominence and alternatives | §1.5 | T-RPT-14 | AC-RPT-11 (Playwright) | Built |
| REQ-RPT-19 | PDF in the browser | §1.6 | T-RPT-17 | AC-RPT-13 (Playwright) | Built |
| REQ-RPT-20 | CSV in the browser (trades ≥ 1) | §1.6 | T-RPT-18 | AC-RPT-14, AC-RPT-15 (Playwright) | Built |
| REQ-RPT-21 | File names | §1.6 | T-RPT-17, T-RPT-18 | AC-RPT-13, AC-RPT-14 (unit + Playwright) | Built |

**Coverage check (feature 02):** 34 requirements (13 EVL + 21 RPT) · all have a design section, at least one task and at least one automated test.

## Feature 03 — Strategy Builder

Design sections refer to [`features/03-strategy-builder/design.md`](features/03-strategy-builder/design.md); AC IDs to its [`requirements.md`](features/03-strategy-builder/requirements.md) §3. Tests: `web/src/strategy/strategy.test.ts`, `web/src/contracts/fixtures.test.ts` (Vitest), `web/e2e/flows.spec.ts` and `web/e2e/more.spec.ts` (Playwright).

| Requirement | Summary | Design | Task(s) | Test(s) | Status |
|---|---|---|---|---|---|
| REQ-INP-01 | Completeness check (13 inputs, positional exit question) | §1.2 | T-INP-02 | AC-INP-01 (unit) | Built |
| REQ-INP-02 | `describeStrategy` for every element | §1.3 | T-INP-03 | AC-INP-02 (unit) | Built |
| REQ-INP-03 | Same validation as the engine | §1.1, §1.12 | T-INP-01, T-INP-04 | AC-INP-03 (shared fixtures) | Built |
| REQ-INP-04 | Four steps + Advanced, `?step` | §1.4 | T-INP-06 | AC-INP-04 (Playwright) | Built |
| REQ-INP-05 | Next gating, forward-lock | §1.4 | T-INP-06 | AC-INP-04 (Playwright) | Built |
| REQ-INP-06 | Load from template / review | §1.4 | T-INP-06 | AC-INP-05 (Playwright) | Built |
| REQ-INP-07 | Review strategy when complete | §1.4 | T-INP-06 | AC-INP-04 (Playwright) | Built |
| REQ-INP-08 | Basics fields and pre-fill confirmation | §1.5 | T-INP-07 | AC-INP-06 (component) | Built |
| REQ-INP-09 | 4-hour intraday note | §1.5 | T-INP-07 | AC-INP-06 (component) | Built |
| REQ-INP-10 | Strike with live example | §1.5 | T-INP-08 | AC-INP-07 (component) | Built |
| REQ-INP-11 | Three entry trigger modes | §1.5 | T-INP-09 | AC-INP-08 (component) | Built |
| REQ-INP-12 | Indicator manager, empty params with suggestions | §1.6 | T-INP-09 | AC-INP-09 (component) | Built |
| REQ-INP-13 | VWAP shown unavailable with reason | §1.6 | T-INP-09 | AC-INP-09 (component) | Built |
| REQ-INP-14 | Sentence-style conditions and groups | §1.7 | T-INP-10 | AC-INP-08, AC-INP-10 (component) | Built |
| REQ-INP-15 | Separate Call/Put sets; Mirror from Call | §1.8 | T-INP-11 | AC-INP-11 (unit + component) | Built |
| REQ-INP-16 | Single side shows one set | §1.7 | T-INP-10 | Playwright builder end-to-end test | Built |
| REQ-INP-17 | Exit step incl. positional question | §1.5 | T-INP-12 | AC-INP-12 (component) | Built |
| REQ-INP-18 | Advanced options off, empty when on | §1.9 | T-INP-13 | AC-INP-13 (component) | Built |
| REQ-INP-19 | All advanced options supported | §1.9 | T-INP-13 | AC-INP-13 (component) | Built |
| REQ-INP-20 | Multi-leg editor | §1.10 | T-INP-14 | AC-INP-14 (component) | Built |
| REQ-INP-21 | Plain-English messages beside fields | §1.12 | T-INP-04, T-INP-05 | AC-INP-15 (component) | Built |

**Coverage check (feature 03):** 21 requirements · all have a design section, at least one task and at least one automated test.

## Feature 04 — Document Upload

Design sections refer to [`features/04-document-upload/design.md`](features/04-document-upload/design.md); AC IDs to its [`requirements.md`](features/04-document-upload/requirements.md) §3. Tests: `extractor/tests/` (pytest, replayed recordings), `web/e2e/flows.spec.ts` and `web/e2e/more.spec.ts` (Playwright), `web/src/features.test.ts` (upload checks).

| Requirement | Summary | Design | Task(s) | Test(s) | Status |
|---|---|---|---|---|---|
| REQ-UPL-01 | File or paste input with privacy notice | §1.2 | T-UPL-09 | AC-UPL-01 (component) | Built |
| REQ-UPL-02 | Client-side refusal of bad input | §1.2 | T-UPL-09 | AC-UPL-01 (component) | Built |
| REQ-UPL-03 | Submit, waiting state, Cancel | §1.2 | T-UPL-09, T-UPL-10 | AC-UPL-02 (Playwright) | Built |
| REQ-UPL-04 | Read in memory; unreadable → message | §2.1 | T-UPL-03 | AC-UPL-03 (pytest) | Built |
| REQ-UPL-05 | FOUND / VAGUE / UNSUPPORTED with quotes | §2.2, §2.4 | T-UPL-04, T-UPL-05, T-UPL-06, T-UPL-07 | AC-UPL-04 (pytest, recordings) | Built |
| REQ-UPL-06 | Never fill unstated values | §2.3 | T-UPL-05, T-UPL-07 | AC-UPL-04 (pytest) | Built |
| REQ-UPL-07 | Ignore non-rule text | §2.4 | T-UPL-05 | AC-UPL-05 (pytest) | Built |
| REQ-UPL-08 | Unmentioned advanced options OFF, not asked | §2.3 | T-UPL-07 | AC-UPL-06 (pytest + Playwright) | Built |
| REQ-UPL-09 | One question per vague item, patches | §2.3 | T-UPL-07 | AC-UPL-04 (pytest) | Built |
| REQ-UPL-10 | Deterministic conversion; fail instead of partial | §2.1, §2.3 | T-UPL-04, T-UPL-06, T-UPL-07 | AC-UPL-04 (pytest) | Built |
| REQ-UPL-11 | Missing items from completeness | §1.3 | T-UPL-11 | AC-UPL-07, AC-UPL-11 (Playwright) | Built |
| REQ-UPL-12 | Grouped results with quotes | §1.3 | T-UPL-11 | AC-UPL-08 (component) | Built |
| REQ-UPL-13 | One question at a time, ordered, Back | §1.4 | T-UPL-12 | AC-UPL-09 (Playwright) | Built |
| REQ-UPL-14 | Apply patches; re-check completeness | §1.4 | T-UPL-12 | AC-UPL-07, AC-UPL-09 (Playwright) | Built |
| REQ-UPL-15 | No evaluation until all answered | §1.4 | T-UPL-12 | AC-UPL-10 (Playwright) | Built |
| REQ-UPL-16 | Unsupported acknowledged and listed | §1.5 | T-UPL-13 | AC-UPL-12 (Playwright) | Built |
| REQ-UPL-17 | Hand-off to review | §1.6 | T-UPL-14 | AC-UPL-13 (Playwright) | Built |
| REQ-UPL-18 | No rules found | §1.3 | T-UPL-11 | AC-UPL-14 (component) | Built |
| REQ-UPL-19 | Error messages | §1.7, §4 | T-UPL-15 | AC-UPL-14 (component) | Built |
| REQ-UPL-20 | Advanced sample questions | §2.5 | T-UPL-08 | AC-UPL-15 (replay; live before release) | Built |
| REQ-UPL-21 | One-line sample questions | §2.5 | T-UPL-08, T-UPL-12 | AC-UPL-07 (replay + Playwright) | Built |

**Coverage check (feature 04):** 21 requirements · all have a design section, at least one task and at least one automated test (sample behaviour is tested by replaying recorded responses; the live run before release is an extra check).

## Feature 05 — Beginner Mode

Design sections refer to [`features/05-beginner-mode/design.md`](features/05-beginner-mode/design.md); AC IDs to its [`requirements.md`](features/05-beginner-mode/requirements.md) §3. Tests: `web/src/features.test.ts` (Vitest), `web/e2e/evaluate.spec.ts` and `web/e2e/flows.spec.ts` (Playwright).

| Requirement | Summary | Design | Task(s) | Test(s) | Status |
|---|---|---|---|---|---|
| REQ-BEG-01 | Intro page sections and Get started | §1.1 | T-BEG-02 | AC-BEG-01 (Playwright) | Built |
| REQ-BEG-02 | No hype, names or hardcoded dates on the intro | §1.1 | T-BEG-02 | AC-BEG-01 (copy scans) | Built |
| REQ-BEG-03 | Choose a path page | §1.2 | T-BEG-03 | AC-BEG-02 (Playwright) | Built |
| REQ-BEG-04 | Template card contents | §1.3 | T-BEG-04, T-BEG-05 | AC-BEG-03 (component) | Built |
| REQ-BEG-05 | Three templates, all valid | §1.3, §5 | T-BEG-01, T-BEG-04 | AC-BEG-03 (schema + SEM in both suites) | Built |
| REQ-BEG-06 | Use this template → review with shown values confirmed | §1.3 | T-BEG-05 | AC-BEG-04 (Playwright) | Built |
| REQ-BEG-07 | Customize → builder | §1.3 | T-BEG-05 | AC-BEG-05 (Playwright) | Built |
| REQ-BEG-08 | Straddle risk note | §1.3 | T-BEG-05 | AC-BEG-06 (component) | Built |
| REQ-BEG-09 | Glossary of all §16 terms | §1.4 | T-BEG-06 | AC-BEG-07 (unit) | Built |
| REQ-BEG-10 | Glossary terms in copy | §1.4 | T-BEG-06 | AC-BEG-07 (Playwright + axe) | Built |
| REQ-BEG-11 | Tooltips for every field and metric | §1.4 | T-BEG-07 | AC-BEG-08 (coverage test) | Built |
| REQ-BEG-12 | Six Learn articles | §1.5 | T-BEG-08 | AC-BEG-09 (word count, scan) | Built |
| REQ-BEG-13 | Progress-screen article cards | §1.5 | T-BEG-09 | AC-BEG-09 (Playwright) | Built |
| REQ-BEG-14 | What-if sliders and ranges | §1.6 | T-BEG-10 | AC-BEG-10 (Playwright) | Built |
| REQ-BEG-15 | Debounced re-run, cancel earlier | §1.6 | T-BEG-10 | AC-BEG-10, AC-BEG-11 (Playwright) | Built |
| REQ-BEG-16 | Side-by-side comparison and sentence | §1.6 | T-BEG-10 | AC-BEG-10 (Playwright) | Built |
| REQ-BEG-17 | Original untouched; Use these settings | §1.6 | T-BEG-10 | AC-BEG-12 (Playwright) | Built |
| REQ-BEG-18 | Not-applicable explanation | §1.6 | T-BEG-10 | AC-BEG-13 (component) | Built |

**Coverage check (feature 05):** 18 requirements · all have a design section, at least one task and at least one automated test.

## Feature 06 — Suggestions

Design sections refer to [`features/06-suggestions/design.md`](features/06-suggestions/design.md); AC IDs to its [`requirements.md`](features/06-suggestions/requirements.md) §3. Tests: `engine/tests/test_suggestions.py` (pytest), `web/src/features.test.ts` (Vitest), `web/e2e/flows.spec.ts` (Playwright).

| Requirement | Summary | Design | Task(s) | Test(s) | Status |
|---|---|---|---|---|---|
| REQ-SUG-01 | On-demand Show ideas | §1.1, §1.2 | T-SUG-05 | AC-SUG-01 (component) | Built |
| REQ-SUG-02 | Not offered below 30 trades | §2.1 | T-SUG-02, T-SUG-05 | AC-SUG-02 (pytest, component) | Built |
| REQ-SUG-03 | ≤ 12 valid one-change variants with texts | §2.5 | T-SUG-01, T-SUG-02, T-SUG-04 | AC-SUG-03 (pytest) | Built |
| REQ-SUG-04 | SL/target sweeps | §2.2 | T-SUG-02 | AC-SUG-03 (pytest) | Built |
| REQ-SUG-05 | VIX-band and side filters | §2.3 | T-SUG-03 | AC-SUG-04 (pytest) | Built |
| REQ-SUG-06 | One alternative | §2.4 | T-SUG-04 | AC-SUG-05 (pytest) | Built |
| REQ-SUG-07 | Same settings, concurrency 4, progress, abort | §1.2 | T-SUG-06 | AC-SUG-06 (Playwright) | Built |
| REQ-SUG-08 | Cards with whole/unseen comparison and overfit status | §1.3 | T-SUG-07 | AC-SUG-07 (component) | Built |
| REQ-SUG-09 | Tuning check per sweep group | §1.3 | T-SUG-08 | AC-SUG-08 (component) | Built |
| REQ-SUG-10 | No ranking; past-simulated wording; disclaimer | §1.1, §2.5 | T-SUG-05, T-SUG-07 | AC-SUG-09 (scan + component) | Built |
| REQ-SUG-11 | Try this version → review | §1.3 | T-SUG-07 | AC-SUG-10 (Playwright) | Built |
| REQ-SUG-12 | Per-card failure with Retry | §1.2, §4 | T-SUG-06 | AC-SUG-11 (Playwright) | Built |

**Coverage check (feature 06):** 12 requirements · all have a design section, at least one task and at least one automated test.

## Feature 07 — Privacy and Legal

Design sections refer to [`features/07-privacy-and-legal/design.md`](features/07-privacy-and-legal/design.md); AC IDs to its [`requirements.md`](features/07-privacy-and-legal/requirements.md) §3. Tests: `web/src/legal/legal.test.ts`, `web/src/features.test.ts` (Vitest), `web/e2e/legal.spec.ts` and `web/e2e/more.spec.ts` (Playwright), `extractor/tests/test_llm_privacy.py`, `scripts/privacy-marker-test.sh`, `scripts/check-names.mjs`, `scripts/sync-readme-disclaimer.mjs --check`.

| Requirement | Summary | Design | Task(s) | Test(s) | Status |
|---|---|---|---|---|---|
| REQ-PRV-01 | Intro, Disclaimer, Learn readable without accepting | §1.1 | T-PRV-15 | AC-PRV-01 (Playwright) | Built |
| REQ-PRV-02 | Gate on Get started / any gated route | §1.1 | T-PRV-15 | AC-PRV-02, AC-PRV-03 (Playwright) | Built |
| REQ-PRV-03 | Continue disabled until ticked | §1.1 | T-PRV-15 | AC-PRV-04 (component) | Built |
| REQ-PRV-04 | Record acceptance; continue to the intended page | §1.1 | T-PRV-15 | AC-PRV-02, AC-PRV-03 (Playwright) | Built |
| REQ-PRV-05 | No gated content before acceptance | §1.1 | T-PRV-15 | AC-PRV-03 (Playwright, DOM check) | Built |
| REQ-PRV-06 | Only `localStorage["nikasha.disclaimer"]` | §1.2 | T-PRV-13 | AC-PRV-05 (unit) | Built |
| REQ-PRV-07 | Re-accept when the text changes | §1.2, §1.3 | T-PRV-12, T-PRV-13 | AC-PRV-06 (unit); version-hash unit test | Built |
| REQ-PRV-08 | Works when storage is blocked | §1.2 | T-PRV-13 | AC-PRV-07 (unit) | Built |
| REQ-PRV-09 | Wait for real dates; Try again on failure | §1.1, §1.5 | T-PRV-14, T-PRV-15, T-PRV-03 | AC-PRV-08, AC-PRV-20 (component, Playwright) | Built |
| REQ-PRV-10 | Full disclaimer exact text, dates from data, gate / page / README | §1.3, §1.4, §1.7 | T-PRV-12, T-PRV-16, T-PRV-21, T-PRV-03, T-PRV-25 | AC-PRV-08, AC-PRV-11; text-drift unit test; README CI check | Built |
| REQ-PRV-11 | Short disclaimer in every footer | §1.4 | T-PRV-16 | AC-PRV-09 (Playwright, all routes) | Built |
| REQ-PRV-12 | Short disclaimer on report and suggestion panels | §1.4 | T-PRV-16, T-PRV-18 | AC-PRV-10 (Playwright) | Built |
| REQ-PRV-13 | Short disclaimer in PDF (top + every footer) | §1.4 | T-PRV-18 | AC-PRV-10 (unit + Playwright download) | Built |
| REQ-PRV-14 | Short disclaimer, source, period in CSV preamble | §1.4 | T-PRV-18 | AC-PRV-10 (unit + Playwright download) | Built |
| REQ-PRV-15 | "dates unavailable", never a hardcoded range | §1.3 | T-PRV-12, T-PRV-14, T-PRV-03 | AC-PRV-08 (unit, Playwright) | Built |
| REQ-PRV-16 | Data source on intro, report, downloads | §1.4 | T-PRV-16, T-PRV-18, T-PRV-03 | AC-PRV-10 (Playwright) | Built |
| REQ-PRV-17 | Trademark notice | §1.4, §1.7 | T-PRV-16, T-PRV-21, T-PRV-25 | AC-PRV-11 (Playwright, README check) | Built |
| REQ-PRV-18 | Non-commercial, educational data use statement | §1.4, §1.7 | T-PRV-16, T-PRV-21, T-PRV-25 | AC-PRV-11 (Playwright, README check) | Built |
| REQ-PRV-19 | No server-side storage of any user content | §2.5 | T-PRV-10 | AC-PRV-12 (template test) | Built |
| REQ-PRV-20 | Uploads in memory only; no disk writes | §2.3 | T-PRV-08 | AC-PRV-12 (pytest, write traps + `/tmp` check) | Built |
| REQ-PRV-21 | Browser keeps user content in tab memory only | §1.2, §1.6 | T-PRV-13 | AC-PRV-13 (Playwright); lint rule | Built |
| REQ-PRV-22 | No cookies, analytics, third-party scripts/fonts | §1.6 | T-PRV-13, T-PRV-19 | AC-PRV-13 (Playwright, request inspection) | Built |
| REQ-PRV-23 | User content only to engine / extraction URLs | §1.6 | T-PRV-19 | AC-PRV-14 (Playwright, request inspection) | Built |
| REQ-PRV-24 | Only extracted text sent to the AI provider | §2.3, §2.4, §2.5 | T-PRV-08, T-PRV-09, T-PRV-10 | AC-PRV-15 (pytest, recording stub) | Built |
| REQ-PRV-25 | Allow-listed log fields only | §2.1, §2.2 | T-PRV-04, T-PRV-05, T-PRV-06, T-PRV-07, T-PRV-23 | AC-PRV-16 (marker E2E); `nikasha_log` unit tests | Built |
| REQ-PRV-26 | Exceptions logged without messages | §2.1, §2.2 | T-PRV-04, T-PRV-06, T-PRV-07, T-PRV-23 | AC-PRV-16 (marker E2E); wrapper pytest | Built |
| REQ-PRV-27 | 1-day log retention; no access logs / drains | §2.5 | T-PRV-10, T-PRV-24 | AC-PRV-12 (template test) | Built |
| REQ-PRV-28 | No user content in the browser console (prod) | §1.6 | T-PRV-19, T-PRV-23 | AC-PRV-16 (marker E2E, console capture) | Built |
| REQ-PRV-29 | Upload notice about the AI provider and retention | §1.4 | T-PRV-17 | AC-PRV-17 (component, Playwright) | Built |
| REQ-PRV-30 | AI-provider text matches its policy; re-checked each release | §1.4 | T-PRV-17, T-PRV-24 | Unit test on the single retention constant (automated); release checklist (manual policy check) | Built |
| REQ-PRV-31 | No signals, promises or "best" rankings | §2.6, §3.1 | T-PRV-01, T-PRV-11, T-PRV-20 | AC-PRV-18 (scans) | Built |
| REQ-PRV-32 | Past-simulated wording for suggestions and summaries | §2.6, §3.1 | T-PRV-11, T-PRV-20 | AC-PRV-18 (scans) | Built |
| REQ-PRV-33 | No banned phrases anywhere | §3.1 | T-PRV-01, T-PRV-11, T-PRV-20 | AC-PRV-18 (scans) | Built |
| REQ-PRV-34 | No competing product names | §3.2 | T-PRV-02, T-PRV-22, T-PRV-25 | AC-PRV-19 (CI name check) | Built |
| REQ-PRV-35 | Back to intro; declining stores nothing | §1.1 | T-PRV-15 | AC-PRV-21 (Playwright) | Built |
| REQ-PRV-36 | Acceptance never expires by time | §1.2 | T-PRV-13 | AC-PRV-22 (unit, fake clock) | Built |

**Coverage check (feature 07):** 36 requirements · 36 with at least one design section · 36 with at least one task · 36 with at least one automated test (REQ-PRV-30 also has a manual release check, because the provider's policy is external).

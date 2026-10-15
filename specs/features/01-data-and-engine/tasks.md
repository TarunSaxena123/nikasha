# Feature 01 — Data and Engine: Tasks

Status: **Approved 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) via [`design.md`](design.md)

Rules: [CONTRACT] tasks first; this feature has no [FE] tasks (backend only). **Build step** = `product.md` §15. **Done** = code written, its tests passing, `traceability.md` updated. No test calls a paid service. Feature 07 tasks that run in the same steps (T-PRV-04/05/06 logging and request wrapper, T-PRV-10 SAM) are prerequisites where noted.

## Contract tasks

| ID | Task | Req. | Tests that prove it | Build step |
|---|---|---|---|---|
| T-DAT-01 | [CONTRACT] Create `instruments/nifty50.json` from the `instrument.schema.json` example (values exactly as approved) | DAT-01, 03 | Validates against the schema in the contract test | 2 |
| T-DAT-02 | [CONTRACT] Shared strategy fixtures `specs/contracts/fixtures/strategies/`: `valid/` (Simple Trend Follower, advanced sample with example answers, short straddle, one-line sample after answers) and `invalid/` (one file per SEM rule, named `SEM-xx-*.json`, plus schema-invalid cases incl. a VWAP indicator) | ENG-05, 41 | Contract test: every valid fixture passes the schema; every invalid one fails for the named reason (run by engine now, by web in feature 03) | 2 |
| T-DAT-11 | [CONTRACT] CI pipeline `.github/workflows/ci.yml` (lint, types and tests for `engine/`, `extractor/`, `pylib/`, `web/`; contract checks; repo checks from feature 07) and `scripts/check-contracts.sh`: both JSON Schemas valid and their examples pass; OpenAPI validates; every shared fixture validates (or fails for its named rule); generated Python and TypeScript code is current | — (enables all; architecture §9 contract tests) | CI runs on every push; the script fails on a planted invalid fixture and on stale generated code | 2 |

## Backend tasks

### Data and instruments (build step 2)

| ID | Task | Req. | Tests that prove it |
|---|---|---|---|
| T-DAT-03 | [BE] Engine project scaffold: `engine/` package layout (design §2.1), pyproject, ruff + mypy, pytest; pydantic models generated from `specs/contracts/*.schema.json` with a CI check that generated code is current; `nikasha_log` dependency (T-PRV-04) | — (enables all) | CI runs lint, types, tests, codegen-drift check |
| T-DAT-04 | [BE] `scripts/csv_to_parquet.py` and the Dockerfile build stage that runs it; Parquet git-ignored | DAT-05 | Unit: row counts and dtypes equal the CSVs; image build produces both files |
| T-DAT-05 | [BE] `instruments/registry.py`: load, validate, fail fast, lookup | DAT-01, 02, 03 | AC-DAT-01 (invalid profile → requests refused, code-only log) |
| T-DAT-06 | [BE] `data/loader.py`, `data/checks.py`, `MarketData` (design §2.2–2.3); per-container cache | DAT-06, 07, 08, 09 | AC-DAT-03 (broken-day fixtures, one per check); AC-DAT-04 (range read from data; fixture with other dates) |
| T-DAT-07 | [BE] `data/gaps.py`: whole-data and per-period inventory; unpriceable mask; VIX-less day marking | DAT-10, 11, 12, 13 | AC-DAT-05, 06, 07 (184 / 183 / 2019-07-02 vs `cleaning_report.json`) |
| T-DAT-08 | [BE] `calendar/expiry.py`: trading days, rules, holiday shift, weekly/monthly lists, contract lookup | DAT-14–18, ENG-18 | AC-DAT-08 (exact match with `expiry-calendar-check.md`), AC-DAT-09; `NEXT_WEEKLY` in a monthly week |
| T-DAT-09 | [BE] `TESTIDX` profile + synthetic data generator (tests only; different session, strike interval, expiry weekday, costs); grep test for instrument constants in `nikasha_engine/` | DAT-03, 04 | AC-DAT-02 (runs after T-ENG-13) |
| T-DAT-10 | [BE] `GET /v1/meta` in `core/api.py`; HTTP adapter (`adapters/http_app.py`) for local runs | DAT-19 | AC-DAT-04; response validates against `MetaResponse`; contract fixture `meta.example.json` (T-PRV-03) kept consistent |

### Simulation (build step 3)

| ID | Task | Req. | Tests that prove it |
|---|---|---|---|
| T-ENG-01 | [BE] `candles/resample.py` (design §2.6), incl. volatility candles and per-timeframe cache | ENG-01, 02 | AC-ENG-01 (60- and 240-min boundaries; missing-minute bucket; no cross-day candle) |
| T-ENG-02 | [BE] Indicator reference fixtures: hand-computed small series + longer fixtures generated once with an independent open-source TA library set to design §2.7 conventions; fixture README notes any convention differences | ENG-03 | Fixtures reviewed; used by T-ENG-03 |
| T-ENG-03 | [BE] `indicators/`: SMA, EMA, RMA, RSI, ATR, ADX/±DI, Supertrend, MACD, Bollinger; warm-up per design §2.7; full-series computation | ENG-03, 04, 05 | AC-ENG-02 (1e-6 vs fixtures); AC-ENG-03 (warm EMA at period start); first-valid-index tests |
| T-ENG-04 | [BE] `conditions/evaluator.py` (design §2.8) | ENG-06–11 | AC-ENG-04 (cross equality cases); AC-ENG-05 (ADX rule cases); NaN → false |
| T-ENG-05 | [BE] `pricing/` PricingProvider protocol + `BlackScholesVIXProvider` (design §2.9) | ENG-12, 13, 14 | AC-ENG-06 (reference values, parity, tick, floors); premium range monotonicity for calls and puts |
| T-ENG-06 | [BE] `backtest/strikes.py` (design §2.10) | ENG-16, 17 | AC-ENG-07; delta/premium search tie-break and ±20 range |
| T-ENG-07 | [BE] `validation/semantic.py` (SEM-01…20) + request validation in `/v1/evaluate` (schema then SEM; plain-English problems; no defaults) | ENG-37, 41 | All `invalid/` fixtures fail with the right rule; AC-ENG-20 (missing slippage → 422) |
| T-ENG-08 | [BE] Signals and `backtest/gates.py` (design §2.12–2.13), incl. fixed-time and conditions + time; period limits | ENG-19, 20, 22, 42, 46, 47 | AC-ENG-08, 21, 22, 26, 27; one scenario per skip reason (14) and the first-reason ordering |
| T-ENG-09 | [BE] `backtest/fills.py`, `backtest/exits.py`: single-leg levels table, two-phase exit search, gaps, ties, unpriceable exits, overnight, settlement (design §2.14) | ENG-21, 23–31, 33 | AC-ENG-09, 10, 11, 12, 13, 14 |
| T-ENG-10 | [BE] Multi-leg combined position (design §2.14) | ENG-32 | AC-ENG-15 (straddle combined stop; both legs exit together) |
| T-ENG-11 | [BE] `backtest/sizing.py`, `backtest/costs.py` (design §2.15) | ENG-34, 35, 36, 37 | AC-ENG-16, 17, 18 (charges to the paisa) |
| T-ENG-12 | [BE] Daily limits in `day_state` (design §2.11, §2.13) | ENG-38, 39, 40 | AC-ENG-19 (incl. trail exits not counted as SL hits) |
| T-ENG-13 | [BE] `backtest/runner.py`: one run → `RunResult`; three runs (0, −S, +S) sharing signals; no-effect notes; determinism | ENG-15, 43, 44 | AC-ENG-23, 25; RunResult shape test |
| T-ENG-14 | [BE] Wire `POST /v1/evaluate`: validation (T-ENG-07) → three runs (T-ENG-13) → report builder (feature 02, T-RPT tasks) → response validated against `Report` | ENG-41, 43 | Contract test: response validates against `api.openapi.yaml`; end-to-end with the Simple Trend Follower on a fixed period |
| T-ENG-15 | [BE] Performance benchmarks `engine/tests/perf/` for the `backend.md` §8 cases | ENG-45 | AC-ENG-24 on the reference machine |

### Deployment of the engine (build step 5)

| ID | Task | Req. | Tests that prove it |
|---|---|---|---|
| T-ENG-16 | [BE] `adapters/lambda_handler.py`, engine Dockerfile (Python base + Lambda RIC, Parquet + `instruments/` baked in, CSVs not copied), engine function in the SAM template (with T-PRV-10) | DAT-08, ENG-45 | Local container run passes the `/v1/meta` and evaluate smoke tests; after deploy: smoke test through the Function URL (`architecture.md` §9) and one timed cold start |
| T-ENG-17 | [CONTRACT] Schema, OpenAPI (`Trade.partial_exit`, exit reasons `SIGNAL_EXIT`, `SPOT_TARGET`, `TRAILING_STOP`), SEM-21…25 in both validators, valid and invalid fixtures (incl. the ORB + CPR strategy), regenerated Python and TypeScript code | ENG-48…57 | Contract checks; shared-fixture tests in engine and web | 11 (added 2026-10-15) |
| T-ENG-18 | [BE] `OPENING_RANGE` and `PIVOTS` indicators; candle range and body operands | ENG-48, 49, 50 | AC-ENG-28, 29 | 11 |
| T-ENG-19 | [BE] Exit conditions, trail after points, index levels, `SPOT_LEVEL` target | ENG-51…54 | AC-ENG-30, 31, 32 | 11 |
| T-ENG-20 | [BE] Partial exit, the rest's stop, sizing before the path, split costs | ENG-55, 56, 57 | AC-ENG-33; golden reports for existing strategies unchanged | 11 |

## Order of work

```
Step 2  T-DAT-01, 02, 11  →  T-DAT-03  →  T-DAT-04, 05, 06, 07, 08  →  T-DAT-10
Step 3  T-ENG-01  →  T-ENG-02, 03  →  T-ENG-04, 05, 06, 07  →  T-ENG-08  →  T-ENG-09, 10, 11, 12
        →  T-ENG-13  →  T-DAT-09 (agnosticism)  →  T-ENG-15
Step 4  T-ENG-14 (with feature 02's report builder)
Step 5  T-ENG-16
```

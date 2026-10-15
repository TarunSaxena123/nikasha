# Feature 05 — Beginner Mode: Tasks

Status: **Approved under delegation 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) via [`design.md`](design.md)

Rules: [CONTRACT] first; this feature is frontend only (no [BE] tasks). **Build step** = `product.md` §15. **Done** = code, passing tests, `traceability.md` updated. Depends on feature 02 (review, evaluate flow, report slots) and feature 07 (gate, legal components, scans).

| ID | Task | Req. | Tests that prove it | Build step |
|---|---|---|---|---|
| T-BEG-01 | [CONTRACT] Add `higher-timeframe-trend.json` (design §5) to `specs/contracts/fixtures/strategies/valid/` | 05 | Contract test: valid in schema + SEM (engine now, web in feature 03) | 2 |
| T-BEG-02 | [FE] Intro page `/` from `copy/intro.ts` (design §1.1): seven sections, two Get started buttons, `DataSourceLine`, meta-driven dates | 01, 02 | AC-BEG-01 (Playwright + copy scans) | 6 |
| T-BEG-03 | [FE] Choose a path `/start` (design §1.2) | 03 | AC-BEG-02 (Playwright) | 6 |
| T-BEG-04 | [FE] Template data: `web/src/templates/<id>/strategy.json` + `meta.ts`; `AVAILABLE_TEMPLATES` list. Simple Trend Follower first; Higher-Timeframe Trend; short straddle last (first cut) | 04, 05 | Template files validate (Ajv + `strategyRules.ts`); meta has explanation, risk note and `whatItMeans` for each rule | 6 (STF), 8b (HTF), last (straddle) |
| T-BEG-05 | [FE] Template gallery `/templates` and card: rules table with overrides, displayed confirm values, **Use this template** (→ review fully confirmed) / **Customize**; straddle risk callout | 04, 06, 07, 08 | AC-BEG-03, 04, 05, 06 (component + Playwright with mocked engine) | 6 |
| T-BEG-06 | [FE] Glossary data (`copy/glossary.ts`, all §16 terms incl. VWAP note), `/learn` glossary with A–Z jump bar, `GlossaryTerm` popover, `[[slug]]` copy parser with unknown-slug build failure | 09, 10 | AC-BEG-07 (Playwright + axe); parser unit tests | 6 |
| T-BEG-07 | [FE] Tooltip catalogue `copy/tooltips.ts` keyed by `BuilderFieldId` and `ReportMetricKey`; coverage test | 11 | AC-BEG-08 | 6 (report keys), 8 (builder keys) |
| T-BEG-08 | [FE] Learn articles: draft all six (`content/learn/*.md`) from the design outlines; build-time rendering; word-count and banned-phrase tests; owner review recorded in the release checklist | 12 | AC-BEG-09 | 9 (three progress articles + How to use), 9/P1 (remaining two) |
| T-BEG-09 | [FE] Article cards for the progress screen (used by feature 02 T-EVL-05), opening in an in-page panel | 13 | AC-BEG-09 (progress cards present) | 9 |
| T-BEG-10 | [FE] What-if panel (design §1.6): slider selection and ranges, one change at a time, debounce 600 ms, cancel/stale handling, comparison table and sentence, Use these settings, not-applicable text, short disclaimer | 14–18 | AC-BEG-10, 11, 12, 13 (Playwright with mocked engine) | 10 (P1) |
| T-BEG-11 | [FE] Back links (design §1.7): `BackLink` component, route → parent table, review target by origin, View report on review | 19 | AC-BEG-14 (Playwright) | 11 (added 2026-10-15) |

## Order of work

```
Step 2   T-BEG-01
Step 6   T-BEG-02, 03  →  T-BEG-04 (STF)  →  T-BEG-05  →  T-BEG-06, 07 (report keys)
Step 8   T-BEG-07 (builder keys);  8b: T-BEG-04 (HTF)
Step 9   T-BEG-08, 09
Step 10  T-BEG-10
Step 11  T-BEG-11 (owner request after local testing, 2026-10-15)
Last     T-BEG-04 (straddle) — first thing cut if time runs short
```

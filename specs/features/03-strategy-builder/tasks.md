# Feature 03 — Strategy Builder: Tasks

Status: **Approved under delegation 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) via [`design.md`](design.md)

Rules: frontend only (no [BE] tasks; the engine's validation is feature 01 T-ENG-07). [CONTRACT] first. **Build step** = `product.md` §15. **Done** = code, passing tests, `traceability.md` updated. The shared modules (T-INP-02…05) are built in **step 6**, because the review screen (feature 02) and upload (feature 04) need them before the builder screens.

| ID | Task | Req. | Tests that prove it | Build step |
|---|---|---|---|---|
| T-INP-01 | [CONTRACT] Web test harness that runs every `fixtures/strategies/{valid,invalid}` file through `validate.ts` and asserts the same outcome, rule id and message as the engine's recorded results | 03 | AC-INP-03 | 6 |
| T-INP-02 | [FE] `draft.ts` + `completeness.ts` with the 13 checks and fixed questions (incl. the positional exit question) | 01 | AC-INP-01 (unit) | 6 |
| T-INP-03 | [FE] `describe.ts`: sentence patterns for every node type and the advanced options (12, 15 since 2026-10-15; from `advanced-options.json`); overrides | 02 | AC-INP-02 (unit) | 6 |
| T-INP-04 | [FE] `validate.ts`: Ajv standalone build step + `strategyRules.ts` (SEM-01…20, messages from `strategy-rules.md`) | 03, 21 | AC-INP-03 (with T-INP-01) | 6 |
| T-INP-05 | [FE] `fieldMap.ts`: instancePath/SEM → field id and label; keyword messages | 21 | AC-INP-15; unknown-path fallback test | 6 |
| T-INP-06 | [FE] Builder shell: layout, steps sidebar, `?step` routing, Next gating, forward-lock, live preview, Back to review, Review strategy | 04, 05, 06, 07 | AC-INP-04, AC-INP-05 (Playwright) | 8 |
| T-INP-07 | [FE] Step 1 Basics incl. `ConfirmPrefill`, timeframe list, 4-hour note | 08, 09 | AC-INP-06 (component) | 8 |
| T-INP-08 | [FE] Step 2 Strike incl. live example (rounding as engine) | 10 | AC-INP-07 (component) | 8 |
| T-INP-09 | [FE] Step 3 Entry: trigger modes, indicator manager (chips, ids hidden, VWAP note) | 11, 12, 13 | AC-INP-08, AC-INP-09 | 8 |
| T-INP-10 | [FE] Condition editor: rows, operands, offsets, groups, depth/size limits, reorder, per-row sentence | 14, 16 | AC-INP-10 | 8 |
| T-INP-11 | [FE] `mirror.ts` + Mirror from Call with confirm and `needsReview` highlights | 15 | AC-INP-11 (unit + component) | 8 |
| T-INP-12 | [FE] Step 4 Exit incl. intraday note and positional exit question | 17 | AC-INP-12 (component) | 8 |
| T-INP-13 | [FE] Advanced section: switches off by default, empty required fields, removal on switch-off; SL cap, trigger candle, R:R, trail, N candles, VIX sizing bands, windows, cutoff, daily limits, delta/premium strike | 18, 19 | AC-INP-13 (component) | 8b |
| T-INP-14 | [FE] Multi-leg editor (2–4 legs, shared expiry, restricted triggers, combined-stop note) | 20 | AC-INP-14 (component: straddle equals template) | 8b / last (with the straddle) |
| T-INP-15 | [FE] Indicator picker and value lists for opening range, pivots / CPR, candle range and body; mirror swaps | INP-22, 26 | AC-INP-16, 20 | 11 (added 2026-10-15) |
| T-INP-16 | [FE] Exit-when editor; trail-to-cost choice; index-level target and partial exit editors; describeStrategy texts | INP-23, 24, 25 | AC-INP-17, 18, 19 | 11 |

## Order of work

```
Step 6   T-INP-01 → T-INP-02, 03, 04 → T-INP-05
Step 8   T-INP-06 → T-INP-07, 08 → T-INP-09 → T-INP-10, 11 → T-INP-12
Step 8b  T-INP-13 → T-INP-14
```

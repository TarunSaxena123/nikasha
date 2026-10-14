# Feature 06 — Suggestions: Tasks

Status: **Approved under delegation 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) via [`design.md`](design.md)

Rules: [CONTRACT] first, then [BE] and [FE]. **Build step 10** (`product.md` §15; P2 — cut before builder advanced options). **Done** = code, passing tests, `traceability.md` updated. Depends on features 01 (validation, evaluate), 02 (report, overfit split), 05 (template fixture), 07 (wording scans).

| ID | Task | Req. | Tests that prove it |
|---|---|---|---|
| T-SUG-01 | [CONTRACT] Plan fixtures `specs/contracts/fixtures/suggestions/` (a normal plan, a not-offered plan) validating against the changed `SuggestionPlanResponse` | 02, 03 | Contract test |
| T-SUG-02 | [BE] `suggestions/planner.py`: gate, sweeps with `round5`, reasons from base trades | 02, 03, 04 | AC-SUG-02, AC-SUG-03 (pytest) |
| T-SUG-03 | [BE] Filters: VIX-band exclusion rules (lowest/middle/highest), fixed-time conversion, side-only | 05 | AC-SUG-04 (pytest) |
| T-SUG-04 | [BE] Alternative, validity filter (schema + SEM), cap and order, not-offered text; `POST /v1/suggestions/plan` wiring | 03, 06 | AC-SUG-05 (pytest); response validates against the contract |
| T-SUG-05 | [FE] Panel shell, Show ideas, plan call, not-offered state, short disclaimer | 01, 02, 10 | AC-SUG-01, AC-SUG-02 (component) |
| T-SUG-06 | [FE] Orchestration: queue, concurrency 4, progress, abort on leave, per-card failure + Retry | 07, 12 | AC-SUG-06, AC-SUG-11 (Playwright, mocked engine) |
| T-SUG-07 | [FE] Cards: whole/unseen comparison, overfit status with icon+label, fixed group order, Try this version | 08, 10, 11 | AC-SUG-07, AC-SUG-09, AC-SUG-10 |
| T-SUG-08 | [FE] Tuning check per sweep group (`copy/suggestions.ts` templates) | 09 | AC-SUG-08 (component with fixtures) |

## Order of work (step 10)

```
T-SUG-01 → T-SUG-02 → T-SUG-03 → T-SUG-04
T-SUG-05 → T-SUG-06 → T-SUG-07 → T-SUG-08      (web side can start on T-SUG-01 fixtures)
```

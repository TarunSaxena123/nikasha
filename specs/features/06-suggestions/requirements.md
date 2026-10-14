# Feature 06 — Suggestions: Requirements

Status: **Approved under delegation 2026-10-14** (owner delegated approval of the remaining specs; decisions in §6 may be revisited) · Created 2026-10-14 · Prefix: **REQ-SUG** · Layers: **frontend and backend (planner)** · Priority: **P2** (cut before builder advanced options; the overfitting flag itself is feature 02, P1)

Implements [`product.md`](../../product.md) §4 (improvement suggestions) and §7.7 (tuning only on the in-sample period), within [`backend.md`](../../backend.md) §2 (`suggestions/planner.py`) and [`architecture.md`](../../architecture.md) §3.3 (one engine call per variant, concurrency 4). Obeys [`constitution.md`](../../constitution.md) §6 and **§8 (educational, not advisory)** and feature 07 REQ-PRV-31–33.

---

## 1. User stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-SUG-1 | trader | ideas for changes worth testing, each with the reason it was suggested | I learn where my strategy is weak |
| US-SUG-2 | trader | each idea run on the same data and shown beside my original | I can compare like with like |
| US-SUG-3 | trader | to see whether an improvement held up on years it wasn't tuned on | I'm not fooled by overfitting |
| US-SUG-4 | trader | to try an idea myself if I want to | I stay in control; nothing is applied for me |

## 2. Requirements

| ID | Requirement |
|---|---|
| REQ-SUG-01 | THE report page SHALL offer an **Ideas to test** section with a **Show ideas** button; suggestions SHALL be planned and run only when the user clicks it (D1). |
| REQ-SUG-02 | IF the base report has fewer than 30 trades, THEN THE planner SHALL return no variants and a `not_offered_text` explaining that too few trades make comparisons unreliable (D6). |
| REQ-SUG-03 | THE planner SHALL return up to 12 variants, each an edited copy of the strategy that differs in **one** change, valid against the schema and SEM rules, with a plain-English `change_text` and `reason_text`. |
| REQ-SUG-04 | THE planner SHALL produce **parameter sweeps** for the stop-loss and target when they are in % of premium or points: four values each around the current value (D2). |
| REQ-SUG-05 | THE planner SHALL produce **filters** from the base report: excluding a VIX band whose trades lost money on average (≥ 10 trades), as an extra entry condition on India VIX; and, for option type Both, "Calls only" or "Puts only" when one side lost money on average (≥ 10 trades) (D3). |
| REQ-SUG-06 | THE planner SHALL produce at most one **alternative**: the Simple Trend Follower template with the user's lots and lot size, only if the strategy isn't already that template (D4). |
| REQ-SUG-07 | WHEN variants are planned, THE web app SHALL evaluate each with `POST /v1/evaluate` using the **same settings and period** as the base report, at most 4 at a time, showing progress ("3 of 9 done"), and SHALL cancel the remaining runs if the user leaves the report. |
| REQ-SUG-08 | THE web app SHALL show each variant as a card: change, reason, and a comparison with the original for net P&L, win rate, max drawdown, expectancy and trades — for the whole period **and** for the unseen period — plus the variant's overfitting status. |
| REQ-SUG-09 | FOR each sweep group, WHERE the period spans both the tuning and unseen periods, THE web app SHALL show a **tuning check**: the value that would have looked best on the tuning period alone (highest in-sample expectancy), and how that choice did on the unseen period compared with the original value. |
| REQ-SUG-10 | THE suggestions SHALL NOT be ranked or labelled as "best", "recommended" or "to trade"; cards appear in the fixed order sweeps → filters → alternative; all text is past-simulated ("this change would have…") and passes the banned-phrase check; the panel carries the short disclaimer. |
| REQ-SUG-11 | Each card SHALL offer **Try this version**, which loads the variant into the review screen without evaluating it; the original report stays unchanged. |
| REQ-SUG-12 | IF a variant's evaluation fails, THEN THE card SHALL show "Couldn't run this one" with Retry, without affecting the other cards. |

## 3. Acceptance criteria

| AC | Req. | Given / When / Then |
|---|---|---|
| AC-SUG-01 | 01 | **Given** a report, **then** no suggestion request is sent until Show ideas is clicked. |
| AC-SUG-02 | 02 | **Given** a base report with 20 trades, **then** the plan has no variants and the panel shows the not-offered text. |
| AC-SUG-03 | 03, 04 | **Given** the Simple Trend Follower (SL 30%, target 50%), **then** the plan has SL variants 20, 25, 35, 40 and target variants 35, 40, 60, 65 (D2 rounding), each differing only in that value and valid. |
| AC-SUG-04 | 05 | **Given** a base report where VIX < 12 trades (≥ 10) lost on average, **then** a filter variant adds "India VIX is at or above 12" to every entry condition set, with a reason quoting that band's average and count; **given** CE trades (≥ 10) lost on average and PE didn't, **then** a "Puts only" variant appears. |
| AC-SUG-05 | 06 | **Given** a strategy that is not the Simple Trend Follower, **then** one alternative appears with the user's lots and lot size; **given** the template itself, **then** none. |
| AC-SUG-06 | 07 | **Given** 9 variants and a slow mocked engine, **then** at most 4 requests are in flight, progress counts up, and leaving the report aborts the rest. |
| AC-SUG-07 | 08 | **Given** finished variants, **then** each card shows whole-period and unseen-period comparisons and its overfitting status. |
| AC-SUG-08 | 09 | **Given** SL variants where 20% has the highest in-sample expectancy but loses on the unseen period, **then** the tuning check says that tuning on 2019–2023 would have picked 20%, and on 2024–2026 it would have done worse than the original 30%. |
| AC-SUG-09 | 10 | **Given** the panel, **then** cards appear in fixed group order, no card is marked best/recommended, and all texts pass the banned-phrase scan; the short disclaimer is visible. |
| AC-SUG-10 | 11 | **Given** a card, **when** Try this version is clicked, **then** the review screen opens with the variant and nothing is evaluated; the original report is unchanged on return. |
| AC-SUG-11 | 12 | **Given** one variant returning 500, **then** that card shows Retry and the others complete normally. |

## 4. Edge cases

| Case | Expected | Req. |
|---|---|---|
| Stop-loss is trigger-candle and target is R:R | No sweeps; filters/alternative may still apply | 04 |
| A sweep value would break a rule (e.g. SL 40% with an SL cap making it moot) | Value still offered if valid; if invalid (SEM), skipped | 03 |
| Period doesn't span the split | Tuning check hidden, with "Choose a longer period to see the tuning check" | 09 |
| Engine busy | Same backoff per request; the panel keeps progress | 07 |
| All filters and sweeps impossible and the strategy is the template | `not_offered_text`: "No ideas apply to this strategy's settings." | 02, 03 |

## 5. Out of scope
Sweeping indicator parameters or entry conditions; combining several changes in one variant; automatic optimisation; saving variants.

## 6. Clarify gate — decisions (taken under the owner's delegation, 2026-10-14; may be revisited)

| # | Question | Decision |
|---|---|---|
| D1 | Automatic or on demand? | On demand (Show ideas), to save engine calls and keep the report focused. |
| D2 | Which sweeps? | Stop-loss and target only, four values each: current × {0.67, 0.83, 1.17, 1.33} rounded to the nearest 5 (% or points), deduplicated, excluding the current value and anything ≤ 0. |
| D3 | Which filters? | VIX-band exclusion (as an entry condition on India VIX) and Calls/Puts only. Trend/sideways filters are not offered, because daily ADX can't be expressed as a rule in the strategy format. |
| D4 | Which alternative? | The Simple Trend Follower template (user's lots and lot size), only if the strategy isn't already it. |
| D5 | Ranking? | None. Fixed group order; the tuning check explains overfitting instead of crowning a winner (constitution §8). |
| D6 | Minimum trades | 30 in the base report. |

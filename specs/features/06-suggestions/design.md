# Feature 06 — Suggestions: Design

Status: **Approved under delegation 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) (REQ-SUG-01…12) · Follows [`architecture.md`](../../architecture.md) §3.3, [`backend.md`](../../backend.md) §2, features 01 (SEM validation), 02 (report, overfit split), 05 (Simple Trend Follower template), 07 (wording rules)

---

## 1. Frontend

### 1.1 Panel (report page slot, after the what-if panel)

```
┌ Ideas to test ───────────────────────────────────────────────────────────────┐
│ "Each idea changes one thing and re-runs the same period. These are past     │
│  simulated results, not recommendations."                    [ Show ideas ] │
│ ── after click ──                                                            │
│ Running 3 of 9…  (progress bar)                                              │
│                                                                              │
│ STOP-LOSS (% of premium)                                                     │
│  Tuning check: "If you had tuned the stop-loss on 2019–2023, you'd have      │
│  picked 20%. On 2024 – 14 May 2026 that choice would have made −₹4,100,      │
│  compared with +₹6,250 for your 30%."                                        │
│  ┌ Stop-loss 20% instead of 30% ───────────────────────────────────────────┐ │
│  │ Why: "Most losing trades hit the stop within 3 candles (61 of 98)."      │ │
│  │            Whole period          Unseen period (2024–)                   │ │
│  │            Yours   This idea     Yours   This idea                       │ │
│  │ Net P&L    …       …             …       …                               │ │
│  │ Win rate / Max drawdown / Expectancy / Trades                            │ │
│  │ Overfitting check: Held up on unseen data ✓                              │ │
│  │ [ Try this version ]                                                     │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│  … more stop-loss cards …                                                    │
│ TARGET … · FILTERS … · ANOTHER APPROACH …                                     │
│ Short disclaimer                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Group order is fixed: sweeps (stop-loss, then target) → filters → alternative (REQ-SUG-10). Within a sweep, cards are in ascending value order.
- No badge, sort or highlight implies "best". The tuning check is the only cross-card comparison, and it is framed as an overfitting lesson (REQ-SUG-09).

### 1.2 Orchestration (REQ-SUG-01, 07, 12)

```
click Show ideas → POST /v1/suggestions/plan {strategy, settings, base: {metrics, by_vol_band, by_regime, by_side}}
  → not_offered_text? show it, stop
  → queue variants; run with concurrency 4 via the API client (backoff on 429/503)
  → each result stored in suggestions slice {id → status | report}
leave /report or new base evaluation → abort all in flight, clear slice
```

### 1.3 Card computations (web, from the variant and base reports)
- **Whole period:** `report.metrics` for both.
- **Unseen period:** `report.overfit.out_of_sample.metrics` when present; otherwise "—" with "Period doesn't include the unseen years".
- **Overfitting status:** `report.overfit.status_text`, with a status icon and label (never colour only).
- **Tuning check** (per sweep group; only if every report in the group has both in-sample and out-of-sample parts):
  1. `pick` = the variant or original with the highest in-sample expectancy (ties → closer to the original value).
  2. If `pick` is the original: "Tuning on {is_label} would have kept your {value}."
  3. Otherwise: "If you had tuned the {field} on {is_label}, you'd have picked {pick_value}. On {oos_label} that choice would have made {pick_oos_net}, compared with {orig_oos_net} for your {orig_value}."

  Fixed templates in `web/src/copy/suggestions.ts`, scanned for banned phrases.
- **Try this version:** load the variant strategy into the draft (confirmations kept; settings unchanged) and go to `/review`; nothing is evaluated (REQ-SUG-11).

## 2. Backend (`suggestions/planner.py`)

`plan(strategy, settings, base, instrument) → {variants, not_offered_text}`. Pure, deterministic, no backtests (≤ 2 s, `backend.md` §8).

### 2.1 Gate
If `base.metrics.trades < 30` → `not_offered_text` = "Ideas need at least 30 trades to compare fairly; this strategy had {n} in the period." with no variants (REQ-SUG-02).

### 2.2 Sweeps (REQ-SUG-04, D2)
For each of `exit.stop_loss` and `exit.target` whose type is `PCT_PREMIUM` or `POINTS`:

```
values = { round5(v × f) for f in (0.67, 0.83, 1.17, 1.33) } − {v} − {x ≤ 0}
```

where `round5` rounds to the nearest 5, halves up. One variant per value: `change_text` "Stop-loss 25% instead of 30%"; `group` "Stop-loss (% of premium)".

`reason_text` comes from base trades: for SL, "Of {n_sl} stop-loss exits, {k} happened within {m} candles of entry." (or a neutral "Checks how sensitive the result is to the stop-loss.") — always facts about past simulated trades.

### 2.3 Filters (REQ-SUG-05, D3)
- **VIX band exclusion:** for each `base.by_vol_band` row with `trades ≥ 10` and `expectancy < 0`, add to every entry condition set an India VIX rule excluding that band:
  - lowest band (< e₁): `vix close ≥ e₁`
  - highest (≥ eₖ): `vix close < eₖ`
  - middle [eᵢ, eᵢ₊₁): `any(vix < eᵢ, vix ≥ eᵢ₊₁)`

  Each set is wrapped as `all([existing, rule])`. A fixed-time-only entry becomes "fixed time if conditions are met", using `ce`/`pe` per leg side or `all_legs` for multi-leg.
  - `change_text`: "Skip trades when India VIX is below 12".
  - `reason_text`: "Trades taken when India VIX was below 12 lost {exp} on average ({n} trades)."
- **Side only:** for option type Both, if one side's row has `trades ≥ 10` and `expectancy < 0` and the other's ≥ 0: a variant with the leg's `option_type` set to the profitable side and the other side's condition set removed. Example `change_text`: "Puts only (skip calls)".
- At most 3 filter variants, ordered by band order then side.

### 2.4 Alternative (REQ-SUG-06, D4)
If `strategy.template_id != "simple-trend-follower"`: the Simple Trend Follower template (shared fixture) with `position` set to the user's lots and lot size. `change_text` "A simple trend-following approach (template)"; `reason_text` "A common starting point, shown for comparison on the same period."

### 2.5 Validity and limits
- Every variant is validated with the schema and SEM rules (feature 01 `validation/semantic.py`); invalid ones are dropped.
- Cap: 12 in order sweeps (SL then target) → filters → alternative.
- If none remain: `not_offered_text` = "No ideas apply to this strategy's settings."
- All `change_text`/`reason_text` templates are past-simulated and banned-phrase scanned (feature 07 T-PRV-11).

## 3. Contract

- `POST /v1/suggestions/plan` → `SuggestionPlanResponse`, **changed**: variants now require `reason_text`, and the response requires `not_offered_text` (string or null). Recorded in `CHANGELOG.md`.
- Each variant is then evaluated with the unchanged `POST /v1/evaluate`.

## 4. Error handling

| Situation | Behaviour | Req. |
|---|---|---|
| Plan call fails | Panel: "Couldn't prepare ideas. Try again." | 01 |
| One variant fails | That card: "Couldn't run this one" + Retry | 12 |
| Busy | Backoff per request; progress continues | 07 |
| User leaves the report | All in-flight requests aborted; slice cleared | 07 |

## 5. Testing strategy

| Area | Tests | ACs |
|---|---|---|
| Gate | pytest: 20 trades → not offered | AC-SUG-02 |
| Sweeps | pytest: SL 30 → 20/25/35/40; target 50 → 35/40/60/65; points variants; validity | AC-SUG-03 |
| Filters | pytest with base fixtures: lowest/middle/highest band rules; fixed-time conversion; side-only | AC-SUG-04 |
| Alternative | pytest: present/absent; lots copied | AC-SUG-05 |
| Orchestration | Playwright with mocked engine: on-demand, concurrency ≤ 4, progress, abort on leave, failure isolation | AC-SUG-01, 06, 11 |
| Cards and tuning check | Component with report fixtures incl. the AC-SUG-08 scenario; unseen-period missing case | AC-SUG-07, 08 |
| Wording | Banned-phrase scan of planner and web templates; no "best"/rank UI | AC-SUG-09 |
| Try this version | Playwright | AC-SUG-10 |

## 6. Consistency check

Checked against `constitution.md` (§6, §8), `product.md` §4 and §7.7, `architecture.md` §3.3, `backend.md` §2 and §8, `api.openapi.yaml`, and features 01, 02, 05, 07. Findings:
- **Contract change:** `reason_text` and `not_offered_text` (see §3).
- "Tunes only on the in-sample period" (`product.md` §7.7) is realised as the tuning check. Nikasha never applies a tuned value; it shows what tuning would have picked and how that fared on unseen data.
- No ranking or recommendation wording (constitution §8; feature 07 REQ-PRV-31–33).
- Trend/sideways filters are excluded because they can't be expressed in the strategy format (D3). The report's regime breakdown still shows that information.

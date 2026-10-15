# Release checklist

Run before every public release (feature 07 T-PRV-24). Tick each item; anything that differs from the specs goes through the change process in `CLAUDE.md`.

## Legal and privacy
- [ ] Re-check Anthropic's API data-retention article (privacy.claude.com, article 7996866) against the privacy sentence in `specs/product.md` §11.1 and `web/src/legal/disclaimer.ts`. If it changed, update both (the disclaimer version hash changes and users accept again).
- [ ] On the deployed stack, run one upload and one evaluation containing the marker `NIKASHA-PRIVACY-MARKER-7f3a`, then search both CloudWatch log groups for it (CloudWatch → Log groups → `/aws/lambda/nikasha-*-prod` → Search all). Zero hits required. Both groups must show retention "1 day".
- [ ] `scripts/privacy-marker-test.sh` passes locally.
- [ ] `node scripts/check-names.mjs` passes, with the owner's private list of product names hashed into `specs/contracts/excluded-names.sha256`.
- [ ] A lawyer familiar with Indian securities law has reviewed the disclaimer before any public or commercial launch (`specs/product.md` §11.4).

## Costs and accounts
- [ ] Anthropic monthly spend limit is set in the Anthropic console.
- [ ] AWS budget alert exists (`MonthlyBudget` in `infra/template.yaml`) and its email is confirmed.

## Data and rules (`specs/product.md` §17)
- [ ] Re-confirm the NSE exchange transaction charge (0.03553%) against circular NSE/FA/73061; update `instruments/nifty50.json` (`default_costs`, `verified_on`) through the change process if it differs.
- [ ] Re-confirm the 1 Sep 2025 Tuesday-expiry change against the NSE circular; update `instruments/nifty50.json` and `specs/features/01-data-and-engine/expiry-calendar-check.md` if it differs.
- [ ] Review the readings in `specs/PENDING-REVIEW.md` (approve or reverse each).

## Content
- [ ] Owner has reviewed the six Learn articles (`web/src/content/learn/*.md`) and the intro copy.
- [ ] Record the live extraction once: put the key in `extractor/.env`, run `extractor/.venv/bin/python extractor/scripts/record_extraction.py`, then `pytest` and `scripts/make_fixtures.py` in `extractor/`; review any difference against feature 04 design §2.5 before committing.

## Deployment smoke test (`specs/architecture.md` §9)
- [ ] `GET /v1/meta` on the production engine URL returns the data range read from the data (9 Jan 2015 – 14 May 2026 for the current data).
- [ ] A template evaluation succeeds through the production site.
- [ ] One timed cold start and one timed 15-minute full-period evaluation on Lambda (budgets in `specs/backend.md` §8); record the numbers here.

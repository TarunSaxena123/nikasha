# Release checklist

Run before every public release (feature 07 T-PRV-24). Tick each item; anything that differs from the specs goes through the change process in `CLAUDE.md`.

## Legal and privacy
- [ ] Re-check Anthropic's API data-retention article (privacy.claude.com, article 7996866) against the privacy sentence in `specs/product.md` §11.1 and `web/src/legal/disclaimer.ts`. If it changed, update both (the disclaimer version hash changes and users accept again).
- [x] On the deployed stack, run one upload and one evaluation containing the marker `NIKASHA-PRIVACY-MARKER-7f3a`, then search both CloudWatch log groups for it (CloudWatch → Log groups → `/aws/lambda/nikasha-*-prod` → Search all). Zero hits required. Both groups must show retention "1 day". **Done 2026-10-15 (first release): live upload and evaluation, then a search of both log groups for strategy words found 0 matches; log lines hold only metadata.**
- [x] `scripts/privacy-marker-test.sh` passes locally. **2026-10-15.**
- [ ] `node scripts/check-names.mjs` passes, with the owner's private list of product names hashed into `specs/contracts/excluded-names.sha256`.
- [ ] A lawyer familiar with Indian securities law has reviewed the disclaimer before any public or commercial launch (`specs/product.md` §11.4).

## Costs and accounts
- [x] Anthropic monthly spend limit is set in the Anthropic console. **Set by the owner, 2026-10-15.**
- [x] AWS budget alert exists (`MonthlyBudget` in `infra/template.yaml`) and its email is confirmed. **nikasha-prod-monthly, $1, alerts on the first cent and on a forecast overrun (2026-10-15).**

## Data and rules (`specs/product.md` §17)
- [ ] Re-confirm the NSE exchange transaction charge (0.03553%) against circular NSE/FA/73061; update `instruments/nifty50.json` (`default_costs`, `verified_on`) through the change process if it differs.
- [ ] Re-confirm the 1 Sep 2025 Tuesday-expiry change against the NSE circular; update `instruments/nifty50.json` and `specs/features/01-data-and-engine/expiry-calendar-check.md` if it differs.
- [x] Review the readings in `specs/PENDING-REVIEW.md` (approve or reverse each). **Closed 2026-10-15.**

## Content
- [ ] Owner has reviewed the six Learn articles (`web/src/content/learn/*.md`) and the intro copy.
- [x] Run the UAT against the real local stack (`web/e2e/uat.spec.ts`, see CLAUDE.md): all journeys pass. **2026-10-15: all journeys pass; also against the live site (U1, U2, U5, and one AI upload U3; `web/playwright.live.config.ts`).**
- [x] Record the live extraction once (done 2026-10-15, prompt `upl-3`): put the key in `extractor/.env`, run `extractor/.venv/bin/python extractor/scripts/record_extraction.py`, then `pytest` and `scripts/make_fixtures.py` in `extractor/`; review any difference against feature 04 design §2.5 before committing. After any change to `extractor/nikasha_extractor/wire.py`, first run `extractor/scripts/check_schema_compiles.py`.

## Deployment smoke test (`specs/architecture.md` §9)
- [x] `GET /v1/meta` on the production engine URL returns the data range read from the data (9 Jan 2015 – 14 May 2026 for the current data). **2026-10-15: 9 Jan 2015 – 14 May 2026.**
- [x] A template evaluation succeeds through the production site. **2026-10-15 (UAT U1 on nikasha.vercel.app).**
- [x] One timed cold start and one timed 15-minute full-period evaluation on Lambda (budgets in `specs/backend.md` §8); record the numbers here. **2026-10-15, ap-southeast-2, 2,048 MB: cold start 8.9 s round trip from India (about 8 s in Lambda); full-period 15-min evaluation 15.5 s.**

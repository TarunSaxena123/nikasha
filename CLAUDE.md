# CLAUDE.md — Nikasha

Nikasha is an educational backtesting web app for Nifty 50 options ("The touchstone for your trading strategy"). **`specs/` is the single source of truth.** `NIKASHA_BRIEF.md` is historical input only.

## Read first

| File | What it holds |
|---|---|
| [`specs/constitution.md`](specs/constitution.md) | Non-negotiable principles. If anything conflicts with it, it wins |
| [`specs/product.md`](specs/product.md) | Complete product requirements, simulation rules, legal text, delivery plan |
| [`specs/architecture.md`](specs/architecture.md) | System overview, data flows, deployment, cost rules (no hosting spend before UAT) |
| [`specs/frontend.md`](specs/frontend.md) | Cross-cutting web rules: screens, state, design system, accessibility, copy tone |
| [`specs/backend.md`](specs/backend.md) | Engine and extraction function: modules, shared simulation rules, errors, logging, budgets |
| [`specs/contracts/`](specs/contracts/) | `api.openapi.yaml`, `strategy.schema.json`, `instrument.schema.json`, `strategy-rules.md`, shared fixtures — FE and BE are built against these only |
| `specs/features/NN-*/` | Per feature: `requirements.md` (EARS, IDs) → `design.md` → `tasks.md` |
| [`specs/traceability.md`](specs/traceability.md) | Requirement → design → task → test, with status |
| [`specs/CHANGELOG.md`](specs/CHANGELOG.md) | Every spec change, newest first |

## Rules that catch people out

- **Never guess.** Missing or vague inputs are asked, never defaulted. Advanced options are OFF unless the user sets them.
- **Users never see JSON, code, schemas, ids or stack traces.**
- **Zero storage:** no database, no server files, no logging of user content. Only the disclaimer flag lives in the browser's `localStorage`.
- **Never fill missing market data.** Premiums are modelled, and this is always disclosed.
- **Educational, not advisory:** no signals, no "best", no recommendations. Use "this change would have…".
- **Never name competing products** anywhere.
- **No instrument-specific logic in engine code.** Everything comes from `instruments/*.json`.
- **Automated tests never call paid services** (the AI provider is replayed from recordings).

## Change process

1. The owner describes the change.
2. Classify it:
   - **Behaviour change** (what the user sees or what the system does) → step 3.
   - **Bug fix** (code doesn't match an existing requirement) → fix the code and add a test for that requirement; no spec change.
   - **Refactor, typo or styling** with no behaviour change → no spec change.
3. **Before changing code, decide whether the change alters behaviour. If it does, propose the spec update first and wait for approval.** The proposal lists the affected requirement IDs, the new or changed EARS statements and acceptance criteria, and the design/contract impact.
4. Update `specs/CHANGELOG.md`, then design, contracts, tasks and `specs/traceability.md` as needed; run the consistency check.
5. Update or add tests, then change the code.
6. Confirm every changed requirement has a passing test.

Requirement IDs are stable: a changed requirement keeps its ID, and a removed ID is never reused.

## Working with the owner

- Discuss plans and options first, and wait for a go-ahead before editing.
- All specs are approved; development follows the build order in `specs/product.md` §15 and each feature's `tasks.md`.

## Running tests locally

All parts are scaffolded; CI (`.github/workflows/ci.yml`) runs the same checks. Update this section when they change.

| Part | Command (from repo root) |
|---|---|
| Engine unit/integration tests | `cd engine && pytest` |
| Engine lint and types | `cd engine && ruff check . && mypy nikasha_engine` |
| Extraction function tests | `cd extractor && pytest` |
| Shared Python logging helper | `cd pylib/nikasha_log && pytest` |
| Web unit and component tests | `cd web && npm test` |
| Web end-to-end tests (services mocked from the shared fixtures; serves the production build) | `cd web && npm run build && npx playwright test` |
| Web end-to-end against the real local engine (engine running on :8000) | `cd web && NIKASHA_STACK=1 npx playwright test -g @stack` |
| Web lint, types, generated-code drift | `cd web && npx eslint . && npx tsc --noEmit && npm run codegen:check` |
| SAM template checks | `engine/.venv/bin/python -m pytest -p no:cacheprovider infra/test_template.py` |
| Contract checks (schemas, OpenAPI, fixtures, generated-code drift) | `scripts/check-contracts.sh` |
| Repo checks (README disclaimer sync, product-name scan) | `node scripts/sync-readme-disclaimer.mjs --check && node scripts/check-names.mjs` |
| Privacy marker test (local stack) | `scripts/privacy-marker-test.sh` |

Engine setup (once): `cd engine && python3.12 -m venv .venv && .venv/bin/pip install -e ../pylib/nikasha_log -e ".[dev]" && .venv/bin/python scripts/csv_to_parquet.py` (builds the Parquet files into `engine/build/data/`). Engine tests run with `cd engine && .venv/bin/python -m pytest`; benchmarks with `-m perf tests/perf`. Generated models: `cd engine && .venv/bin/python scripts/codegen.py`.

Extractor setup (once): `cd extractor && python3.12 -m venv .venv && .venv/bin/pip install -e ../pylib/nikasha_log -e ".[dev]"`; tests replay `extractor/tests/recordings/` and never call the AI provider. Web setup (once): `cd web && npm ci && npx playwright install chromium`; generated types and validators: `npm run codegen`.

Local run: engine `cd engine && python -m nikasha_engine.adapters.http_app` (port 8000), extractor `cd extractor && python -m nikasha_extractor.adapters.http_app` (port 8001, needs `ANTHROPIC_API_KEY` in `extractor/.env` for live uploads only; `NIKASHA_EXTRACT_REPLAY=tests/recordings` replays the recordings instead), web `cd web && npm run dev` (port 3000).

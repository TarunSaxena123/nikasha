#!/usr/bin/env bash
# Contract checks (T-DAT-11, architecture.md §9): both JSON Schemas valid and their examples pass;
# the OpenAPI document validates; every shared fixture validates (or fails for its named rule) in the
# engine and, once scaffolded, in the web app; generated Python and TypeScript code is current.
# Run from the repo root: scripts/check-contracts.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${PYTHON:-$ROOT/engine/.venv/bin/python}"
[ -x "$PY" ] || PY=python3

echo "== Engine: schemas, OpenAPI, shared strategy fixtures, generated models"
(cd "$ROOT/engine" && "$PY" scripts/codegen.py --check && "$PY" -m pytest -q -p no:cacheprovider tests/test_contracts.py tests/test_report.py -k "fixture or contract or schema or openapi or vwap or sem_rule")

if [ -f "$ROOT/web/package.json" ]; then
  echo "== Web: shared fixtures and generated types"
  (cd "$ROOT/web" && npm run --silent codegen:check && npx vitest run --reporter=dot src/contracts)
fi

if [ -f "$ROOT/extractor/pyproject.toml" ]; then
  echo "== Extractor: extraction schema and fixtures"
  EXPY="$ROOT/extractor/.venv/bin/python"; [ -x "$EXPY" ] || EXPY="$PY"
  (cd "$ROOT/extractor" && "$EXPY" -m pytest -q -p no:cacheprovider tests/test_contract.py)
fi
echo "contract checks passed"

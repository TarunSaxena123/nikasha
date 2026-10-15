#!/usr/bin/env bash
# Builds the extraction function's zip contents into infra/build/extractor (used by template.yaml CodeUri).
# Run from the repo root: infra/build-extractor.sh   (needs Python 3.12 and pip)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/infra/build/extractor"
rm -rf "$OUT" && mkdir -p "$OUT/contracts"
python3 -m pip install -q --target "$OUT" --platform manylinux2014_x86_64 --only-binary=:all: --python-version 3.12 \
  "anthropic>=1.14" "pydantic>=2.7" "pypdf>=5" "python-docx>=1.1" "lxml"
cp -R "$ROOT/pylib/nikasha_log/nikasha_log" "$OUT/"
cp -R "$ROOT/extractor/nikasha_extractor" "$OUT/"
cp "$ROOT/specs/contracts/banned-phrases.txt" "$OUT/contracts/"
find "$OUT" -name "__pycache__" -prune -exec rm -rf {} +
echo "extractor package in $OUT ($(du -sh "$OUT" | cut -f1))"

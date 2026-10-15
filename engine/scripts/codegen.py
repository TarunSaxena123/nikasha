"""Generate pydantic models from the JSON Schemas in specs/contracts (backend.md §1).

Run: python scripts/codegen.py          (writes nikasha_engine/generated/*.py)
     python scripts/codegen.py --check  (exit 1 if the generated files are out of date)
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = ROOT / "specs" / "contracts"
OUT = ROOT / "engine" / "nikasha_engine" / "generated"
SCHEMAS = {"strategy.py": "strategy.schema.json", "instrument.py": "instrument.schema.json"}
HEADER = "# Generated from specs/contracts by engine/scripts/codegen.py. Do not edit by hand.\n"


def generate(schema: Path) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        target = Path(tmp) / "out.py"
        subprocess.run(
            [
                sys.executable,
                "-m",
                "datamodel_code_generator",
                "--input",
                str(schema),
                "--input-file-type",
                "jsonschema",
                "--output-model-type",
                "pydantic_v2.BaseModel",
                "--output",
                str(target),
                "--target-python-version",
                "3.12",
                "--use-annotated",
                "--disable-timestamp",
                "--formatters",
                "ruff-format",
                "--use-standard-collections",
                "--use-union-operator",
                "--enum-field-as-literal",
                "all",
            ],
            check=True,
            capture_output=True,
        )
        body = target.read_text()
    # The tool writes the input path in its header; keep output machine-independent.
    lines = [ln for ln in body.splitlines() if not ln.startswith("#   filename:")]
    return HEADER + "\n".join(lines).rstrip() + "\n"


def main() -> int:
    check = "--check" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    stale = []
    for out_name, schema_name in SCHEMAS.items():
        code = generate(CONTRACTS / schema_name)
        path = OUT / out_name
        if check:
            if not path.exists() or path.read_text() != code:
                stale.append(out_name)
        else:
            path.write_text(code)
    init = OUT / "__init__.py"
    if not check:
        init.write_text(HEADER)
    if stale:
        print("Generated models are out of date: " + ", ".join(stale) + ". Run engine/scripts/codegen.py.")
        return 1
    print("generated models " + ("current" if check else "written"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""MANUAL, LIVE: records the model's real output for both samples (T-UPL-08). Costs a few cents.

Needs ANTHROPIC_API_KEY in extractor/.env (never committed). Run from extractor/:
    .venv/bin/python scripts/record_extraction.py
It overwrites tests/recordings/{advanced-sample,one-line-sample}.<PROMPT_VERSION>.json, keeping each
file's "match" phrase. Afterwards run `pytest` and `python scripts/make_fixtures.py`: the oracle tests
compare the live output with feature 04 design §2.5; any difference is reviewed before committing.
Automated tests never run this script.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REC = ROOT / "extractor" / "tests" / "recordings"


def main() -> int:
    env = ROOT / "extractor" / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY is not set (put it in extractor/.env). Nothing was sent.")
        return 1
    from nikasha_extractor.llm import extract_with_llm
    from nikasha_extractor.prompt import PROMPT_VERSION
    from nikasha_extractor.reading import read_upload

    for name, src in (
        ("advanced-sample", ROOT / "samples" / "nifty_weekly_options_strategy.pdf"),
        ("one-line-sample", ROOT / "samples" / "one_line_strategy.txt"),
    ):
        text = read_upload(src.read_bytes())
        draft = extract_with_llm(text)
        path = REC / f"{name}.{PROMPT_VERSION}.json"
        match = json.loads(path.read_text())["match"] if path.exists() else ""
        path.write_text(
            json.dumps({"match": match, "recorded": "live", "output": draft.model_dump()}, indent=1, ensure_ascii=False)
            + "\n"
        )
        print(f"recorded {path.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

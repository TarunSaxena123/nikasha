"""Writes specs/contracts/fixtures/extraction/*.json (T-UPL-01): ExtractionResult for both samples,
a no-rules case and a VWAP case, produced by convert.py from the recordings. `--check` fails on drift.
Run from extractor/: python scripts/make_fixtures.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "specs" / "contracts" / "fixtures" / "extraction"
REC = ROOT / "extractor" / "tests" / "recordings"
INPUTS = {
    "advanced-sample": ("file", ROOT / "samples" / "nifty_weekly_options_strategy.pdf"),
    "one-line-sample": ("text", (ROOT / "samples" / "one_line_strategy.txt")),
    "orb-cpr-sample": ("text", (ROOT / "samples" / "nifty_15min_orb_cpr_strategy.txt")),
    "vwap": ("text", "Buy ATM call when price crosses above VWAP on the 5-minute chart, stop-loss 20 points."),
    "no-rules": ("text", "hello"),
}


def main() -> int:
    sys.path.insert(0, str(ROOT / "extractor" / "tests"))
    from helpers import multipart
    from nikasha_extractor.core import api
    from nikasha_extractor.replay import ReplayClient

    api.set_client(ReplayClient(REC))
    OUT.mkdir(parents=True, exist_ok=True)
    stale = []
    for name, (kind, src) in INPUTS.items():
        if kind == "file":
            body, ct = multipart(Path(src).read_bytes())
        else:
            text = Path(src).read_text() if isinstance(src, Path) else src
            body, ct = json.dumps({"text": text}).encode(), "application/json"
        status, result = api.dispatch("POST", "/v1/extract", body, ct)
        assert status == 200, name
        content = json.dumps(result, indent=1, ensure_ascii=False) + "\n"
        path = OUT / f"{name}.json"
        if "--check" in sys.argv:
            if not path.exists() or path.read_text() != content:
                stale.append(name)
        else:
            path.write_text(content)
    if stale:
        print("Extraction fixtures out of date: " + ", ".join(stale))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

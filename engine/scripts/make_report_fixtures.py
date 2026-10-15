"""Generate the shared report fixtures (T-RPT-02) and the engine's golden reports (T-RPT-10).

Run from engine/: python scripts/make_report_fixtures.py   (needs the real Parquet data)
The fixtures are engine output with `generated_at` and `engine_version` fixed, so they only change
when the engine's behaviour changes. The web app renders them in its tests.
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "specs" / "contracts" / "fixtures" / "reports"
STRATS = ROOT / "specs" / "contracts" / "fixtures" / "strategies" / "valid"
FIXED = {"generated_at": "2026-10-15T12:00", "engine_version": "fixture"}


def _costs() -> dict[str, float]:
    profile = json.loads((ROOT / "instruments" / "nifty50.json").read_text())
    return {k: v["value"] for k, v in profile["default_costs"]["items"].items()}


def cases() -> dict[str, dict[str, Any]]:
    stf = json.loads((STRATS / "simple-trend-follower.json").read_text())
    never = copy.deepcopy(stf)
    never["name"] = "Never triggers"
    never["indicators"] = {"rsi14": {"type": "RSI", "period": 14}}
    never["entry"] = {
        "ce": {"type": "compare", "left": {"ind": "rsi14", "output": "value"}, "op": "gt", "right": {"const": 100}},
        "pe": {"type": "compare", "left": {"ind": "rsi14", "output": "value"}, "op": "lt", "right": {"const": 0}},
    }
    return {
        "simple-trend-follower-2023-2024": {
            "strategy": stf,
            "settings": {"period": {"start": "2023-01-01", "end": "2024-12-31"}, "costs": _costs()},
        },
        "zero-trades": {
            "strategy": never,
            "settings": {"period": {"start": "2024-01-01", "end": "2024-03-31"}, "costs": _costs()},
        },
        "capital-given": {
            "strategy": stf,
            "settings": {
                "period": {"start": "2024-01-01", "end": "2024-06-30"},
                "costs": _costs(),
                "capital_rupees": 100000,
            },
        },
    }


def generate(name: str, request: dict[str, Any]) -> dict[str, Any]:
    from nikasha_engine.core import api

    status, body = api.dispatch("POST", "/v1/evaluate", json.dumps(request).encode())
    if status != 200:
        raise SystemExit(f"{name}: engine returned {status}")
    body.update(FIXED)
    return {"request": request, "report": body}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    check = "--check" in sys.argv
    stale = []
    for name, req in cases().items():
        text = json.dumps(generate(name, req), indent=1, ensure_ascii=False) + "\n"
        path = OUT / f"{name}.json"
        if check:
            if not path.exists() or path.read_text() != text:
                stale.append(name)
        else:
            path.write_text(text)
            print(f"wrote {path.relative_to(ROOT)}")
    if stale:
        print("Report fixtures out of date: " + ", ".join(stale))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

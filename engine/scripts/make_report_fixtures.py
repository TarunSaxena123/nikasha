"""Generate shared fixtures from the engine: report fixtures (T-RPT-02) and golden reports (T-RPT-10),
`meta.example.json` (T-PRV-03) and the engine's problems for every invalid strategy fixture, which
the web app's validator must match exactly (T-INP-01).

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
        "orb-cpr-2024": {  # partial exits and the 2026-10-15 exit reasons, for web tests
            "strategy": json.loads((STRATS / "orb-cpr-sample-with-answers.json").read_text()),
            "settings": {"period": {"start": "2024-01-01", "end": "2024-12-31"}, "costs": _costs()},
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


def meta_fixture() -> dict[str, Any]:
    from nikasha_engine.core import api

    status, body = api.dispatch("GET", "/v1/meta")
    if status != 200:
        raise SystemExit("meta failed")
    body["engine_version"] = "fixture"
    return body


def expected_problems() -> dict[str, Any]:
    """Engine problems for every invalid fixture, as the web harness must reproduce them."""
    from nikasha_engine.core.api import init, instruments
    from nikasha_engine.instruments.registry import build_instrument
    from nikasha_engine.validation.semantic import DataRange, schema_problems, semantic_problems

    init()
    meta = meta_fixture()["instruments"][0]["data_range"]
    from datetime import date

    dr = DataRange(date.fromisoformat(meta["first"][:10]), date.fromisoformat(meta["last"][:10]))
    out: dict[str, Any] = {}
    default = {"period": {"start": "2024-01-01", "end": "2024-12-31"}}
    for path in sorted((STRATS.parent / "invalid").glob("*.json")):
        case = json.loads(path.read_text())
        insts = instruments()
        if "profile_overrides" in case:
            raw = copy.deepcopy(insts["NIFTY50"].raw)
            raw.update(case["profile_overrides"])
            insts = {"NIFTY50": build_instrument(raw)}
        probs = schema_problems(case["strategy"]) or semantic_problems(
            case["strategy"], insts, case.get("settings", default), dr
        )
        out[path.stem] = [p.as_dict() for p in probs]
    return out


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    check = "--check" in sys.argv
    stale = []
    extra = {
        OUT.parent / "meta.example.json": meta_fixture(),
        STRATS.parent / "expected-problems.json": expected_problems(),
    }
    items: list[tuple[Path, str]] = [
        (path, json.dumps(data, indent=1, ensure_ascii=False) + "\n") for path, data in extra.items()
    ]
    for name, req in cases().items():
        items.append((OUT / f"{name}.json", json.dumps(generate(name, req), indent=1, ensure_ascii=False) + "\n"))
    for path, text in items:
        name = path.name
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

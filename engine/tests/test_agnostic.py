"""REQ-DAT-03, 04 (AC-DAT-02): a second instrument works with no engine change; no Nifty constants in code."""

from __future__ import annotations

import re
import shutil
import sys
from datetime import date
from pathlib import Path

import pytest

from conftest import REPO, load_json, strategy
from nikasha_engine.backtest.runner import get_calendar, run_all
from nikasha_engine.data.loader import clear_cache, day_to_date, load_market_data
from nikasha_engine.instruments.registry import hhmm_to_min, load_registry

FIX = Path(__file__).parent / "fixtures" / "instruments"
sys.path.insert(0, str(FIX))
import testidx_data  # noqa: E402


@pytest.fixture(scope="module")
def testidx(tmp_path_factory):
    inst_dir = tmp_path_factory.mktemp("instruments")
    shutil.copy(REPO / "instruments" / "nifty50.json", inst_dir / "nifty50.json")
    shutil.copy(FIX / "testidx.json", inst_dir / "testidx.json")
    data = tmp_path_factory.mktemp("data")
    testidx_data.write(data)
    reg = load_registry(inst_dir)
    inst = reg.get("TESTIDX")
    assert inst is not None
    md = load_market_data(inst, data)
    yield inst, md
    clear_cache()


def test_testidx_backtests_with_its_own_rules(testidx):
    inst, md = testidx
    s = strategy("simple-trend-follower")
    s["underlying"] = "TESTIDX"
    s["position"]["lot_size"] = 25
    s["advanced"]["entry_windows"] = [{"from": "10:30", "to": "14:30"}]  # this session opens at 10:00
    costs = {k: v["value"] for k, v in inst.default_costs.items()}
    base, minus, plus = run_all(md, s, {"period": {"start": "2020-01-01", "end": "2020-02-25"}, "costs": costs})
    assert base.trades, "trades are produced"
    assert (minus.shift, plus.shift) == (-3.0, 3.0)  # the profile's sensitivity shift
    for tr in base.trades:
        leg = tr.legs[0]
        assert leg["strike"] % 100 == 0  # strike interval 100
        assert date.fromisoformat(leg["expiry"]).weekday() == 2  # Wednesday expiries
        assert hhmm_to_min("10:30") <= tr.entry_minute % 1440 < hhmm_to_min("14:30")
        if tr.exit_reason == "SQUARE_OFF":
            assert tr.exit_minute % 1440 == hhmm_to_min("15:45")
        assert abs(leg["entry_premium"] * 10 - round(leg["entry_premium"] * 10)) < 1e-6  # tick 0.1
    cal = get_calendar(md)
    assert all(d.weekday() == 2 for d in cal.weekly if d <= md.last_date)
    assert md.first_date == date(2020, 1, 1) and day_to_date(int(md.days[-1])) == md.last_date


def test_no_instrument_constants_in_engine_code():
    """AC-DAT-02: no instrument symbol or Nifty-specific constant in nikasha_engine/ (outside generated code)."""
    banned = re.compile(r"nifty|india\s*vix|indiavix|\b09:15\b|\b15:15\b|\b15:29\b|\b15:30\b|\b0\.065\b", re.I)
    hits = []
    for path in (REPO / "engine" / "nikasha_engine").rglob("*.py"):
        if "generated" in path.parts:
            continue
        for i, line in enumerate(path.read_text().splitlines(), 1):
            if banned.search(line):
                hits.append(f"{path.name}:{i}: {line.strip()}")
    assert hits == []


def test_testidx_profile_is_valid():
    from nikasha_engine.instruments.registry import build_instrument

    inst = build_instrument(load_json(FIX / "testidx.json"))
    assert inst.first_bar == hhmm_to_min("10:00") and inst.strike_interval == 100

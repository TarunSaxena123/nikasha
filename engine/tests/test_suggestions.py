"""Feature 06 planner (REQ-SUG-02…06; AC-SUG-02…05) and its wording (AC-SUG-09, T-PRV-11)."""

from __future__ import annotations

import json
from datetime import date

import pytest

from conftest import CONTRACTS, default_costs, strategy, synth, weekdays
from contract_helpers import assert_valid
from nikasha_engine.suggestions import planner

SETTINGS = {"period": {"start": "2024-06-03", "end": "2024-06-07"}}


@pytest.fixture(scope="module")
def md(nifty):
    return synth(nifty, weekdays(date(2024, 6, 3), 5))


def base(trades=100, bands=(), sides=()):
    return {"metrics": {"trades": trades}, "by_vol_band": list(bands), "by_regime": [], "by_side": list(sides)}


def row(key, trades, expectancy):
    return {"key": key, "label": key, "trades": trades, "wins": 0, "win_rate_pct": 0, "net_pnl": 0, "expectancy": expectancy}


def test_too_few_trades(md):
    out = planner.plan(strategy("simple-trend-follower"), SETTINGS, base(20), md)
    assert out["variants"] == [] and "30 trades" in out["not_offered_text"] and "20" in out["not_offered_text"]


def test_sweeps_ac_sug_03(md):
    out = planner.plan(strategy("simple-trend-follower"), SETTINGS, base(), md)
    sl = [v for v in out["variants"] if v["group"] == "Stop-loss (% of premium)"]
    tg = [v for v in out["variants"] if v["group"] == "Target (% of premium)"]
    assert [v["strategy"]["exit"]["stop_loss"]["value"] for v in sl] == [20, 25, 35, 40]
    assert [v["strategy"]["exit"]["target"]["value"] for v in tg] == [35, 40, 60, 65]
    assert sl[0]["change_text"] == "Stop-loss 20% instead of 30%"
    orig = strategy("simple-trend-follower")
    for v in sl:
        s = json.loads(json.dumps(v["strategy"]))
        s["exit"]["stop_loss"]["value"] = 30
        assert s == orig  # exactly one change
    assert out["variants"][-1]["kind"] != "ALTERNATIVE"  # the template itself gets no alternative


def test_vix_and_side_filters_ac_sug_04(md):
    out = planner.plan(strategy("simple-trend-follower"), SETTINGS,
                       base(bands=[row("band_0", 12, -85.0), row("band_1", 50, 10.0), row("band_2", 15, -5.0)],
                            sides=[row("CE", 40, -20.0), row("PE", 45, 30.0)]), md)
    f = [v for v in out["variants"] if v["kind"] == "REGIME_FILTER"]
    assert [v["change_text"] for v in f] == [
        "Skip trades when India VIX is below 12", "Skip trades when India VIX is 18–25", "Puts only (skip calls)"]
    low = f[0]["strategy"]["entry"]["ce"]
    assert low["type"] == "all" and low["conditions"][1] == {"type": "compare", "left": {"vix": "close"}, "op": "gte",
                                                            "right": {"const": 12.0}}
    assert f[0]["reason_text"] == "Trades taken when India VIX was below 12 lost ₹85 on average (12 trades)."
    mid = f[1]["strategy"]["entry"]["pe"]["conditions"][1]
    assert mid["type"] == "any"
    puts = f[2]["strategy"]
    assert puts["legs"][0]["option_type"] == "PE" and "ce" not in puts["entry"]


def test_fixed_time_entry_becomes_conditional(md):
    s = strategy("short-straddle")
    out = planner.filters(s, base(bands=[row("band_3", 20, -50.0)]), md)
    assert out[0]["strategy"]["entry"]["all_legs"] == {"type": "compare", "left": {"vix": "close"}, "op": "lt",
                                                       "right": {"const": 25.0}}
    assert out[0]["strategy"]["entry"]["at_time"] == "09:20"


def test_alternative_ac_sug_05(md):
    s = strategy("one-line-sample-with-answers")
    s["position"] = {"lots": 3, "lot_size": 75}
    out = planner.plan(s, SETTINGS, base(), md)
    alt = [v for v in out["variants"] if v["kind"] == "ALTERNATIVE"]
    assert len(alt) == 1 and alt[0]["strategy"]["position"] == {"lots": 3, "lot_size": 75}
    assert alt[0]["strategy"]["template_id"] == "simple-trend-follower"


def test_no_ideas_apply(md):
    s = strategy("simple-trend-follower")
    s["exit"] = {"stop_loss": {"type": "TRIGGER_CANDLE"}, "target": {"type": "RR", "value": 1.5}}
    out = planner.plan(s, SETTINGS, base(), md)
    assert out == {"variants": [], "not_offered_text": "No ideas apply to this strategy's settings."}


def test_response_shape_and_api(real_md, nifty):
    from nikasha_engine.core import api

    s = strategy("sample-pdf-with-answers")
    sett = {"period": {"start": "2019-02-11", "end": "2026-05-14"}, "costs": default_costs(nifty)}
    status, rep = api.dispatch("POST", "/v1/evaluate", json.dumps({"strategy": s, "settings": sett}).encode())
    assert status == 200
    b = {k: rep["breakdowns"][k] for k in ("by_vol_band", "by_regime", "by_side")}
    b["metrics"] = rep["metrics"]
    status, plan = api.dispatch("POST", "/v1/suggestions/plan",
                                json.dumps({"strategy": s, "settings": sett, "base": b}).encode())
    assert status == 200
    assert_valid("SuggestionPlanResponse", plan)
    assert 1 <= len(plan["variants"]) <= 12


def test_wording_is_past_simulated_and_clean():
    banned = [x.strip() for x in (CONTRACTS / "banned-phrases.txt").read_text().splitlines() if x.strip() and not x.startswith("#")]
    blob = "\n".join(planner.TEMPLATES).lower()
    for phrase in banned:
        assert phrase not in blob
    for word in ("best", "recommend", "should"):
        assert word not in blob

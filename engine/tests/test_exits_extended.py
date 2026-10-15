"""REQ-ENG-51…57 (AC-ENG-30…33): exit conditions, trail after points, index levels, partial exits.

LinearPricer: an ATM call bought at 10:00 (spot 24,500) costs 100 and moves 1:1 with spot; costs are
zero unless a test sets them. Stop 30% = premium 70 (spot 24,470).
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from conftest import default_costs, nifty_profile, run, settings, single_leg, synth, t, weekdays
from nikasha_engine.backtest.costs import CostRates, order_charges, round2
from nikasha_engine.backtest.runner import PARTIAL_NO_EFFECT
from nikasha_engine.instruments.registry import build_instrument

NIFTY = build_instrument(nifty_profile())
DAY = weekdays(date(2024, 6, 3), 1)
SETT = settings("2024-06-03", "2024-06-03")


def bars(spec: dict[str, tuple[float, float, float, float]], base: float = 24500.0):
    def f(d: int, tod: int):
        for hhmm, bar in spec.items():
            if t(hhmm) == tod:
                return bar
        return (base, base, base, base)

    return f


def close_below(x: float) -> dict[str, Any]:
    return {"type": "compare", "left": {"price": "close"}, "op": "lt", "right": {"const": x}}


def test_exit_condition_fills_at_next_open_before_the_stop():
    """AC-ENG-30: the 10:15 candle closes at 24,480 → exit at 10:30's open (80), though 10:30 also hits the stop."""
    md = synth(NIFTY, DAY, spot=bars({"10:29": (24500, 24500, 24480, 24480), "10:30": (24480, 24480, 24460, 24470)}))
    s = single_leg()
    s["exit"]["exit_when"] = {"ce": close_below(24485)}
    tr = run(md, s, SETT).trades[0]
    assert tr.exit_reason == "SIGNAL_EXIT" and tr.exit_minute % 1440 == t("10:30")
    assert tr.legs[0]["exit_premium"] == 80


def test_trail_to_cost_after_points():
    """AC-ENG-31: +25 points at 10:05 → stop at cost; back to 100 at 10:06 → TRAIL_TO_COST at 100."""
    md = synth(NIFTY, DAY, spot=bars({"10:05": (24500, 24526, 24500, 24520)}))
    s = single_leg(advanced={"trail_to_cost_at_pts": 25})
    tr = run(md, s, SETT).trades[0]
    assert tr.exit_reason == "TRAIL_TO_COST" and tr.exit_minute % 1440 == t("10:06")
    assert tr.legs[0]["exit_premium"] == 100


def _or_target(**over: Any) -> dict[str, Any]:
    s = single_leg(indicators={"or15": {"type": "OPENING_RANGE", "minutes": 15}})
    s["exit"] = {
        "stop_loss": {"type": "PCT_PREMIUM", "value": 30},
        "target": {"type": "SPOT_LEVEL", "ce": {"ind": "or15", "output": "high"}},
    }
    s.update(over)
    return s


def test_index_level_target_at_the_level_and_gapped():
    """AC-ENG-32: opening-range high 24,550 (above the index at entry); 10:20's high reaches it → 150."""
    md = synth(NIFTY, DAY, spot=bars({"09:16": (24500, 24550, 24500, 24500), "10:20": (24540, 24556, 24540, 24550)}))
    tr = run(md, _or_target(), SETT).trades[0]
    assert tr.exit_reason == "SPOT_TARGET" and tr.exit_minute % 1440 == t("10:20")
    assert tr.legs[0]["exit_premium"] == 150
    md = synth(NIFTY, DAY, spot=bars({"09:16": (24500, 24550, 24500, 24500), "10:20": (24570, 24575, 24565, 24570)}))
    tr = run(md, _or_target(), SETT).trades[0]
    assert tr.exit_reason == "SPOT_TARGET" and tr.legs[0]["exit_premium"] == 170  # opened beyond the level


def test_index_level_never_reached_before_the_level_exists():
    """REQ-ENG-53: the 09:16 spike is inside the opening range, which only exists from 09:30 → no early exit."""
    md = synth(NIFTY, DAY, spot=bars({"09:16": (24500, 24550, 24500, 24500)}))
    tr = run(md, _or_target(entry={"at_time": "09:20"}), SETT).trades[0]
    assert tr.exit_reason == "SQUARE_OFF"


def _partial(then: str, when: dict[str, Any] | None = None, lots: int = 2, **exit_over: Any) -> dict[str, Any]:
    s = single_leg(position={"lots": lots, "lot_size": 65})
    s["exit"].update(exit_over)
    s["advanced"] = {
        "partial_exit": {
            "percent": 50,
            "when": when or {"type": "PREMIUM_GAIN", "gain": {"type": "POINTS", "value": 20}},
            "then_stop": then,
        }
    }
    return s


SPIKES = {"10:05": (24500, 24525, 24500, 24520), "10:20": (24540, 24555, 24540, 24550)}


def test_partial_exit_then_unchanged_target():
    """AC-ENG-33: 1 of 2 lots at +20 (120) at 10:05; the other at the 50% target (150) at 10:20."""
    md = synth(NIFTY, DAY, spot=bars(SPIKES))
    tr = run(md, _partial("UNCHANGED"), SETT).trades[0]
    assert tr.partial is not None and tr.partial["quantity"] == 65 and tr.partial["exit_premiums"] == [120]
    assert tr.partial["minute"] % 1440 == t("10:05")
    assert tr.exit_reason == "TARGET" and tr.legs[0]["exit_premium"] == 150 and tr.quantity == 130
    # Entry is at 10:00's open (24,500 → 100); the partial and the rest each add their own P&L.
    assert tr.gross_pnl == 65 * 20 + 65 * 50


def test_partial_exit_costs_each_order_for_its_own_quantity():
    md = synth(NIFTY, DAY, spot=bars(SPIKES))
    costs = dict(default_costs(NIFTY), slippage_pts=0.0)
    tr = run(md, _partial("UNCHANGED"), settings("2024-06-03", "2024-06-03", costs)).trades[0]
    rates = CostRates.from_settings(costs)
    want = sum(
        c.total
        for c in (
            order_charges(rates, "BUY", 100, 130),
            order_charges(rates, "SELL", 120, 65),
            order_charges(rates, "SELL", 150, 65),
        )
    )
    assert tr.costs == round2(want)


def test_partial_exit_needs_two_lots_and_counts_no_effect():
    md = synth(NIFTY, DAY, spot=bars(SPIKES))
    res = run(md, _partial("UNCHANGED", lots=1), SETT)
    assert res.trades[0].partial is None and res.trades[0].exit_reason == "TARGET"
    assert res.no_effect == {PARTIAL_NO_EFFECT: 1}


def test_partial_then_cost():
    """After the partial at 10:05 the rest's stop is the entry price; 10:06 is back at 100 → TRAIL_TO_COST."""
    md = synth(NIFTY, DAY, spot=bars({"10:05": (24500, 24525, 24500, 24520)}))
    tr = run(md, _partial("COST"), SETT).trades[0]
    assert tr.partial and tr.partial["exit_premiums"] == [120]
    assert (
        tr.exit_reason == "TRAIL_TO_COST" and tr.exit_minute % 1440 == t("10:06") and tr.legs[0]["exit_premium"] == 100
    )


def test_partial_at_index_level_then_trail_to_the_partial_candle():
    """Partial when the index touches 24,520 (10:05, premium 120); the 10:00 candle's low is 24,490;
    from 10:15 the rest exits when the index trades below it: 10:20's low 24,485 → priced at 24,490 (90)."""
    spec = {
        "10:03": (24500, 24500, 24490, 24500),
        "10:05": (24500, 24525, 24500, 24520),
        "10:20": (24495, 24495, 24485, 24490),
    }
    md = synth(NIFTY, DAY, spot=bars(spec, base=24500))
    s = _partial("PARTIAL_CANDLE", when={"type": "SPOT_LEVEL", "ce": {"const": 24520}})
    del s["exit"]["target"]
    tr = run(md, s, SETT).trades[0]
    assert tr.partial and tr.partial["exit_premiums"] == [120] and tr.partial["minute"] % 1440 == t("10:05")
    assert tr.exit_reason == "TRAILING_STOP" and tr.exit_minute % 1440 == t("10:20")
    assert tr.legs[0]["exit_premium"] == 90
    assert tr.gross_pnl == pytest.approx(65 * 20 + 65 * (-10))


def test_whole_position_exit_in_the_partial_minute_wins():
    """REQ-ENG-55: the target and the partial trigger in the same minute → no partial."""
    md = synth(NIFTY, DAY, spot=bars({"10:05": (24500, 24555, 24500, 24550)}))
    tr = run(md, _partial("UNCHANGED"), SETT).trades[0]
    assert tr.partial is None and tr.exit_reason == "TARGET"


def test_put_level_below_the_index_is_reached_by_the_low():
    """REQ-ENG-53 (downward): a bought ATM put (100 at 24,500), target at 24,450 → 10:20's low reaches it → 150."""
    md = synth(NIFTY, DAY, spot=bars({"10:20": (24460, 24460, 24445, 24450)}))
    s = single_leg()
    s["legs"][0]["option_type"] = "PE"
    s["exit"] = {
        "stop_loss": {"type": "PCT_PREMIUM", "value": 30},
        "target": {"type": "SPOT_LEVEL", "pe": {"const": 24450}},
    }
    tr = run(md, s, SETT).trades[0]
    assert tr.exit_reason == "SPOT_TARGET" and tr.legs[0]["exit_premium"] == 150


def test_orb_cpr_sample_runs_on_real_data(real_md):
    """The shared ORB + CPR fixture (every extension at once) evaluates on the real data with consistent trades."""
    from conftest import load_json
    from nikasha_engine.core.paths import contracts_dir

    s = load_json(contracts_dir() / "fixtures" / "strategies" / "valid" / "orb-cpr-sample-with-answers.json")
    res = run(real_md, s, settings("2024-01-01", "2025-12-31", default_costs(real_md.instrument)), pricer_cls=None)
    assert res.trades, "expected some trades over two years"
    reasons = {tr.exit_reason for tr in res.trades}
    assert reasons <= {"STOP_LOSS", "TRAIL_TO_COST", "SPOT_TARGET", "TRAILING_STOP", "SIGNAL_EXIT", "SQUARE_OFF"}
    for tr in res.trades:
        assert tr.entry_minute % 1440 <= t("11:30") and tr.quantity == 130
        if tr.partial:
            assert tr.partial["quantity"] == 65 and tr.entry_minute <= tr.partial["minute"] < tr.exit_minute
    days = [tr.entry_date for tr in res.trades]
    assert len(days) == len(set(days))  # at most one trade a day

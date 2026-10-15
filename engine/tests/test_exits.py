"""REQ-ENG-21, 23…35 (AC-ENG-09…17): fills, levels, exit search, settlement, multi-leg, sizing."""

from __future__ import annotations

from datetime import date
from typing import Any

import numpy as np
import pytest

from conftest import LinearPricer, default_costs, nifty_profile, run, settings, single_leg, synth, t, weekdays
from nikasha_engine.backtest.exits import LegFill, Pricer, simulate_trade
from nikasha_engine.backtest.runner import prepare
from nikasha_engine.instruments.registry import build_instrument

NIFTY = build_instrument(nifty_profile())
JUNE = weekdays(date(2024, 6, 3), 5)


def bars(spec: dict[tuple[int, str], tuple[float, float, float, float]], base: float = 24500.0):
    def f(d: int, tod: int):
        for (day, hhmm), bar in spec.items():
            if day == d and t(hhmm) == tod:
                return bar
        return (base, base, base, base)

    return f


def test_entry_fill_at_next_minute_open_plus_slippage(nifty):
    """AC-ENG-09: signal candle 10:00–10:14 → fill at 10:15's open premium + 0.5."""
    md = synth(
        nifty, JUNE[:1], spot=lambda d, tod: (24600.0,) * 4 if t("10:00") <= tod < t("10:15") else (24500.0,) * 4
    )
    s = single_leg(entry={"ce": {"type": "compare", "left": {"price": "close"}, "op": "gt", "right": {"const": 24550}}})
    costs = dict(default_costs(nifty))
    res = run(md, s, settings("2024-06-03", "2024-06-03", costs), pricer_cls=None)
    tr = res.trades[0]
    assert tr.entry_minute % 1440 == t("10:15")
    i = md.minute_at(0, t("10:15"))
    leg = LegFill("BUY", "CE", 24600.0, date(2024, 6, 6), 0.0)
    open_premium = float(Pricer(md, 0.0).ohlc(np.array([i]), leg)[0][0])
    assert tr.legs[0]["entry_premium"] == pytest.approx(open_premium + 0.5)


def _fixed(**exit_over: Any) -> dict[str, Any]:
    s = single_leg()
    s["exit"].update(exit_over)
    return s


def test_stop_first_when_both_levels_inside_one_minute(nifty):
    """AC-ENG-10: entry 100, SL 70, target 150; range 65–155 → STOP_LOSS at 70."""
    md = synth(nifty, JUNE[:1], spot=bars({(0, "10:05"): (24500, 24555, 24465, 24500)}))
    tr = run(md, single_leg(), settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.legs[0]["entry_premium"] == 100 and tr.exit_reason == "STOP_LOSS"
    assert tr.legs[0]["exit_premium"] == 70 and tr.exit_minute % 1440 == t("10:05")


def test_gap_through_stop_fills_at_open(nifty):
    """AC-ENG-10: the minute opens at 60 (beyond the stop) → fill at 60."""
    md = synth(nifty, JUNE[:1], spot=bars({(0, "10:05"): (24460, 24470, 24455, 24465)}))
    tr = run(md, single_leg(), settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.exit_reason == "STOP_LOSS" and tr.legs[0]["exit_premium"] == 60


def test_target_at_level_and_gap_through_target(nifty):
    md = synth(nifty, JUNE[:1], spot=bars({(0, "10:05"): (24500, 24560, 24490, 24500)}))
    tr = run(md, single_leg(), settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.exit_reason == "TARGET" and tr.legs[0]["exit_premium"] == 150
    md = synth(nifty, JUNE[:1], spot=bars({(0, "10:05"): (24570, 24575, 24565, 24570)}))
    tr = run(md, single_leg(), settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.exit_reason == "TARGET" and tr.legs[0]["exit_premium"] == 170


def test_intraday_square_off_at_1515_open(nifty):
    """AC-ENG-11."""
    md = synth(nifty, JUNE[:1], spot=bars({(0, "15:15"): (24510, 24520, 24505, 24515)}))
    tr = run(md, single_leg(), settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.exit_reason == "SQUARE_OFF" and tr.exit_minute % 1440 == t("15:15")
    assert tr.legs[0]["exit_premium"] == 110


def test_trigger_candle_cap_rr_and_trail(nifty):
    """AC-ENG-12: entry 120, trigger-candle low 80, cap 30 → SL 90, target 165; at 150 the stop moves to 120."""
    spec = {
        (0, "10:07"): (24600, 24600, 24580, 24600),
        (0, "10:15"): (24620, 24620, 24620, 24620),
        (0, "10:20"): (24620, 24650, 24620, 24640),
        (0, "10:30"): (24625, 24625, 24619, 24620),
    }

    def spot(d, tod):
        if (d, tod) in {(0, t(k[1])) for k in spec}:
            return next(v for k, v in spec.items() if t(k[1]) == tod)
        if t("10:00") <= tod < t("10:15"):
            return (24600.0,) * 4
        if tod < t("10:00"):
            return (24500.0,) * 4
        return (24640.0,) * 4 if t("10:15") < tod < t("10:30") else (24620.0,) * 4

    md = synth(nifty, JUNE[:1], spot=spot)
    s = single_leg(entry={"ce": {"type": "compare", "left": {"price": "close"}, "op": "gt", "right": {"const": 24550}}})
    s["exit"] = {"stop_loss": {"type": "TRIGGER_CANDLE"}, "target": {"type": "RR", "value": 1.5}}
    s["advanced"] = {"sl_cap_pts": 30, "trail_to_cost_at_r": 1}
    prep = prepare(md, s, settings("2024-06-03", "2024-06-03"))
    path = simulate_trade(prep.signals[0], s, md, prep.candles, LinearPricer(md, 0.0), 0.0)
    assert not isinstance(path, str)
    assert path.legs[0].entry == 120 and path.stop_amt == pytest.approx(30)  # SL 90 (capped from 80)
    assert path.target_amt == pytest.approx(45)  # target 165
    assert path.exit_reason == "TRAIL_TO_COST" and path.legs[0].exit == pytest.approx(120)


def test_exit_after_n_candles(nifty):
    """AC-ENG-13: 15-min, entry 10:15, N = 4 → exit at 11:15's open, N_CANDLES."""
    md = synth(nifty, JUNE[:1])
    s = single_leg(entry={"at_time": "10:15"}, advanced={"exit_after_candles": 4})
    tr = run(md, s, settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.exit_reason == "N_CANDLES" and tr.exit_minute % 1440 == t("11:15")


def test_time_exit_on_entry_day(nifty):
    md = synth(nifty, JUNE[:1])
    s = _fixed(time_exit={"at": "13:00", "on": "ENTRY_DAY"})
    tr = run(md, s, settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.exit_reason == "TIME_EXIT" and tr.exit_minute % 1440 == t("13:00")


def test_unpriceable_exit_minute_uses_next_priceable(nifty):
    """REQ-ENG-30."""
    md = synth(nifty, JUNE[:1], vix=lambda d, tod: None if tod in (t("15:15"), t("15:16")) else 15.0)
    tr = run(md, single_leg(), settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.exit_reason == "SQUARE_OFF" and tr.exit_minute % 1440 == t("15:17")


def test_positional_held_to_expiry_settles_at_intrinsic(nifty):
    """AC-ENG-14: settlement at intrinsic from the expiry day's 15:29 close, without slippage."""
    md = synth(nifty, JUNE, spot=bars({(3, "15:29"): (24600, 24640, 24600, 24630)}))
    s = single_leg(
        holding="POSITIONAL", exit={"stop_loss": {"type": "PCT_PREMIUM", "value": 90}, "hold_to_expiry": True}
    )
    sett = settings("2024-06-03", "2024-06-03", {**default_costs(nifty)})
    res = run(md, s, sett)  # linear premiums: flat at 100 until expiry, so only settlement can exit
    tr = res.trades[0]
    assert tr.exit_reason == "EXPIRY_SETTLEMENT"
    assert tr.exit_minute == (date(2024, 6, 6) - date(1970, 1, 1)).days * 1440 + t("15:29")
    assert tr.legs[0]["exit_premium"] == 130.0  # 24,630 − 24,500, no slippage


def test_overnight_gap_fills_beyond_level(nifty):
    """REQ-ENG-33: a positional position is checked from the next day's first minute."""
    md = synth(nifty, JUNE[:2], spot=lambda d, tod: (24440.0,) * 4 if d == 1 else (24500.0,) * 4)
    s = single_leg(
        holding="POSITIONAL", exit={"stop_loss": {"type": "PCT_PREMIUM", "value": 30}, "hold_to_expiry": True}
    )
    md2 = synth(nifty, JUNE, spot=lambda d, tod: (24440.0,) * 4 if d >= 1 else (24500.0,) * 4)
    tr = run(md2, s, settings("2024-06-03", "2024-06-03")).trades[0]
    assert tr.exit_reason == "STOP_LOSS" and tr.exit_minute % 1440 == t("09:15")
    assert tr.legs[0]["exit_premium"] == 40  # opened beyond the 70 stop
    del md


class StraddlePricer(Pricer):
    """Each leg is 100 at the strike and rises 1:1 as spot moves against the seller."""

    def at(self, idx, leg, spot, vol, raw=False):
        if leg.is_call:
            return np.asarray(100.0 + np.maximum(spot - leg.strike, 0.0), dtype=np.float64)
        return np.asarray(100.0 + np.maximum(leg.strike - spot, 0.0), dtype=np.float64)


def test_straddle_combined_stop_exits_both_legs(nifty):
    """AC-ENG-15: CE 100 + PE 100 sold, SL 30% → a combined loss of 60 exits both legs together."""
    md = synth(nifty, JUNE[:1], spot=bars({(0, "11:00"): (24500, 24580, 24500, 24570)}))
    s = single_leg(
        legs=[
            {
                "action": "SELL",
                "option_type": "CE",
                "expiry": "CURRENT_WEEKLY",
                "strike": {"method": "MONEYNESS", "moneyness": "ATM", "distance_pts": 0},
            },
            {
                "action": "SELL",
                "option_type": "PE",
                "expiry": "CURRENT_WEEKLY",
                "strike": {"method": "MONEYNESS", "moneyness": "ATM", "distance_pts": 0},
            },
        ],
        entry={"at_time": "09:20"},
        exit={"stop_loss": {"type": "PCT_PREMIUM", "value": 30}},
    )
    tr = run(md, s, settings("2024-06-03", "2024-06-03"), pricer_cls=StraddlePricer).trades[0]
    assert tr.side == "MULTI" and tr.exit_reason == "STOP_LOSS" and tr.exit_minute % 1440 == t("11:00")
    ce, pe = tr.legs
    assert ce["entry_premium"] == 100 and pe["entry_premium"] == 100
    loss = (ce["exit_premium"] - 100) + (pe["exit_premium"] - 100)
    assert loss == pytest.approx(60, abs=0.05)


def test_quantity_is_lots_times_lot_size(nifty):
    """AC-ENG-16."""
    md = synth(nifty, JUNE[:2], spot=bars({(0, "15:15"): (24510,) * 4}))
    s = single_leg(position={"lots": 2, "lot_size": 65})
    res = run(md, s, settings("2024-06-03", "2024-06-04"))
    assert {tr.quantity for tr in res.trades} == {130}
    assert res.trades[0].gross_pnl == pytest.approx(10 * 130)


def test_vix_sizing_minimum_one_lot_has_no_effect(nifty):
    """AC-ENG-17: 1 lot, 50% below VIX 12, VIX at day open 11 → 1 lot; recorded as no effect."""
    md = synth(nifty, JUNE[:1], vix=11.0)
    s = single_leg(
        advanced={
            "vix_sizing": {
                "measured_at": "DAY_OPEN",
                "bands": [{"vix_to": 12, "size_pct": 50}, {"vix_from": 12, "size_pct": 100}],
            }
        }
    )
    res = run(md, s, settings("2024-06-03", "2024-06-03"))
    assert res.trades[0].lots_used == 1 and res.trades[0].quantity == 65
    assert sum(res.no_effect.values()) == 1


def test_vix_sizing_scales_lots(nifty):
    md = synth(nifty, JUNE[:1], vix=20.0)
    s = single_leg(
        position={"lots": 4, "lot_size": 65},
        advanced={
            "vix_sizing": {
                "measured_at": "ENTRY",
                "bands": [{"vix_to": 18, "size_pct": 100}, {"vix_from": 18, "size_pct": 50}],
            }
        },
    )
    res = run(md, s, settings("2024-06-03", "2024-06-03"))
    assert res.trades[0].lots_used == 2 and res.no_effect == {}

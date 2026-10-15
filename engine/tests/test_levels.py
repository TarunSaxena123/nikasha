"""REQ-ENG-48, 49, 50 (AC-ENG-28, 29): opening range, pivots / CPR and candle size, with hand values."""

from __future__ import annotations

from datetime import date

import numpy as np

from conftest import nifty_profile, synth, t, weekdays
from nikasha_engine.candles.resample import build_candles
from nikasha_engine.conditions.evaluator import Context, operand
from nikasha_engine.indicators import compute
from nikasha_engine.instruments.registry import build_instrument

NIFTY = build_instrument(nifty_profile())
DAYS = weekdays(date(2024, 6, 3), 3)


def day_bars(per_day: dict[int, dict[str, tuple[float, float, float, float]]], base: float = 100.0):
    def f(d: int, tod: int):
        for hhmm, bar in per_day.get(d, {}).items():
            if t(hhmm) == tod:
                return bar
        return (base, base, base, base)

    return f


def test_opening_range_appears_only_after_the_range_ends_and_resets_daily():
    """AC-ENG-28: 5-minute candles, OR 15 → the 09:25 candle is the first with values."""
    spot = day_bars(
        {
            0: {"09:16": (100, 130, 100, 110), "09:29": (100, 101, 80, 90), "09:40": (100, 200, 50, 100)},
            1: {"09:20": (100, 105, 95, 100)},
        }
    )
    md = synth(NIFTY, DAYS, spot=spot)
    c = build_candles(md, 5)
    out = compute(c, {"type": "OPENING_RANGE", "minutes": 15}, md)
    day0 = np.flatnonzero(c.day_id == 0)
    assert np.isnan(out["high"][day0[0]]) and np.isnan(out["high"][day0[1]])  # 09:15, 09:20: not known yet
    assert out["high"][day0[2]] == 130 and out["low"][day0[2]] == 80  # 09:25 candle closes at 09:29
    assert out["high"][day0[5]] == 130  # later candles keep the range (the 09:40 spike is outside it)
    day1 = np.flatnonzero(c.day_id == 1)
    assert np.isnan(out["high"][day1[0]])
    assert out["high"][day1[2]] == 105 and out["low"][day1[2]] == 95


def test_pivots_from_the_previous_day_hand_values():
    """AC-ENG-29: H 110, L 90, C 100 → flat CPR; C 106 → TC 104, BC 100."""
    spot = day_bars(
        {
            0: {"10:00": (100, 110, 100, 100), "11:00": (100, 100, 90, 100)},
            1: {"10:00": (100, 110, 100, 100), "11:00": (100, 100, 90, 100), "15:29": (106, 106, 106, 106)},
        }
    )
    md = synth(NIFTY, DAYS, spot=spot)
    c = build_candles(md, 15)
    out = compute(c, {"type": "PIVOTS"}, md)
    d0, d1, d2 = (np.flatnonzero(c.day_id == i) for i in range(3))
    assert all(np.isnan(out[k][d0]).all() for k in out)  # no previous day in the data
    got = {k: float(out[k][d1[0]]) for k in out}
    assert got == {
        "p": 100,
        "tc": 100,
        "bc": 100,
        "r1": 110,
        "s1": 90,
        "r2": 120,
        "s2": 80,
        "r3": 130,
        "s3": 70,
        "cpr_width": 0,
        "cpr_width_pct": 0,
    }
    assert np.allclose(out["p"][d1], 100)  # constant through the day
    nxt = {k: float(out[k][d2[3]]) for k in ("p", "tc", "bc", "r1", "s1", "cpr_width")}
    assert nxt == {"p": 102, "tc": 104, "bc": 100, "r1": 114, "s1": 94, "cpr_width": 4}
    assert abs(float(out["cpr_width_pct"][d2[0]]) - 4 / 102 * 100) < 1e-9


def test_candle_range_and_body():
    """AC-ENG-29: range = high − low, body = |close − open|, in index points."""
    md = synth(NIFTY, DAYS[:1], spot=day_bars({0: {"09:15": (100, 120, 95, 110), "09:16": (110, 112, 90, 92)}}))
    c = build_candles(md, 15)
    ctx = Context(c, {}, md)
    assert operand({"candle": "range"}, ctx)[0] == 30  # 120 − 90
    assert operand({"candle": "body"}, ctx)[0] == 0  # opens 100, closes 100 at 09:29
    md2 = synth(NIFTY, DAYS[:1], spot=day_bars({0: {"09:15": (100, 120, 95, 110), "09:29": (100, 100, 80, 85)}}))
    c2 = build_candles(md2, 15)
    assert operand({"candle": "body"}, Context(c2, {}, md2))[0] == 15

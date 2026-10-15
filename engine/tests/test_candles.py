"""REQ-ENG-01, 02 (AC-ENG-01): candles anchored at the session open, built from minutes present."""

from __future__ import annotations

from datetime import date

import numpy as np

from conftest import synth, t, weekdays
from nikasha_engine.candles.resample import build_candles
from nikasha_engine.instruments.registry import min_to_hhmm

DAYS = weekdays(date(2024, 6, 3), 2)


def test_60_minute_boundaries(nifty):
    md = synth(nifty, DAYS)
    c = build_candles(md, 60)
    day0 = c.day_id == 0
    starts = [min_to_hhmm(x) for x in c.start_tod[day0]]
    assert starts == ["09:15", "10:15", "11:15", "12:15", "13:15", "14:15", "15:15"]
    assert min_to_hhmm(int(c.end_tod[day0][-1])) == "15:29"
    assert len(c) == 14


def test_240_minute_two_candles_per_day(nifty):
    md = synth(nifty, DAYS)
    c = build_candles(md, 240)
    day0 = np.flatnonzero(c.day_id == 0)
    assert [(min_to_hhmm(int(c.start_tod[i])), min_to_hhmm(int(c.end_tod[i]))) for i in day0] == [
        ("09:15", "13:14"),
        ("13:15", "15:29"),
    ]


def test_candle_ohlc_from_minutes_present_and_no_cross_day(nifty):
    def spot(d, tod):
        if d == 0 and tod == t("09:15"):
            return None  # first minute missing: the candle opens at the next present minute
        base = 100 + d * 1000 + (tod - t("09:15"))
        return (base, base + 0.5, base - 0.5, base + 0.25)

    md = synth(nifty, DAYS, spot=spot)
    c = build_candles(md, 15)
    assert c.open[0] == 101 and c.close[0] == 114.25 and c.high[0] == 114.5 and c.low[0] == 100.5
    # The last candle of day 0 never includes day 1's minutes.
    last0 = np.flatnonzero(c.day_id == 0)[-1]
    assert c.close[last0] < 1000 and c.open[last0 + 1] >= 1100


def test_bucket_without_underlying_makes_no_candle(nifty):
    md = synth(nifty, DAYS[:1], spot=lambda d, tod: None if t("10:00") <= tod < t("10:15") else (1, 1, 1, 1))
    c = build_candles(md, 15)
    assert "10:00" not in [min_to_hhmm(int(x)) for x in c.start_tod]
    assert len(c) == 24


def test_volatility_candles(nifty):
    md = synth(nifty, DAYS[:1], vix=lambda d, tod: 10 + (tod - t("09:15")) * 0.01)
    c = build_candles(md, 15)
    assert abs(c.v_open[0] - 10.0) < 1e-12 and abs(c.v_close[0] - 10.14) < 1e-12

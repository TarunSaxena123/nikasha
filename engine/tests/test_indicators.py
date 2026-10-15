"""REQ-ENG-03…05 (AC-ENG-02, 03): indicators match the reference fixtures; warm-up rules."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
import pytest

from nikasha_engine.candles.resample import Candles, build_candles
from nikasha_engine.indicators import compute
from nikasha_engine.indicators.core import first_valid_index

FIX = Path(__file__).parent / "fixtures" / "indicators"


def _candles(series: dict) -> Candles:
    n = len(series["close"])
    z = np.zeros(n, dtype=np.int64)
    arr = {k: np.asarray(v, dtype=np.float64) for k, v in series.items()}
    return Candles(
        1,
        z.astype(np.int32),
        z.astype(np.int32),
        z.astype(np.int32),
        z,
        z,
        z,
        arr["open"],
        arr["high"],
        arr["low"],
        arr["close"],
        np.full(n, np.nan),
        np.full(n, np.nan),
        z,
    )


@pytest.mark.parametrize("fixture", ["hand", "long"])
def test_matches_reference_fixtures(fixture):
    data = json.loads((FIX / f"{fixture}.json").read_text())
    c = _candles(data["input"])
    for key, entry in data["indicators"].items():
        got = compute(c, entry["spec"])
        for out, expected in entry["outputs"].items():
            exp = np.array([np.nan if v is None else v for v in expected])
            g = got[out]
            assert np.array_equal(np.isnan(g), np.isnan(exp)), f"{fixture}/{key}/{out}: warm-up differs"
            ok = ~np.isnan(exp)
            assert np.max(np.abs(g[ok] - exp[ok]), initial=0) <= 1e-6, f"{fixture}/{key}/{out}"


@pytest.mark.parametrize("key", ["ema9", "sma5", "rsi14", "adx14", "st10_2", "macd", "bb20"])
def test_first_valid_index_matches_design_table(key):
    data = json.loads((FIX / "long.json").read_text())
    spec = data["indicators"][key]["spec"]
    got = compute(_candles(data["input"]), spec)
    for out, first in first_valid_index(spec).items():
        valid = np.flatnonzero(~np.isnan(got[out]))
        assert valid[0] == first, f"{key}.{out}"


def test_hand_ema3_by_hand():
    data = json.loads((FIX / "hand.json").read_text())
    got = compute(_candles(data["input"]), {"type": "EMA", "period": 3, "source": "close"})["value"]
    close = data["input"]["close"]
    seed = (10.5 + 11.5 + 12) / 3
    assert got[2] == pytest.approx(seed)
    assert got[3] == pytest.approx(0.5 * close[3] + 0.5 * seed)


@pytest.mark.realdata
def test_ema_warm_at_period_start(real_md):
    """AC-ENG-03: EMA 21 on 15-min has a value on the first candle of 2024-01-01."""
    c = build_candles(real_md, 15)
    ema = compute(c, {"type": "EMA", "period": 21, "source": "close"})["value"]
    d = real_md.day_index(date(2024, 1, 1))
    first = int(np.flatnonzero(c.day_id == d)[0])
    assert not np.isnan(ema[first])


def test_supertrend_direction_values():
    data = json.loads((FIX / "long.json").read_text())
    d = compute(_candles(data["input"]), {"type": "SUPERTREND", "period": 10, "multiplier": 2})["direction"]
    assert set(np.unique(d[~np.isnan(d)]).tolist()) <= {-1.0, 1.0}


def test_no_vwap_type():
    """REQ-ENG-05: there is no VWAP indicator anywhere."""
    with pytest.raises(ValueError):
        compute(_candles({"open": [1.0], "high": [1.0], "low": [1.0], "close": [1.0]}), {"type": "VWAP"})

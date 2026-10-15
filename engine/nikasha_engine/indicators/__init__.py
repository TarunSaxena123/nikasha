"""Indicators over a candle series. No VWAP: an index has no traded volume (product.md §6.4).

Opening range and pivots need the 1-minute data (`md`); the others use the candles only.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import numpy.typing as npt

from nikasha_engine.candles.resample import Candles
from nikasha_engine.data.loader import MarketData
from nikasha_engine.indicators import core
from nikasha_engine.indicators.levels import PIVOT_OUTPUTS, opening_range, pivots

FloatArr = npt.NDArray[np.float64]

OUTPUTS: dict[str, tuple[str, ...]] = {
    "EMA": ("value",),
    "SMA": ("value",),
    "RSI": ("value",),
    "ADX": ("value", "plus_di", "minus_di"),
    "SUPERTREND": ("value",),
    "MACD": ("value", "signal", "hist"),
    "BBANDS": ("upper", "middle", "lower"),
    "OPENING_RANGE": ("high", "low"),
    "PIVOTS": PIVOT_OUTPUTS,
}


def _source(c: Candles, field: str) -> FloatArr:
    return {"open": c.open, "high": c.high, "low": c.low, "close": c.close}[field]


def compute(c: Candles, spec: dict[str, Any], md: MarketData | None = None) -> dict[str, FloatArr]:
    """All outputs of one indicator over the full candle series (warm-up values are NaN).

    Supertrend also returns `direction` (+1 up / −1 down), used by state and turns conditions.
    """
    t = spec["type"]
    if t == "EMA":
        return {"value": core.ema(_source(c, spec["source"]), int(spec["period"]))}
    if t == "SMA":
        return {"value": core.sma(_source(c, spec["source"]), int(spec["period"]))}
    if t == "RSI":
        return {"value": core.rsi(c.close, int(spec["period"]))}
    if t == "ADX":
        return core.adx(c.high, c.low, c.close, int(spec["period"]))
    if t == "SUPERTREND":
        return core.supertrend(c.high, c.low, c.close, int(spec["period"]), float(spec["multiplier"]))
    if t == "MACD":
        return core.macd(c.close, int(spec["fast"]), int(spec["slow"]), int(spec["signal"]))
    if t == "BBANDS":
        return core.bollinger(_source(c, spec["source"]), int(spec["period"]), float(spec["stddev"]))
    if t in ("OPENING_RANGE", "PIVOTS"):
        if md is None:
            raise ValueError("daily levels need the minute data")
        return opening_range(md, c, int(spec["minutes"])) if t == "OPENING_RANGE" else pivots(md, c)
    raise ValueError("unknown indicator")

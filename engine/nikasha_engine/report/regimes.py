"""Daily market regime (REQ-RPT-06; feature 02 design §2.4; backend.md §4.7).

Daily candles are built from every present 1-minute underlying bar of each trading day. The regime
of day D comes from ADX(n) at the close of the trading day before D (no look-ahead):
≥ trending_min → TRENDING, < sideways_max → SIDEWAYS, otherwise MIXED; UNKNOWN before warm-up.
"""

from __future__ import annotations

import numpy as np

from nikasha_engine.candles.resample import build_candles
from nikasha_engine.data.loader import MarketData
from nikasha_engine.indicators.core import adx


def classify(value: float, trending_min: float, sideways_max: float) -> str:
    if np.isnan(value):
        return "UNKNOWN"
    if value >= trending_min:
        return "TRENDING"
    if value < sideways_max:
        return "SIDEWAYS"
    return "MIXED"


def day_regimes(md: MarketData) -> list[str]:
    """Regime for each position in MarketData.days (cached: market data only)."""
    cached = md.cache.get("regimes")
    if isinstance(cached, list):
        return cached
    inst = md.instrument
    daily = build_candles(md, inst.minutes_per_day)  # one candle per trading day
    values = adx(daily.high, daily.low, daily.close, inst.regime_adx_period)["value"]
    by_day = np.full(len(md.days), np.nan)
    by_day[daily.day_id] = values
    out = ["UNKNOWN"] * len(md.days)
    for d in range(1, len(md.days)):
        out[d] = classify(float(by_day[d - 1]), inst.regime_trending_min, inst.regime_sideways_max)
    md.cache["regimes"] = out
    return out

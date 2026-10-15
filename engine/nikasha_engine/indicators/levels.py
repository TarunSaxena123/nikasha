"""Daily levels: opening range and pivots / CPR (REQ-ENG-48, 49; feature 01 design §2.18).

Both are built from the 1-minute underlying data and spread over the strategy's candles. Neither
looks ahead: the opening range appears only on candles that close at or after the range's last
minute, and pivots come from the previous trading day.
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt

from nikasha_engine.candles.resample import Candles
from nikasha_engine.data.loader import MarketData

FloatArr = npt.NDArray[np.float64]

PIVOT_OUTPUTS = ("p", "tc", "bc", "r1", "r2", "r3", "s1", "s2", "s3", "cpr_width", "cpr_width_pct")


def _per_day(values: FloatArr, idx: npt.NDArray[np.int64], reduce: str) -> FloatArr:
    """max / min of `values` at grid indices (−1 = missing), per row; NaN when a row has nothing."""
    x = np.where(idx >= 0, values[np.maximum(idx, 0)], np.nan)
    with np.errstate(all="ignore"):
        present = ~np.isnan(x)
        filled = np.where(present, x, -np.inf if reduce == "max" else np.inf)
        out = filled.max(axis=1) if reduce == "max" else filled.min(axis=1)
    return np.where(present.any(axis=1), out, np.nan)


def opening_range(md: MarketData, c: Candles, minutes: int) -> dict[str, FloatArr]:
    """High and low of each session's first `minutes` minutes, on candles closing at or after its end."""
    slots = md.grid[:, :minutes].astype(np.int64)
    day_high = _per_day(md.s_high, slots, "max")
    day_low = _per_day(md.s_low, slots, "min")
    last_tod = md.instrument.first_bar + minutes - 1
    known = np.asarray(c.end_tod >= last_tod)
    return {
        "high": np.where(known, day_high[c.day_id], np.nan),
        "low": np.where(known, day_low[c.day_id], np.nan),
    }


def _daily_hlc(md: MarketData) -> tuple[FloatArr, FloatArr, FloatArr]:
    cached = md.cache.get("daily_hlc")
    if isinstance(cached, tuple):
        return cached
    n = len(md.days)
    high, low, close = np.full(n, np.nan), np.full(n, np.nan), np.full(n, np.nan)
    for d in range(n):
        lo, hi = int(md.day_start[d]), int(md.day_end[d])
        h, l_, cl = md.s_high[lo:hi], md.s_low[lo:hi], md.s_close[lo:hi]
        valid = np.flatnonzero(~np.isnan(cl))
        if len(valid):
            high[d], low[d], close[d] = np.nanmax(h), np.nanmin(l_), cl[valid[-1]]
    md.cache["daily_hlc"] = (high, low, close)
    return high, low, close


def pivots(md: MarketData, c: Candles) -> dict[str, FloatArr]:
    """Classic floor pivots and CPR from the previous trading day in the data (empty on the first day)."""
    high, low, close = _daily_hlc(md)
    h, lo, cl = (np.concatenate(([np.nan], a[:-1])) for a in (high, low, close))
    p = (h + lo + cl) / 3.0
    bc_raw = (h + lo) / 2.0
    tc_raw = 2.0 * p - bc_raw
    tc, bc = np.maximum(tc_raw, bc_raw), np.minimum(tc_raw, bc_raw)
    rng = h - lo
    with np.errstate(all="ignore"):
        daily = {
            "p": p,
            "tc": tc,
            "bc": bc,
            "r1": 2.0 * p - lo,
            "s1": 2.0 * p - h,
            "r2": p + rng,
            "s2": p - rng,
            "r3": h + 2.0 * (p - lo),
            "s3": lo - 2.0 * (h - p),
            "cpr_width": tc - bc,
            "cpr_width_pct": (tc - bc) / p * 100.0,
        }
    return {k: np.asarray(v[c.day_id], dtype=np.float64) for k, v in daily.items()}

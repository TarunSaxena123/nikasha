"""Gap inventory (REQ-DAT-10…13; feature 01 design §2.4). Gaps are counted, never filled."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import numpy as np
import numpy.typing as npt

from nikasha_engine.data.loader import MarketData, date_to_day, day_to_date


@dataclass(frozen=True)
class GapInventory:
    missing_underlying: int
    missing_volatility: int
    days_without_volatility: tuple[date, ...]
    failed_check_days: tuple[date, ...]


@dataclass(frozen=True)
class _PerDay:
    und_present: npt.NDArray[np.int64]
    vol_present: npt.NDArray[np.int64]


def _per_day(md: MarketData) -> _PerDay:
    cached = md.cache.get("gaps")
    if isinstance(cached, _PerDay):
        return cached
    nd = len(md.days)
    und = np.bincount(md.day_id, weights=(~np.isnan(md.s_close)).astype(np.float64), minlength=nd).astype(np.int64)
    vol = np.bincount(md.day_id, weights=(~np.isnan(md.v_close)).astype(np.float64), minlength=nd).astype(np.int64)
    result = _PerDay(und, vol)
    md.cache["gaps"] = result
    return result


def inventory(md: MarketData, start: date | None = None, end: date | None = None) -> GapInventory:
    """Missing minutes per series and VIX-less days, for the whole data or a period (inclusive)."""
    per = _per_day(md)
    mask = np.ones(len(md.days), dtype=bool)
    if start is not None:
        mask &= md.days >= date_to_day(start)
    if end is not None:
        mask &= md.days <= date_to_day(end)
    expected = md.instrument.minutes_per_day
    missing_und = int((expected - per.und_present[mask]).sum())
    has_vol = mask & (per.vol_present > 0)
    missing_vol = int((expected - per.vol_present[has_vol]).sum())
    no_vol = tuple(day_to_date(int(d)) for d in md.days[mask & (per.vol_present == 0)])
    lo = date_to_day(start) if start else -(10**9)
    hi = date_to_day(end) if end else 10**9
    failed = tuple(day_to_date(d) for d in sorted(md.failed_check_days) if lo <= d <= hi)
    return GapInventory(missing_und, missing_vol, no_vol, failed)

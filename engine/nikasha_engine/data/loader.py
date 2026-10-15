"""Market data in memory (REQ-DAT-05…13; feature 01 design §2.2).

The underlying and volatility series are joined on the minute. Missing values stay NaN and are
never filled, copied or estimated. A minute is priceable only when both series are present.
Data is loaded once per container and kept in memory.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from threading import Lock

import numpy as np
import numpy.typing as npt
import pyarrow.parquet as pq

from nikasha_engine.core.paths import data_dir
from nikasha_engine.data.checks import REQUIRED_COLUMNS, failed_days
from nikasha_engine.instruments.registry import Instrument

FloatArr = npt.NDArray[np.float64]
IntArr = npt.NDArray[np.int64]
EPOCH = date(1970, 1, 1)

REASON_FAILED_CHECK = "failed data check"


class DataError(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def day_to_date(day_number: int) -> date:
    return EPOCH + timedelta(days=int(day_number))


def date_to_day(d: date) -> int:
    return (d - EPOCH).days


@dataclass(frozen=True)
class Series:
    minutes: IntArr  # minutes since epoch, naive IST
    open: FloatArr
    high: FloatArr
    low: FloatArr
    close: FloatArr


@dataclass
class MarketData:
    """One per instrument. Arrays are indexed by position in `minutes` (union of both series)."""

    instrument: Instrument
    minutes: IntArr
    day_id: npt.NDArray[np.int32]
    tod: npt.NDArray[np.int32]
    s_open: FloatArr
    s_high: FloatArr
    s_low: FloatArr
    s_close: FloatArr
    v_open: FloatArr
    v_close: FloatArr
    priceable: npt.NDArray[np.bool_]
    days: IntArr  # day numbers (days since epoch) of trading days kept, sorted
    day_start: IntArr  # index range per day into `minutes`: [day_start, day_end)
    day_end: IntArr
    grid: npt.NDArray[np.int32]  # [day_id, tod - first_bar] → index into `minutes`, or -1
    excluded_days: dict[date, str]  # failed checks / no volatility (shown in reports)
    failed_check_days: frozenset[int]
    no_vol_days: frozenset[int]
    calendar_days: IntArr  # days in the raw underlying data (before checks), for the expiry calendar
    first_timestamp: int  # minutes since epoch of the first / last underlying bar
    last_timestamp: int
    cache: dict[str, object] = field(default_factory=dict)  # market-derived data only (candles, gaps)

    @property
    def first_date(self) -> date:
        return day_to_date(self.first_timestamp // 1440)

    @property
    def last_date(self) -> date:
        return day_to_date(self.last_timestamp // 1440)

    def day_index(self, d: date) -> int:
        """Position of a date in `days`, or -1 when it is not a kept trading day."""
        n = date_to_day(d)
        i = int(np.searchsorted(self.days, n))
        return i if i < len(self.days) and int(self.days[i]) == n else -1

    def minute_at(self, day_idx: int, tod: int) -> int:
        """Index of the minute at time-of-day `tod` on day `day_idx`, or -1 when missing."""
        slot = tod - self.instrument.first_bar
        if day_idx < 0 or day_idx >= len(self.days) or slot < 0 or slot >= self.grid.shape[1]:
            return -1
        return int(self.grid[day_idx, slot])


def read_series(path: Path) -> Series:
    try:
        table = pq.read_table(path)
    except (OSError, ValueError) as exc:
        raise DataError("DATA_FILE_UNREADABLE") from exc
    if any(c not in table.column_names for c in REQUIRED_COLUMNS):
        raise DataError("DATA_COLUMNS_MISSING")
    ts = table.column("datetime").to_numpy().astype("datetime64[m]").astype(np.int64)

    def col(name: str) -> FloatArr:
        return np.asarray(table.column(name).to_numpy(zero_copy_only=False), dtype=np.float64)

    return Series(ts, col("open"), col("high"), col("low"), col("close"))


def _keep(series: Series, drop_days: set[int]) -> Series:
    if not drop_days:
        return series
    mask = ~np.isin(series.minutes // 1440, np.fromiter(drop_days, dtype=np.int64))
    return Series(series.minutes[mask], series.open[mask], series.high[mask], series.low[mask], series.close[mask])


def build_market_data(inst: Instrument, underlying: Series, volatility: Series | None) -> MarketData:
    """Run the checks, exclude failing days from both series, and join on the minute."""
    if len(underlying.minutes) == 0:
        raise DataError("DATA_EMPTY")
    calendar_days = np.unique(underlying.minutes // 1440)
    bad = failed_days(
        underlying.minutes,
        underlying.open,
        underlying.high,
        underlying.low,
        underlying.close,
        inst.first_bar,
        inst.last_bar,
    )
    if volatility is not None:
        bad |= failed_days(
            volatility.minutes,
            volatility.open,
            volatility.high,
            volatility.low,
            volatility.close,
            inst.first_bar,
            inst.last_bar,
        )
    und = _keep(underlying, bad)
    vol = _keep(volatility, bad) if volatility is not None else None
    if len(und.minutes) == 0:
        raise DataError("DATA_EMPTY")

    days = np.unique(und.minutes // 1440)
    # Only minutes on kept underlying days take part; volatility minutes on other days can't be priced.
    vol_minutes = vol.minutes[np.isin(vol.minutes // 1440, days)] if vol is not None else np.empty(0, np.int64)
    minutes = np.union1d(und.minutes, vol_minutes)
    n = len(minutes)

    def place(src_minutes: IntArr, values: FloatArr) -> FloatArr:
        out = np.full(n, np.nan)
        pos = np.searchsorted(minutes, src_minutes)
        ok = (pos < n) & (minutes[np.minimum(pos, n - 1)] == src_minutes)
        out[pos[ok]] = values[ok]
        return out

    s_open, s_high = place(und.minutes, und.open), place(und.minutes, und.high)
    s_low, s_close = place(und.minutes, und.low), place(und.minutes, und.close)
    if vol is not None:
        vmask = np.isin(vol.minutes // 1440, days)
        v_open = place(vol.minutes[vmask], vol.open[vmask])
        v_close = place(vol.minutes[vmask], vol.close[vmask])
    else:
        v_open = np.full(n, np.nan)
        v_close = np.full(n, np.nan)

    day_of_minute = minutes // 1440
    day_id = np.searchsorted(days, day_of_minute).astype(np.int32)
    tod = (minutes % 1440).astype(np.int32)
    day_start = np.searchsorted(day_of_minute, days, side="left").astype(np.int64)
    day_end = np.searchsorted(day_of_minute, days, side="right").astype(np.int64)

    width = inst.minutes_per_day
    grid = np.full((len(days), width), -1, dtype=np.int32)
    grid[day_id, tod - inst.first_bar] = np.arange(n, dtype=np.int32)

    priceable = ~np.isnan(s_close) & ~np.isnan(v_close)
    vol_present_per_day = np.bincount(day_id, weights=(~np.isnan(v_close)).astype(np.float64), minlength=len(days))
    no_vol = frozenset(int(days[i]) for i in np.flatnonzero(vol_present_per_day == 0))

    excluded: dict[date, str] = {}
    for d in sorted(bad):
        excluded[day_to_date(d)] = REASON_FAILED_CHECK
    for d in sorted(no_vol):
        excluded[day_to_date(d)] = f"no {inst.volatility_name} data"

    return MarketData(
        instrument=inst,
        minutes=minutes,
        day_id=day_id,
        tod=tod,
        s_open=s_open,
        s_high=s_high,
        s_low=s_low,
        s_close=s_close,
        v_open=v_open,
        v_close=v_close,
        priceable=priceable,
        days=days.astype(np.int64),
        day_start=day_start,
        day_end=day_end,
        grid=grid,
        excluded_days=excluded,
        failed_check_days=frozenset(bad),
        no_vol_days=no_vol,
        calendar_days=calendar_days.astype(np.int64),
        first_timestamp=int(und.minutes.min()),
        last_timestamp=int(und.minutes.max()),
    )


_cache: dict[str, MarketData] = {}
_lock = Lock()


def load_market_data(inst: Instrument, folder: Path | None = None) -> MarketData:
    """Load (once per container) and cache the instrument's data (REQ-DAT-08)."""
    key = f"{inst.symbol}:{folder or data_dir()}"
    with _lock:
        if key in _cache:
            return _cache[key]
        root = folder or data_dir()
        und = read_series(root / inst.underlying_file)
        vol = read_series(root / inst.volatility_file) if inst.volatility_file else None
        md = build_market_data(inst, und, vol)
        _cache[key] = md
        return md


def clear_cache() -> None:
    with _lock:
        _cache.clear()

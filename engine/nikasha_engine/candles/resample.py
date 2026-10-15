"""N-minute candles from the 1-minute bars present (REQ-ENG-01, 02; feature 01 design §2.6).

Candles are anchored at the session's first bar each day and never cross days. A bucket with no
underlying minute produces no candle. Volatility candles use the same buckets.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from nikasha_engine.data.loader import MarketData

FloatArr = npt.NDArray[np.float64]
IntArr = npt.NDArray[np.int64]


@dataclass(frozen=True)
class Candles:
    timeframe: int
    day_id: npt.NDArray[np.int32]  # position in MarketData.days
    start_tod: npt.NDArray[np.int32]  # minutes since midnight of the bucket start
    end_tod: npt.NDArray[np.int32]  # nominal end: start + N - 1, capped at the session's last bar
    first_idx: IntArr  # index into MarketData.minutes of the bucket's first minute (any series)
    last_idx: IntArr  # index of the bucket's last underlying minute ("last present")
    end_idx: IntArr  # one past the bucket's last minute (any series), for minute ranges
    open: FloatArr
    high: FloatArr
    low: FloatArr
    close: FloatArr
    v_open: FloatArr  # first present volatility open in the bucket; NaN if none
    v_close: FloatArr  # last present volatility close in the bucket; NaN if none
    end_minute: IntArr  # nominal end as minutes since epoch (the signal time)

    def __len__(self) -> int:
        return len(self.open)


def build_candles(md: MarketData, timeframe: int) -> Candles:
    """Build (and cache per timeframe) the candle series for the whole data."""
    key = f"candles:{timeframe}"
    cached = md.cache.get(key)
    if isinstance(cached, Candles):
        return cached
    inst = md.instrument
    bucket = ((md.tod - inst.first_bar) // timeframe).astype(np.int64)
    key_all = md.day_id.astype(np.int64) * 10_000 + bucket  # sorted, since minutes are sorted

    und = np.flatnonzero(~np.isnan(md.s_close))
    ukey = key_all[und]
    starts = np.flatnonzero(np.r_[True, ukey[1:] != ukey[:-1]])
    ends = np.r_[starts[1:], len(und)] - 1
    first_u, last_u = und[starts], und[ends]
    c_open = md.s_open[first_u]
    c_close = md.s_close[last_u]
    c_high = np.maximum.reduceat(md.s_high[und], starts)
    c_low = np.minimum.reduceat(md.s_low[und], starts)
    ckeys = ukey[starts]

    # Minute ranges of each bucket over the joined minutes (both series).
    lo = np.searchsorted(key_all, ckeys, side="left")
    hi = np.searchsorted(key_all, ckeys, side="right")

    # Volatility candle values: first present open, last present close within the bucket.
    vol = np.flatnonzero(~np.isnan(md.v_close))
    vkey = key_all[vol]
    v_open = np.full(len(ckeys), np.nan)
    v_close = np.full(len(ckeys), np.nan)
    if len(vol):
        vstarts = np.flatnonzero(np.r_[True, vkey[1:] != vkey[:-1]])
        vends = np.r_[vstarts[1:], len(vol)] - 1
        vk = vkey[vstarts]
        pos = np.searchsorted(ckeys, vk)
        ok = (pos < len(ckeys)) & (ckeys[np.minimum(pos, len(ckeys) - 1)] == vk)
        v_open[pos[ok]] = md.v_open[vol[vstarts[ok]]]
        v_close[pos[ok]] = md.v_close[vol[vends[ok]]]

    day_id = md.day_id[first_u]
    b = bucket[first_u]
    start_tod = (inst.first_bar + b * timeframe).astype(np.int32)
    end_tod = np.minimum(start_tod + timeframe - 1, inst.last_bar).astype(np.int32)
    end_minute = md.days[day_id] * 1440 + end_tod
    result = Candles(
        timeframe=timeframe,
        day_id=day_id.astype(np.int32),
        start_tod=start_tod,
        end_tod=end_tod,
        first_idx=lo.astype(np.int64),
        last_idx=last_u.astype(np.int64),
        end_idx=hi.astype(np.int64),
        open=c_open,
        high=c_high,
        low=c_low,
        close=c_close,
        v_open=v_open,
        v_close=v_close,
        end_minute=end_minute.astype(np.int64),
    )
    md.cache[key] = result
    return result

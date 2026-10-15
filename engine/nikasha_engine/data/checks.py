"""Load-time data checks (REQ-DAT-06, 07; feature 01 design §2.3).

A day of a series fails if any of its rows has a missing value, a duplicate or out-of-order
timestamp, a time outside the session, low/high inconsistent with open/close, or a price ≤ 0.
Failing days are returned (never raised) so loading continues.
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt

REQUIRED_COLUMNS = ("datetime", "open", "high", "low", "close")

FloatArr = npt.NDArray[np.float64]


def failed_days(
    minutes: npt.NDArray[np.int64],
    o: FloatArr,
    h: FloatArr,
    lo: FloatArr,
    c: FloatArr,
    first_bar: int,
    last_bar: int,
) -> set[int]:
    """Return the day numbers (days since epoch) that fail any check.

    `minutes` are minutes since the Unix epoch (naive IST), in file order.
    """
    if len(minutes) == 0:
        return set()
    day = minutes // 1440
    tod = minutes % 1440
    bad = np.zeros(len(minutes), dtype=bool)
    bad |= np.isnan(o) | np.isnan(h) | np.isnan(lo) | np.isnan(c)
    bad |= (tod < first_bar) | (tod > last_bar)
    with np.errstate(invalid="ignore"):
        bad |= (o <= 0) | (h <= 0) | (lo <= 0) | (c <= 0)
        bad |= lo > np.minimum(o, c)
        bad |= h < np.maximum(o, c)
    # Sorted and unique: each timestamp must be strictly after the previous one.
    not_increasing = np.zeros(len(minutes), dtype=bool)
    not_increasing[1:] = minutes[1:] <= minutes[:-1]
    bad |= not_increasing
    result = {int(d) for d in np.unique(day[bad])}
    # An out-of-order row also breaks the day it jumped back from.
    if not_increasing.any():
        idx = np.flatnonzero(not_increasing)
        result |= {int(d) for d in np.unique(day[idx - 1])}
    return result

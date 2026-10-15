"""Strike selection (REQ-ENG-16, 17; design §2.10). Strike interval comes from the profile."""

from __future__ import annotations

import math
from collections.abc import Callable

SEARCH_INTERVALS = 20  # delta / premium search: ±20 strike intervals around ATM (decision D6)


def atm_strike(spot: float, interval: float) -> float:
    """Spot rounded to the nearest strike interval; exact halves round up."""
    return interval * math.floor(spot / interval + 0.5)


def moneyness_strike(spot: float, interval: float, moneyness: str, distance: float, is_call: bool) -> float:
    atm = atm_strike(spot, interval)
    if moneyness == "ATM":
        return atm
    itm = moneyness == "ITM"
    # Call ITM = lower strike, call OTM = higher; put ITM = higher, put OTM = lower.
    lower = itm if is_call else not itm
    return atm - distance if lower else atm + distance


def search_strike(spot: float, interval: float, target: float, measure: Callable[[float], float]) -> float | None:
    """Strike among ATM ± 20 intervals whose measure (|delta| or premium) is closest to target.

    Ties go to the strike nearer ATM; between two strikes equally near ATM, the lower one.
    Returns None when no candidate can be measured.
    """
    atm = atm_strike(spot, interval)
    best: tuple[float, int, float] | None = None
    for i in range(SEARCH_INTERVALS + 1):
        for k in (atm,) if i == 0 else (atm - i * interval, atm + i * interval):
            if k <= 0:
                continue
            m = measure(k)
            if math.isnan(m):
                continue
            key = (round(abs(m - target), 12), i, k)
            if best is None or key < best:
                best = key
    return best[2] if best else None

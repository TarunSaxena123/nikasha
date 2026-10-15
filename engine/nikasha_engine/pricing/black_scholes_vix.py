"""Black-Scholes with the volatility index as implied volatility (REQ-ENG-12…14; design §2.9).

σ = max(V + shift, 1) / 100 · T = max(minutes to expiry, 1) / 525,600 (calendar minutes)
r = profile risk-free rate (continuous) · no dividend yield.
Premiums are rounded to the profile tick and floored at one tick.
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt
from scipy.special import ndtr

FloatArr = npt.NDArray[np.float64]
MINUTES_PER_YEAR = 525_600.0


def round_to_tick(price: FloatArr, tick: float) -> FloatArr:
    """Nearest tick (halves up), floored at one tick; 2-decimal clean-up of float noise."""
    with np.errstate(invalid="ignore"):
        r = np.floor(price / tick + 0.5 + 1e-9) * tick
        r = np.maximum(r, tick)
    return np.asarray(np.round(r, 6), dtype=np.float64)


class BlackScholesVIXProvider:
    def __init__(self, risk_free_rate: float, tick_size: float) -> None:
        self.r = risk_free_rate
        self.tick = tick_size

    def _d1_d2(
        self, spot: FloatArr, strike: float, vol: FloatArr, minutes_to_expiry: FloatArr, shift: float
    ) -> tuple[FloatArr, FloatArr, FloatArr]:
        sigma = np.maximum(vol + shift, 1.0) / 100.0
        t = np.maximum(minutes_to_expiry, 1.0) / MINUTES_PER_YEAR
        sq = sigma * np.sqrt(t)
        with np.errstate(divide="ignore", invalid="ignore"):
            d1 = (np.log(spot / strike) + (self.r + 0.5 * sigma * sigma) * t) / sq
        return d1, d1 - sq, t

    def raw_price(
        self, spot: FloatArr, strike: float, vol: FloatArr, minutes_to_expiry: FloatArr, is_call: bool, shift: float
    ) -> FloatArr:
        d1, d2, t = self._d1_d2(spot, strike, vol, minutes_to_expiry, shift)
        disc = strike * np.exp(-self.r * t)
        if is_call:
            p = spot * ndtr(d1) - disc * ndtr(d2)
        else:
            p = disc * ndtr(-d2) - spot * ndtr(-d1)
        return np.asarray(p, dtype=np.float64)

    def price(
        self, spot: FloatArr, strike: float, vol: FloatArr, minutes_to_expiry: FloatArr, is_call: bool, shift: float
    ) -> FloatArr:
        return round_to_tick(self.raw_price(spot, strike, vol, minutes_to_expiry, is_call, shift), self.tick)

    def delta(
        self, spot: FloatArr, strike: float, vol: FloatArr, minutes_to_expiry: FloatArr, is_call: bool, shift: float
    ) -> FloatArr:
        d1, _, _ = self._d1_d2(spot, strike, vol, minutes_to_expiry, shift)
        n = ndtr(d1)
        return np.asarray(n if is_call else n - 1.0, dtype=np.float64)

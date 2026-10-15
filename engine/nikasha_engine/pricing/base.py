"""PricingProvider protocol (backend.md §2). The profile names the provider to use."""

from __future__ import annotations

from typing import Protocol

import numpy as np
import numpy.typing as npt

FloatArr = npt.NDArray[np.float64]


class PricingProvider(Protocol):
    def price(
        self, spot: FloatArr, strike: float, vol: FloatArr, minutes_to_expiry: FloatArr, is_call: bool, shift: float
    ) -> FloatArr:
        """Modelled premium, rounded to the tick and floored at one tick. NaN in → NaN out."""
        ...

    def delta(
        self, spot: FloatArr, strike: float, vol: FloatArr, minutes_to_expiry: FloatArr, is_call: bool, shift: float
    ) -> FloatArr: ...

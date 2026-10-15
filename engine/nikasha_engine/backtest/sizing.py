"""Position size (REQ-ENG-34, 35; backend.md §4.5; design §2.15)."""

from __future__ import annotations

import math
from typing import Any


def lots_for_vix(lots: int, vix_sizing: dict[str, Any] | None, vix: float) -> tuple[int, bool]:
    """Lots to use and whether the 1-lot minimum overrode the rule ("no effect" note).

    Bands: vix_from inclusive, vix_to exclusive; missing edge = open-ended (SEM-12 guarantees cover).
    """
    if not vix_sizing:
        return lots, False
    for band in vix_sizing["bands"]:
        lo = band.get("vix_from", -math.inf)
        hi = band.get("vix_to", math.inf)
        if lo <= vix < hi:
            raw = math.floor(lots * float(band["size_pct"]) / 100.0 + 1e-9)
            if raw < 1:
                return 1, True
            return raw, False
    return lots, False

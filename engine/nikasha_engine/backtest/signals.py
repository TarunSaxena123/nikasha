"""Signals and the run-independent entry checks (REQ-ENG-19…22, 42, 46, 47; design §2.12, §2.13).

A signal is a moment when the strategy's entry conditions (and fixed time, if set) are all true.
Checks that don't depend on the run's state (open position, daily counters) are evaluated once
here and shared by the three runs; the runner applies them in the contract's gate order.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

import numpy as np
import numpy.typing as npt

from nikasha_engine.calendar.expiry import ExpiryCalendar
from nikasha_engine.candles.resample import Candles
from nikasha_engine.conditions.evaluator import Context, evaluate
from nikasha_engine.data.loader import MarketData, date_to_day, day_to_date
from nikasha_engine.instruments.registry import hhmm_to_min

# Gate order = the contract enum order (api.openapi.yaml → skipped.signals[].reason).
GATE_ORDER = (
    "CONFLICTING_SIGNALS",
    "POSITION_OPEN",
    "OUTSIDE_ENTRY_WINDOW",
    "IN_NO_ENTRY_WINDOW",
    "AFTER_EXPIRY_CUTOFF",
    "MAX_TRADES",
    "SL_HITS_LIMIT",
    "MAX_DAILY_LOSS",
    "AFTER_SQUAREOFF",
    "NEXT_DAY_FILL",
    "NO_CONTRACT",
    "EXPIRY_AFTER_DATA_END",
    "UNPRICEABLE",
    "EXIT_LEVELS_UNAVAILABLE",
)


@dataclass(frozen=True)
class Signal:
    side: str  # CE | PE | MULTI | CONFLICT
    signal_minute: int  # epoch minutes: the signal candle's nominal end, or the fixed time
    signal_day: int  # position in MarketData.days
    candle: int  # signal candle index, or -1 for a fixed-time-only entry
    fill_day: int  # position in MarketData.days, or -1 past the data end
    fill_tod: int
    fill_minute: int  # epoch minutes of the fill (even when the minute is missing in the data)
    fill_idx: int  # index into MarketData.minutes, or -1 when missing
    later_day: bool  # the fill is on a later trading day than the signal
    spot: float  # spot used for strike selection
    spot_vol: float  # volatility at the strike-selection moment (NaN if missing)
    spot_minute: int  # epoch minute of the strike-selection moment
    expiry: date | None  # contract expiry resolved from the fill date (None: no contract)
    early_reason: str | None  # first failing of gates 3–5 (run-independent)
    late_reason: str | None  # first failing of gates 9–13 (run-independent)


def _in_windows(tod: int, windows: list[dict[str, str]]) -> bool:
    return any(hhmm_to_min(w["from"]) <= tod < hhmm_to_min(w["to"]) for w in windows)


def generate_signals(
    md: MarketData,
    candles: Candles,
    cal: ExpiryCalendar,
    strategy: dict[str, Any],
    start: date,
    end: date,
) -> list[Signal]:
    inst = md.instrument
    entry: dict[str, Any] = strategy["entry"]
    legs: list[dict[str, Any]] = strategy["legs"]
    adv: dict[str, Any] = strategy.get("advanced") or {}
    intraday = strategy["holding"] == "INTRADAY"
    expiry_kind = legs[0]["expiry"]
    multi = len(legs) > 1
    leg_type = legs[0]["option_type"]

    ctx = Context(candles, strategy["indicators"])
    n = len(candles)
    true = np.ones(n, dtype=bool)

    def tree(key: str) -> npt.NDArray[np.bool_] | None:
        return evaluate(entry[key], ctx) if key in entry else None

    ce, pe, all_legs = tree("ce"), tree("pe"), tree("all_legs")
    has_conditions = any(x is not None for x in (ce, pe, all_legs))

    # Per-candle side: for a SIGNAL leg, CE and PE trees; otherwise the AND of every applicable tree.
    side_ce = np.zeros(n, dtype=bool)
    side_pe = np.zeros(n, dtype=bool)
    side_multi = np.zeros(n, dtype=bool)
    if multi:
        side_multi = all_legs if all_legs is not None else true.copy()
    elif leg_type == "SIGNAL":
        side_ce = ce if ce is not None else np.zeros(n, dtype=bool)
        side_pe = pe if pe is not None else np.zeros(n, dtype=bool)
    else:
        cond = true.copy()
        own = ce if leg_type == "CE" else pe
        for t in (own, all_legs):
            if t is not None:
                cond &= t
        if leg_type == "CE":
            side_ce = cond
        else:
            side_pe = cond

    start_day, end_day = date_to_day(start), date_to_day(end)
    days = md.days
    first_d = int(np.searchsorted(days, start_day, side="left"))
    last_d = int(np.searchsorted(days, end_day, side="right")) - 1

    raw: list[tuple[str, int, int, int, int, float, float, int]] = []
    # (side, signal_minute, signal_day, candle, fill_tod / -1 for candle-next, spot, vol, spot_minute)
    at_time = entry.get("at_time")
    if at_time is None:
        cday = candles.day_id
        in_period = (cday >= first_d) & (cday <= last_d)
        any_side = (side_ce | side_pe | side_multi) & in_period
        for c_np in np.flatnonzero(any_side):
            c = int(c_np)
            if multi:
                side = "MULTI"
            elif side_ce[c] and side_pe[c]:
                side = "CONFLICT"
            else:
                side = "CE" if side_ce[c] else "PE"
            spot_minute = int(md.minutes[candles.last_idx[c]])
            raw.append(
                (
                    side,
                    int(candles.end_minute[c]),
                    int(cday[c]),
                    c,
                    -1,
                    float(candles.close[c]),
                    float(candles.v_close[c]),
                    spot_minute,
                )
            )
    else:
        tod = hhmm_to_min(at_time)
        for d in range(first_d, last_d + 1):
            if has_conditions:
                lo = int(np.searchsorted(candles.day_id, d, side="left"))
                hi = int(np.searchsorted(candles.day_id, d, side="right"))
                cands = [c for c in range(lo, hi) if candles.end_tod[c] < tod]
                if not cands:
                    continue
                c = cands[-1]
                if multi:
                    if not side_multi[c]:
                        continue
                    side = "MULTI"
                elif side_ce[c] and side_pe[c]:
                    side = "CONFLICT"
                elif side_ce[c] or side_pe[c]:
                    side = "CE" if side_ce[c] else "PE"
                else:
                    continue
                spot_minute = int(md.minutes[candles.last_idx[c]])
                raw.append(
                    (
                        side,
                        int(days[d]) * 1440 + tod,
                        d,
                        c,
                        tod,
                        float(candles.close[c]),
                        float(candles.v_close[c]),
                        spot_minute,
                    )
                )
            else:
                side = "MULTI" if multi else leg_type
                idx = md.minute_at(d, tod)
                spot = float(md.s_open[idx]) if idx >= 0 else float("nan")
                vol = float(md.v_open[idx]) if idx >= 0 else float("nan")
                raw.append((side, int(days[d]) * 1440 + tod, d, -1, tod, spot, vol, int(days[d]) * 1440 + tod))

    entry_windows = adv.get("entry_windows") or []
    no_entry_windows = adv.get("no_entry_windows") or []
    cutoff = hhmm_to_min(adv["expiry_day_cutoff"]) if adv.get("expiry_day_cutoff") else None
    last_data_day = md.last_date
    out: list[Signal] = []
    for side, sig_min, sig_day, c, fixed_tod, spot, vol, spot_minute in raw:
        if fixed_tod >= 0:
            fill_day, fill_tod, later = sig_day, fixed_tod, False
        else:
            end_tod = int(candles.end_tod[c])
            if end_tod + 1 <= inst.last_bar:
                fill_day, fill_tod, later = sig_day, end_tod + 1, False
            else:
                fill_day, fill_tod, later = sig_day + 1, inst.first_bar, True
        if fill_day < len(days):
            fill_date = day_to_date(int(days[fill_day]))
            fill_idx = md.minute_at(fill_day, fill_tod)
            fill_minute = int(days[fill_day]) * 1440 + fill_tod
        else:
            fill_date = day_to_date(int(days[-1]) + 1)
            fill_idx, fill_day = -1, -1
            fill_minute = int(days[-1] + 1) * 1440 + fill_tod
        expiry = cal.contract(expiry_kind, fill_date)

        early: str | None = None
        if entry_windows and not _in_windows(fill_tod, entry_windows):
            early = "OUTSIDE_ENTRY_WINDOW"
        elif no_entry_windows and _in_windows(fill_tod, no_entry_windows):
            early = "IN_NO_ENTRY_WINDOW"
        elif cutoff is not None and expiry is not None and expiry == fill_date and fill_tod >= cutoff:
            early = "AFTER_EXPIRY_CUTOFF"

        late: str | None = None
        if intraday and (later or fill_tod >= inst.squareoff):
            late = "AFTER_SQUAREOFF"
        elif not intraday and later:
            late = "NEXT_DAY_FILL"
        elif expiry is None:
            late = "NO_CONTRACT"
        elif not intraday and expiry > last_data_day:
            late = "EXPIRY_AFTER_DATA_END"
        elif fill_idx < 0 or not bool(md.priceable[fill_idx]) or np.isnan(spot):
            late = "UNPRICEABLE"

        out.append(
            Signal(
                side,
                sig_min,
                sig_day,
                c,
                fill_day,
                fill_tod,
                fill_minute,
                fill_idx,
                later,
                spot,
                vol,
                spot_minute,
                expiry,
                early,
                late,
            )
        )
    out.sort(key=lambda s: (s.signal_minute, s.candle))
    return out

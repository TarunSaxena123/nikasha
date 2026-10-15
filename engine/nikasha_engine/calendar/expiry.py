"""Expiry calendar (REQ-DAT-14…18, REQ-ENG-18; feature 01 design §2.5; product.md §7.4).

Expiry dates come only from the profile's dated rules and the trading days in the data:
trading days = days in the underlying data ∪ the profile's extra trading days. A scheduled
expiry that is not a trading day moves to the previous trading day. No external holiday list.
"""

from __future__ import annotations

import bisect
import calendar as std_calendar
from dataclasses import dataclass
from datetime import date, timedelta

from nikasha_engine.instruments.registry import Instrument

HORIZON_DAYS = 60  # scheduled dates are generated this far past the data, for the data-end check


@dataclass(frozen=True)
class ExpiryCalendar:
    weekly: tuple[date, ...]  # weekly ∪ monthly expiries on or after weekly availability
    monthly: tuple[date, ...]
    shifted: tuple[tuple[date, date, str], ...]  # (scheduled, actual, 'W'|'M') for holiday shifts
    weekly_available_from: date
    monthly_available_from: date
    last_data_day: date

    def contract(self, kind: str, d: date) -> date | None:
        """Expiry date of the contract for `kind` traded on date `d`, or None when none exists."""
        if kind in ("CURRENT_WEEKLY", "NEXT_WEEKLY"):
            if d < self.weekly_available_from:
                return None
            i = bisect.bisect_left(self.weekly, d)
            i += 1 if kind == "NEXT_WEEKLY" else 0
            return self.weekly[i] if i < len(self.weekly) else None
        if kind == "MONTHLY":
            if d < self.monthly_available_from:
                return None
            i = bisect.bisect_left(self.monthly, d)
            return self.monthly[i] if i < len(self.monthly) else None
        raise ValueError(kind)

    def is_expiry_day(self, d: date) -> bool:
        i = bisect.bisect_left(self.weekly, d)
        if i < len(self.weekly) and self.weekly[i] == d:
            return True
        j = bisect.bisect_left(self.monthly, d)
        return j < len(self.monthly) and self.monthly[j] == d


def _weekdays_between(start: date, end: date, weekday: int) -> list[date]:
    first = start + timedelta(days=(weekday - start.weekday()) % 7)
    out = []
    d = first
    while d <= end:
        out.append(d)
        d += timedelta(days=7)
    return out


def _last_weekday_of_month(year: int, month: int, weekday: int) -> date:
    last = date(year, month, std_calendar.monthrange(year, month)[1])
    return last - timedelta(days=(last.weekday() - weekday) % 7)


def build_calendar(inst: Instrument, data_days: list[date]) -> ExpiryCalendar:
    """Build the calendar from the profile rules and the trading days present in the data."""
    trading = sorted(set(data_days) | set(inst.extra_trading_days))
    last_data_day = max(data_days)
    horizon = last_data_day + timedelta(days=HORIZON_DAYS)

    def actual(scheduled: date) -> date:
        if scheduled > last_data_day:
            return scheduled  # holidays beyond the data are unknown
        i = bisect.bisect_right(trading, scheduled) - 1
        return trading[i] if i >= 0 else scheduled

    weekly_set: set[date] = set()
    monthly_set: set[date] = set()
    shifted: list[tuple[date, date, str]] = []
    for rule in inst.expiry_rules:
        end = min(rule.valid_to, horizon) if rule.valid_to else horizon
        if rule.kind == "MONTHLY":
            scheduled = []
            y, m = rule.valid_from.year, rule.valid_from.month
            while date(y, m, 1) <= end:
                s = _last_weekday_of_month(y, m, rule.weekday)
                if rule.valid_from <= s <= end:
                    scheduled.append(s)
                y, m = (y + 1, 1) if m == 12 else (y, m + 1)
        else:
            scheduled = _weekdays_between(rule.valid_from, end, rule.weekday)
        for s in scheduled:
            a = actual(s)
            (monthly_set if rule.kind == "MONTHLY" else weekly_set).add(a)
            if a != s:
                shifted.append((s, a, "M" if rule.kind == "MONTHLY" else "W"))

    weekly_from = inst.periods["WEEKLY"].available_from
    monthly_from = inst.periods["MONTHLY"].available_from
    weekly = tuple(sorted(d for d in (weekly_set | monthly_set) if d >= weekly_from))
    monthly = tuple(sorted(monthly_set))
    # A shifted date counts once; weekly shifts only matter from weekly availability.
    shifted_unique = sorted(
        {(s, a, k) for s, a, k in shifted if k == "M" or a >= weekly_from},
        key=lambda x: x[0],
    )
    # When a weekly and a monthly rule schedule the same date, report it once, as monthly.
    seen: dict[date, tuple[date, date, str]] = {}
    for s, a, k in shifted_unique:
        if s not in seen or k == "M":
            seen[s] = (s, a, k)
    return ExpiryCalendar(
        weekly=weekly,
        monthly=monthly,
        shifted=tuple(sorted(seen.values())),
        weekly_available_from=weekly_from,
        monthly_available_from=monthly_from,
        last_data_day=last_data_day,
    )

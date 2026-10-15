"""REQ-DAT-14…18, REQ-ENG-18 (AC-DAT-08, 09): the expiry calendar equals the recorded check."""

from __future__ import annotations

import re
from datetime import date

import pytest

from conftest import REPO, synth, weekdays
from nikasha_engine.backtest.runner import get_calendar
from nikasha_engine.calendar.expiry import build_calendar
from nikasha_engine.data.loader import day_to_date

CHECK = (REPO / "specs" / "features" / "01-data-and-engine" / "expiry-calendar-check.md").read_text()


def _recorded_shifts() -> list[tuple[date, date, str]]:
    rows = re.findall(r"^\| (\d{4}-\d{2}-\d{2}) \w{3} \| (\d{4}-\d{2}-\d{2}) \w{3} \| ([WM]) \|", CHECK, re.M)
    return [(date.fromisoformat(a), date.fromisoformat(b), k) for a, b, k in rows]


@pytest.mark.realdata
def test_calendar_equals_record(real_md):
    """AC-DAT-08: counts, first/last dates and all 21 shifted dates."""
    cal = get_calendar(real_md)
    last = real_md.last_date
    monthly = [d for d in cal.monthly if d <= last]
    weekly = [d for d in cal.weekly if d <= last]
    assert len(monthly) == 136
    assert len(weekly) == 379 and weekly[0] == date(2019, 2, 14)
    assert max(d for d in weekly if d.weekday() == 3) == date(2025, 8, 28)
    assert min(d for d in weekly if d.weekday() == 1) == date(2025, 9, 2)
    assert [d for d in monthly if date(2025, 7, 1) <= d <= date(2025, 10, 31)] == [
        date(2025, 7, 31),
        date(2025, 8, 28),
        date(2025, 9, 30),
        date(2025, 10, 28),
    ]
    recorded = _recorded_shifts()
    assert len(recorded) == 21
    assert [s for s in cal.shifted if s[1] <= last] == recorded


@pytest.mark.realdata
def test_extra_trading_days_shift_nothing(real_md, nifty):
    """2021-02-24 and 2026-05-15 are trading days, and on this data they change no expiry."""
    days = [day_to_date(int(d)) for d in real_md.calendar_days]
    with_extra = build_calendar(nifty, days)
    from dataclasses import replace

    without = build_calendar(replace(nifty, extra_trading_days=()), days)
    assert with_extra.weekly == without.weekly and with_extra.monthly == without.monthly
    assert date(2021, 2, 25) in with_extra.weekly


def test_holiday_moves_expiry_to_previous_trading_day(nifty):
    days = [d for d in weekdays(date(2024, 8, 5), 10) if d != date(2024, 8, 15)]
    cal = get_calendar(synth(nifty, days))
    assert date(2024, 8, 14) in cal.weekly and date(2024, 8, 15) not in cal.weekly


def test_contract_lookup(nifty):
    md = synth(nifty, weekdays(date(2024, 5, 20), 20))
    cal = get_calendar(md)
    assert cal.contract("CURRENT_WEEKLY", date(2024, 5, 27)) == date(2024, 5, 30)  # monthly week
    assert cal.contract("NEXT_WEEKLY", date(2024, 5, 27)) == date(2024, 6, 6)  # the one after the monthly
    assert cal.contract("MONTHLY", date(2024, 5, 31)) == date(2024, 6, 27)
    assert cal.contract("CURRENT_WEEKLY", date(2024, 5, 30)) == date(2024, 5, 30)  # expiry day itself
    assert cal.is_expiry_day(date(2024, 5, 30))


def test_weekly_unavailable_before_launch(nifty):
    """REQ-DAT-18: no weekly contract before 2019-02-11."""
    md = synth(nifty, weekdays(date(2019, 1, 28), 15))
    cal = get_calendar(md)
    assert cal.contract("CURRENT_WEEKLY", date(2019, 2, 8)) is None
    assert cal.contract("CURRENT_WEEKLY", date(2019, 2, 11)) == date(2019, 2, 14)
    assert cal.contract("MONTHLY", date(2019, 2, 8)) == date(2019, 2, 28)


def test_weekly_period_before_launch_fails_sem13(nifty):
    """AC-DAT-09."""
    from conftest import strategy
    from nikasha_engine.validation.semantic import DataRange, semantic_problems

    probs = semantic_problems(
        strategy("simple-trend-follower"),
        {"NIFTY50": nifty},
        {"period": {"start": "2018-06-01", "end": "2019-06-01"}},
        DataRange(date(2015, 1, 9), date(2026, 5, 14)),
    )
    assert [p.rule for p in probs] == ["SEM-13"]
    assert "11 Feb 2019" in probs[0].message

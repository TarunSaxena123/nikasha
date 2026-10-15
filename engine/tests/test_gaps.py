"""REQ-DAT-10…13: gaps are counted, never filled; VIX-less minutes and days are unpriceable."""

from __future__ import annotations

import json
from datetime import date

import numpy as np
import pytest

from conftest import REPO, run, settings, single_leg, synth, t, weekdays
from nikasha_engine.data.gaps import inventory

DAYS = weekdays(date(2024, 6, 3), 3)


def test_minute_without_vix_is_never_priced(nifty):
    """AC-DAT-05: a minute with Nifty data and no VIX gets no entry, exit or fill."""
    md = synth(nifty, DAYS, vix=lambda d, tod: None if (d == 0 and tod == t("10:00")) else 15.0)
    i = md.minute_at(0, t("10:00"))
    assert i >= 0 and not md.priceable[i] and np.isnan(md.v_close[i])
    res = run(md, single_leg(), settings("2024-06-03", "2024-06-05"))
    assert res.skipped.get("UNPRICEABLE") == 1  # the 10:00 entry on day 0 is not taken, not moved
    assert all(tr.entry_minute % 1440 == t("10:00") for tr in res.trades)
    assert len(res.trades) == 2


def test_gap_inventory_counts_missing_minutes(nifty):
    md = synth(
        nifty,
        DAYS,
        spot=lambda d, tod: None if (d == 1 and tod in (t("11:00"), t("11:01"))) else (100, 100, 100, 100),
        vix=lambda d, tod: None if d == 2 else (None if (d == 0 and tod == t("12:00")) else 15.0),
    )
    g = inventory(md)
    assert g.missing_underlying == 2
    assert g.missing_volatility == 1  # day 2 has no VIX at all, so only day 0/1 count
    assert g.days_without_volatility == (DAYS[2],)
    assert md.excluded_days == {DAYS[2]: "no India VIX data"}
    assert inventory(md, DAYS[0], DAYS[0]).missing_underlying == 0


def test_no_trades_on_vix_less_day(nifty):
    md = synth(nifty, DAYS, vix=lambda d, tod: None if d == 1 else 15.0)
    res = run(md, single_leg(), settings("2024-06-03", "2024-06-05"))
    assert {tr.entry_date for tr in res.trades} == {DAYS[0], DAYS[2]}
    assert res.data_days == [(DAYS[1], "no India VIX data")]


@pytest.mark.realdata
def test_whole_data_inventory_matches_cleaning_report(real_md):
    """AC-DAT-07: 184 / 183 / 2019-07-02, as in data/cleaning_report.json."""
    report = json.loads((REPO / "data" / "cleaning_report.json").read_text())
    g = inventory(real_md)
    assert g.missing_underlying == report["nifty50"]["missing_minutes_total"] == 184
    assert g.missing_volatility == report["indiavix"]["missing_minutes_total"] == 183
    assert g.days_without_volatility == (date(2019, 7, 2),)


@pytest.mark.realdata
def test_2019_07_02_is_skipped(real_md, nifty):
    """AC-DAT-06."""
    from conftest import default_costs, strategy
    from nikasha_engine.backtest.runner import run_all

    base, _, _ = run_all(
        real_md, strategy("simple-trend-follower"), settings("2019-06-24", "2019-07-12", default_costs(nifty))
    )
    assert date(2019, 7, 2) not in {tr.entry_date for tr in base.trades}
    assert (date(2019, 7, 2), "no India VIX data") in base.data_days

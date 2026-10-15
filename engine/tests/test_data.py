"""REQ-DAT-05…09: Parquet conversion, load-time checks (whole bad days excluded), range from the data."""

from __future__ import annotations

import subprocess
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from conftest import REPO, synth, weekdays
from nikasha_engine.data.loader import REASON_FAILED_CHECK, Series, build_market_data, date_to_day, read_series

DAYS = weekdays(date(2024, 6, 3), 3)


def _series_from(md_inst, rows):
    m = np.array([r[0] for r in rows], dtype=np.int64)
    return Series(m, *(np.array([r[i] for r in rows], dtype=float) for i in range(1, 5)))


def _day_rows(inst, d, price=100.0):
    base = date_to_day(d) * 1440
    return [(base + tod, price, price + 1, price - 1, price) for tod in range(inst.first_bar, inst.last_bar + 1)]


BREAKERS = {
    "high_below_close": lambda r: (r[0], r[1], r[4] - 0.5, r[3], r[4]),
    "low_above_open": lambda r: (r[0], r[1], r[2], r[1] + 0.5, r[4]),
    "non_positive_price": lambda r: (r[0], 0.0, r[2], r[3], r[4]),
    "missing_value": lambda r: (r[0], np.nan, r[2], r[3], r[4]),
    "outside_session": lambda r: ((r[0] // 1440) * 1440 + 8 * 60, r[1], r[2], r[3], r[4]),
}


@pytest.mark.parametrize("kind", sorted(BREAKERS))
def test_bad_day_is_excluded_and_others_load(nifty, kind):
    """AC-DAT-03: one broken bar excludes its whole day, reported as 'failed data check'; no crash."""
    rows = []
    for d in DAYS:
        rows += _day_rows(nifty, d)
    bad_day = DAYS[1]
    i = next(k for k, r in enumerate(rows) if r[0] // 1440 == date_to_day(bad_day)) + 30
    rows[i] = BREAKERS[kind](rows[i])
    rows.sort(key=lambda r: r[0])
    und = _series_from(nifty, rows)
    vol = _series_from(nifty, [r for r in rows if r[0] // 1440 != date_to_day(bad_day)] + _day_rows(nifty, bad_day, 15))
    vol = Series(np.sort(vol.minutes), vol.open, vol.high, vol.low, vol.close)
    md = build_market_data(nifty, und, vol)
    assert md.excluded_days == {bad_day: REASON_FAILED_CHECK}
    assert [date_to_day(d) for d in (DAYS[0], DAYS[2])] == md.days.tolist()


def test_duplicate_timestamp_excludes_day(nifty):
    rows = _day_rows(nifty, DAYS[0]) + _day_rows(nifty, DAYS[1])
    rows.insert(50, rows[50])
    und = _series_from(nifty, rows)
    md = build_market_data(nifty, und, und)
    assert DAYS[0] in md.excluded_days and DAYS[1] not in md.excluded_days


def test_failing_volatility_day_excluded_from_both_series(nifty):
    und_rows = _day_rows(nifty, DAYS[0]) + _day_rows(nifty, DAYS[1])
    vol_rows = _day_rows(nifty, DAYS[0], 15) + _day_rows(nifty, DAYS[1], 15)
    vol_rows[400] = (vol_rows[400][0], -1.0, 16, 14, 15)
    md = build_market_data(nifty, _series_from(nifty, und_rows), _series_from(nifty, vol_rows))
    assert md.days.tolist() == [date_to_day(DAYS[0])]


def test_range_read_from_the_data(nifty, tmp_path: Path):
    """AC-DAT-04 (fixture part): a file with other dates gives those other dates."""
    md = synth(nifty, [date(2020, 3, 2), date(2020, 3, 3)])
    assert md.first_date == date(2020, 3, 2) and md.last_date == date(2020, 3, 3)
    assert md.first_timestamp % 1440 == nifty.first_bar and md.last_timestamp % 1440 == nifty.last_bar


@pytest.mark.realdata
def test_real_data_range(real_md):
    """AC-DAT-04 (real data)."""
    assert real_md.first_date == date(2015, 1, 9) and real_md.last_date == date(2026, 5, 14)
    assert real_md.first_timestamp % 1440 == 9 * 60 + 15 and real_md.last_timestamp % 1440 == 15 * 60 + 29


def test_csv_to_parquet_round_trip(tmp_path: Path):
    """REQ-DAT-05: row counts and dtypes equal the CSV."""
    csv = tmp_path / "sample_1min_clean.csv"
    csv.write_text(
        "datetime,open,high,low,close\n2024-01-01 09:15:00,1.5,2.0,1.0,1.75\n2024-01-01 09:16:00,1.75,2.5,1.5,2.0\n"
    )
    out = tmp_path / "out"
    subprocess.run(
        [sys.executable, str(REPO / "engine" / "scripts" / "csv_to_parquet.py"), str(tmp_path), str(out)],
        check=True,
        capture_output=True,
    )
    pq = out / "sample_1min.parquet"
    df = pd.read_parquet(pq)
    assert len(df) == 2 and str(df["datetime"].dtype) == "datetime64[us]" and df["close"].dtype == np.float64
    s = read_series(pq)
    assert s.close.tolist() == [1.75, 2.0]


def test_data_loaded_once_per_container(nifty, tmp_path: Path, monkeypatch):
    """REQ-DAT-08: the second load returns the cached object."""
    from nikasha_engine.data import loader

    calls = []
    real = loader.read_series
    monkeypatch.setattr(loader, "read_series", lambda p: calls.append(p) or real(p))
    csv = tmp_path / "x_clean.csv"
    csv.write_text("datetime,open,high,low,close\n2024-01-01 09:15:00,1,1,1,1\n")
    subprocess.run(
        [sys.executable, str(REPO / "engine" / "scripts" / "csv_to_parquet.py"), str(tmp_path), str(tmp_path)],
        check=True,
        capture_output=True,
    )
    for name in ("nifty50_1min.parquet", "indiavix_1min.parquet"):
        (tmp_path / name).write_bytes((tmp_path / "x.parquet").read_bytes())
    loader.clear_cache()
    a = loader.load_market_data(nifty, tmp_path)
    b = loader.load_market_data(nifty, tmp_path)
    loader.clear_cache()
    assert a is b and len(calls) == 2

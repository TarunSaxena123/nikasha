"""REQ-ENG-45 (AC-ENG-24): performance budgets from backend.md §8, on the reference machine.

Run: pytest -m perf tests/perf   (excluded from the default run; needs the real Parquet data)
"""

from __future__ import annotations

import json
import time

import pytest

from conftest import default_costs, strategy
from nikasha_engine.core import api
from nikasha_engine.data.loader import clear_cache

pytestmark = [pytest.mark.perf, pytest.mark.realdata]


def _req(name: str, nifty, start: str, end: str, **over) -> bytes:
    s = strategy(name)
    s.update(over)
    return json.dumps(
        {"strategy": s, "settings": {"period": {"start": start, "end": end}, "costs": default_costs(nifty)}}
    ).encode()


def test_cold_start_under_8s(real_md):
    clear_cache()
    t0 = time.perf_counter()
    api.init(force=True)
    assert time.perf_counter() - t0 <= 8.0


def test_meta_warm_under_200ms(real_md):
    api.init()
    api.dispatch("GET", "/v1/meta")
    t0 = time.perf_counter()
    assert api.dispatch("GET", "/v1/meta")[0] == 200
    assert time.perf_counter() - t0 <= 0.2


def test_15min_full_weekly_period_under_30s(real_md, nifty):
    api.init()
    t0 = time.perf_counter()
    status, _ = api.dispatch("POST", "/v1/evaluate", _req("simple-trend-follower", nifty, "2019-02-11", "2026-05-14"))
    elapsed = time.perf_counter() - t0
    assert status == 200 and elapsed <= 30.0, elapsed


def test_1min_full_period_under_60s(real_md, nifty):
    api.init()
    t0 = time.perf_counter()
    status, _ = api.dispatch(
        "POST", "/v1/evaluate", _req("one-line-sample-with-answers", nifty, "2019-02-11", "2026-05-14", timeframe_min=1)
    )
    elapsed = time.perf_counter() - t0
    assert status == 200 and elapsed <= 60.0, elapsed

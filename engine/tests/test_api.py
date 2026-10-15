"""REQ-DAT-19, REQ-ENG-37, 41 and feature 07 T-PRV-06: the engine's request wrapper."""

from __future__ import annotations

import io
import json

import pytest

import nikasha_log
from conftest import default_costs, strategy
from contract_helpers import assert_valid
from nikasha_engine.core import api

MARKER = "NIKASHA-PRIVACY-MARKER-7f3a"


@pytest.fixture()
def logs():
    buf = io.StringIO()
    nikasha_log.set_stream(buf)
    yield buf
    nikasha_log.set_stream(None)


def body(**kw) -> bytes:
    return json.dumps(kw).encode()


@pytest.mark.realdata
def test_meta_validates_and_reads_dates_from_data(real_md, logs):
    """AC-DAT-04, REQ-DAT-19."""
    status, out = api.dispatch("GET", "/v1/meta")
    assert status == 200
    assert_valid("MetaResponse", out)
    inst = out["instruments"][0]
    assert inst["data_range"] == {"first": "2015-01-09T09:15", "last": "2026-05-14T15:29"}
    assert inst["data_gaps"] == {
        "days_without_volatility": ["2019-07-02"],
        "minutes_missing_underlying": 184,
        "minutes_missing_volatility": 183,
    }
    weekly = next(k for k in inst["expiry_kinds"] if k["kind"] == "WEEKLY")
    assert weekly["default_period"] == {"start": "2019-02-11", "end": "2026-05-14"}


@pytest.mark.realdata
def test_missing_slippage_is_422_with_no_default(real_md, nifty, logs):
    """AC-ENG-20."""
    costs = default_costs(nifty)
    del costs["slippage_pts"]
    s = strategy("simple-trend-follower")
    status, out = api.dispatch(
        "POST",
        "/v1/evaluate",
        body(strategy=s, settings={"period": {"start": "2024-01-01", "end": "2024-03-31"}, "costs": costs}),
    )
    assert status == 422 and out["error"]["code"] == "VALIDATION_FAILED"
    assert_valid("Error", out)
    assert any(p["field_label"] == "Costs" for p in out["error"]["problems"])


@pytest.mark.realdata
def test_validation_failure_logs_code_only(real_md, nifty, logs):
    s = strategy("simple-trend-follower")
    s["name"] = MARKER
    s["legs"][0]["strike"] = {"method": "MONEYNESS", "moneyness": "ITM", "distance_pts": 75}
    status, out = api.dispatch(
        "POST",
        "/v1/evaluate",
        body(
            strategy=s, settings={"period": {"start": "2024-01-01", "end": "2024-03-31"}, "costs": default_costs(nifty)}
        ),
    )
    assert status == 422 and out["error"]["problems"][0]["rule"] == "SEM-06"
    text = logs.getvalue()
    assert MARKER not in text and "ITM" not in text and "SEM-06" not in text
    assert json.loads(text.splitlines()[-1])["code"] == "VALIDATION_FAILED"


@pytest.mark.realdata
def test_period_outside_data_is_period_invalid(real_md, nifty, logs):
    s = strategy("simple-trend-follower")
    status, out = api.dispatch(
        "POST",
        "/v1/evaluate",
        body(
            strategy=s, settings={"period": {"start": "2024-01-01", "end": "2031-01-01"}, "costs": default_costs(nifty)}
        ),
    )
    assert status == 422 and out["error"]["code"] == "PERIOD_INVALID"
    assert "9 Jan 2015" in out["error"]["problems"][0]["message"]


def test_bad_json_and_large_body(logs):
    assert api.dispatch("POST", "/v1/evaluate", b"{not json")[0] == 400
    assert api.dispatch("POST", "/v1/evaluate", b"x" * 1_000_001)[0] == 413
    assert api.dispatch("GET", "/v1/unknown")[0] == 404


def test_unexpected_exception_is_500_and_logs_type_only(logs, monkeypatch):
    monkeypatch.setenv("NIKASHA_FAULT_INJECTION", "1")
    status, out = api.dispatch("POST", "/v1/__fault", body(marker=MARKER))
    assert status == 500 and out == {
        "error": {"code": "ENGINE_ERROR", "message": "Something went wrong while evaluating. Please try again."}
    }
    text = logs.getvalue()
    assert MARKER not in text
    rec = json.loads(text.splitlines()[-1])
    assert rec["exc_type"] == "RuntimeError" and "api.py" in rec["exc_where"]


def test_fault_route_absent_without_flag(logs, monkeypatch):
    monkeypatch.delenv("NIKASHA_FAULT_INJECTION", raising=False)
    assert api.dispatch("POST", "/v1/__fault", body(marker="x"))[0] == 404


def test_http_adapter(logs):
    from starlette.testclient import TestClient

    from nikasha_engine.adapters.http_app import app

    client = TestClient(app)
    r = client.options("/v1/evaluate")
    assert r.status_code == 204 and r.headers["access-control-allow-origin"] == "*"
    r = client.post("/v1/evaluate", content=b"{bad")
    assert r.status_code == 400 and r.json()["error"]["code"] == "BAD_REQUEST"

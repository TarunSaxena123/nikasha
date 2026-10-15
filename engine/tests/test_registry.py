"""REQ-DAT-01…03 (AC-DAT-01): profiles are validated at start-up; an invalid one stops serving."""

from __future__ import annotations

import copy
import io
import json
from pathlib import Path

import pytest

import nikasha_log
from conftest import nifty_profile
from nikasha_engine.core import api
from nikasha_engine.instruments.registry import RegistryError, build_instrument, load_registry


def test_nifty_profile_loads(nifty):
    assert nifty.symbol == "NIFTY50"
    assert nifty.strike_interval == 50 and nifty.tick_size == 0.05
    assert nifty.first_bar == 9 * 60 + 15 and nifty.squareoff == 15 * 60 + 15


def test_profile_missing_strike_interval_is_rejected():
    profile = nifty_profile()
    del profile["contract"]["strike_interval"]
    with pytest.raises(RegistryError) as err:
        build_instrument(profile)
    assert err.value.code == "PROFILE_INVALID"


def test_invalid_profile_refuses_requests_and_logs_only_a_code(tmp_path: Path, monkeypatch):
    """AC-DAT-01: the engine refuses requests and logs only an error code."""
    profile = nifty_profile()
    del profile["contract"]["strike_interval"]
    (tmp_path / "nifty50.json").write_text(json.dumps(profile))
    monkeypatch.setenv("NIKASHA_INSTRUMENTS_DIR", str(tmp_path))
    out = io.StringIO()
    nikasha_log.set_stream(out)
    try:
        api.init(force=True)
        status, body = api.dispatch("GET", "/v1/meta")
    finally:
        nikasha_log.set_stream(None)
        monkeypatch.delenv("NIKASHA_INSTRUMENTS_DIR")
        api.init(force=True)
    assert status == 500 and body["error"]["code"] == "ENGINE_ERROR"
    lines = [json.loads(x) for x in out.getvalue().splitlines()]
    assert any(x.get("code") == "PROFILE_INVALID" for x in lines)
    assert "strike_interval" not in out.getvalue() and "Nifty" not in out.getvalue()


def test_duplicate_symbol_rejected(tmp_path: Path):
    for name in ("a.json", "b.json"):
        (tmp_path / name).write_text(json.dumps(nifty_profile()))
    with pytest.raises(RegistryError) as err:
        load_registry(tmp_path)
    assert err.value.code == "PROFILE_DUPLICATE"


def test_index_file_volatility_needs_a_file():
    profile = copy.deepcopy(nifty_profile())
    del profile["data"]["volatility_file"]
    with pytest.raises(RegistryError):
        build_instrument(profile)

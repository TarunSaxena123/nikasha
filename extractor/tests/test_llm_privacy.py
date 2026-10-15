"""LLM call shape and errors (T-UPL-06, T-PRV-09; AC-PRV-15) and in-memory privacy (T-PRV-07, 08; AC-PRV-12)."""

from __future__ import annotations

import builtins
import io
import json
import os
import tempfile
from types import SimpleNamespace

import httpx
import pytest

import nikasha_log
from helpers import SAMPLES, multipart
from nikasha_extractor import llm
from nikasha_extractor.core import api
from nikasha_extractor.core.errors import ExtractError
from nikasha_extractor.prompt import SYSTEM_PROMPT
from nikasha_extractor.wire import WireDraft

MARKER = "NIKASHA-PRIVACY-MARKER-7f3a"


def test_request_has_only_system_prompt_and_text(replay):
    body, ct = multipart((SAMPLES / "nifty_weekly_options_strategy.pdf").read_bytes(), filename=f"{MARKER}.pdf")
    status, _ = api.dispatch("POST", "/v1/extract", body, ct)
    assert status == 200
    call = replay.beta.messages.calls[-1]
    assert call["system"] == SYSTEM_PROMPT
    assert len(call["messages"]) == 1 and call["messages"][0]["role"] == "user"
    assert "Supertrend turns Green" in call["messages"][0]["content"]
    assert MARKER not in json.dumps({k: v for k, v in call.items() if k != "output_format"})  # file name never sent
    assert call["model"] == "claude-sonnet-5-5" and call["max_tokens"] == 16000
    assert call["output_config"] == {"effort": "medium"} and call["output_format"] is WireDraft
    assert call["fallbacks"] == "default" and call["betas"] == ["server-side-fallback-2026-07-01"]


class Stub:
    def __init__(self, result=None, error=None):
        self.beta = SimpleNamespace(messages=SimpleNamespace(parse=self.parse))
        self.result, self.error = result, error

    def parse(self, **kw):
        if self.error:
            raise self.error
        return self.result


def _status_error(cls, code):
    req = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    return cls("x", response=httpx.Response(code, request=req), body=None)


@pytest.mark.parametrize("stop", ["refusal", "max_tokens"])
def test_refusal_or_truncation_fails(stop):
    with pytest.raises(ExtractError) as e:
        llm.extract_with_llm("t", Stub(SimpleNamespace(stop_reason=stop, parsed_output=None)))
    assert e.value.code == "EXTRACTION_FAILED"


def test_error_mapping():
    import anthropic

    req = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    for err, code in [
        (_status_error(anthropic.RateLimitError, 429), "EXTRACTION_BUSY"),
        (_status_error(anthropic.InternalServerError, 500), "EXTRACTION_BUSY"),
        (anthropic.APIConnectionError(request=req), "EXTRACTION_BUSY"),
        (_status_error(anthropic.BadRequestError, 400), "EXTRACTION_FAILED"),
    ]:
        with pytest.raises(ExtractError) as e:
            llm.extract_with_llm("t", Stub(error=err))
        assert e.value.code == code


def test_no_disk_writes(replay, monkeypatch):
    """AC-PRV-12: open-for-write, tempfile and os.open are never used; /tmp is unchanged."""
    before = set(os.listdir(tempfile.gettempdir()))
    real_open = builtins.open

    def guarded(file, mode="r", *a, **k):
        if any(m in mode for m in "wax+"):
            raise AssertionError("disk write attempted")
        return real_open(file, mode, *a, **k)

    def fail(*a, **k):
        raise AssertionError("temp file attempted")

    monkeypatch.setattr(builtins, "open", guarded)
    monkeypatch.setattr(tempfile, "NamedTemporaryFile", fail)
    monkeypatch.setattr(tempfile, "mkstemp", fail)
    monkeypatch.setattr(os, "open", fail)
    body, ct = multipart((SAMPLES / "nifty_weekly_options_strategy.pdf").read_bytes())
    status, _ = api.dispatch("POST", "/v1/extract", body, ct)
    assert status == 200
    assert set(os.listdir(tempfile.gettempdir())) == before


def test_logs_have_no_content(replay):
    buf = io.StringIO()
    nikasha_log.set_stream(buf)
    try:
        text = f"Buy ATM Nifty call when RSI 14 crosses above 60 on 5-minute chart, stop-loss 30%. {MARKER}"
        api.dispatch("POST", "/v1/extract", json.dumps({"text": text}).encode(), "application/json")
        body, ct = multipart(b"\x89PNG\r\n\x1a\nzz", filename=f"{MARKER}.png")
        api.dispatch("POST", "/v1/extract", body, ct)
    finally:
        nikasha_log.set_stream(None)
    out = buf.getvalue()
    assert MARKER not in out and "RSI" not in out
    assert [json.loads(x)["status"] for x in out.splitlines()] == [200, 415]


def test_unexpected_exception_logs_type_only(monkeypatch):
    buf = io.StringIO()
    nikasha_log.set_stream(buf)

    def boom(text):
        raise RuntimeError(MARKER)

    monkeypatch.setattr(api, "extract", boom)
    try:
        status, out = api.dispatch("POST", "/v1/extract", b'{"text": "x"}', "application/json")
    finally:
        nikasha_log.set_stream(None)
    assert status == 422 and out["error"]["code"] == "EXTRACTION_FAILED"
    assert MARKER not in buf.getvalue() and '"exc_type":"RuntimeError"' in buf.getvalue()


def test_lambda_handler(replay):
    import base64

    from nikasha_extractor.adapters.lambda_handler import handler

    body, ct = multipart((SAMPLES / "one_line_strategy.txt").read_bytes())
    out = handler(
        {
            "rawPath": "/v1/extract",
            "body": base64.b64encode(body).decode(),
            "isBase64Encoded": True,
            "headers": {"Content-Type": ct},
            "requestContext": {"http": {"method": "POST"}},
        },
        None,
    )
    assert out["statusCode"] == 200 and json.loads(out["body"])["draft"]["timeframe_min"] == 5

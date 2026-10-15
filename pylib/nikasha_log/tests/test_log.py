import io
import json
import logging

import pytest

import nikasha_log as nl


@pytest.fixture()
def out():
    buf = io.StringIO()
    nl.set_stream(buf)
    yield buf
    nl.set_stream(None)
    nl.STRICT = False


def lines(buf):
    return [json.loads(x) for x in buf.getvalue().splitlines()]


def test_allowed_fields_written(out):
    nl.log("request", request_id="abc-123", endpoint="/v1/evaluate", status=200, duration_ms=12.5, count_trades=4)
    rec = lines(out)[0]
    assert rec["event"] == "request" and rec["status"] == 200 and rec["count_trades"] == 4
    assert rec["endpoint"] == "/v1/evaluate"


def test_unknown_field_dropped_in_production(out):
    nl.log("request", strategy="MY SECRET STRATEGY", status=200)
    rec = lines(out)[0]
    assert "strategy" not in rec
    assert "SECRET" not in out.getvalue()


def test_unknown_field_rejected_in_tests(out):
    nl.STRICT = True
    with pytest.raises(AssertionError):
        nl.log("request", body="{}")


def test_long_or_odd_string_value_dropped(out):
    nl.log("request", code="x" * 65, endpoint="has spaces and words")
    rec = lines(out)[0]
    assert "code" not in rec and "endpoint" not in rec


def test_exception_message_and_args_never_logged(out):
    marker = "NIKASHA-PRIVACY-MARKER-7f3a"
    try:
        raise ValueError(f"bad strategy {marker}", {"name": marker})
    except ValueError as exc:
        nl.log_exception(exc, request_id="r1", endpoint="/v1/evaluate")
    text = out.getvalue()
    assert marker not in text
    rec = lines(out)[0]
    assert rec["exc_type"] == "ValueError"
    assert "test_log.py" in rec["exc_where"]


def test_third_party_loggers_silenced():
    logging.getLogger("httpx").addHandler(logging.StreamHandler())
    nl.silence_third_party()
    for name in ("anthropic", "httpx", "botocore", "urllib3"):
        lg = logging.getLogger(name)
        assert lg.level == logging.WARNING
        assert not lg.handlers
        assert lg.propagate is False

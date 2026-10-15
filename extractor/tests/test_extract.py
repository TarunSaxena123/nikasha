"""Conversion and sample oracles (REQ-UPL-05…10, 20, 21; AC-UPL-04…07, 15) with recorded LLM output."""

from __future__ import annotations

import json

import pytest

from helpers import CONTRACTS, SAMPLES, answer_number, apply_patch, load, multipart
from nikasha_extractor.core import api


def run_pdf():
    body, ct = multipart((SAMPLES / "nifty_weekly_options_strategy.pdf").read_bytes())
    return api.dispatch("POST", "/v1/extract", body, ct)


def test_advanced_sample_questions(replay):
    """AC-UPL-04, 05, 15: every expected ambiguity has a question; the footer has none."""
    status, out = run_pdf()
    assert status == 200 and out["ignored_text_found"] is True
    prompts = [q["prompt"] for q in out["questions"]]
    assert prompts == [
        "Your title says weekly. Which expiry?",
        "Use the 09:15 opening VIX? (the earliest available)",
        "With India VIX above 18, trade what % of your normal size?",
        "Enter only on the candle it turns green, or on any candle while it's green?",
        "How many points beyond both EMAs must the candle close? (0 = just beyond)",
        "'Rising' compared with how many candles back?",
        "SL cap: 30 or 35 points?",
        "By 'Thursday', do you mean expiry day? (Thursday until Aug 2025, Tuesday since)",
    ]
    kinds = [q["kind"] for q in out["questions"]]
    assert kinds == ["CHOICE", "CONFIRM", "NUMBER", "CHOICE", "NUMBER", "NUMBER", "CHOICE", "CONFIRM"]
    text = json.dumps(out).lower()
    assert "medical" not in text
    # No value exists for vague or unstated inputs.
    d = out["draft"]
    assert "holding" not in d and "position" not in d and "expiry" not in d["legs"][0]
    assert "sl_cap_pts" not in d["advanced"] and "measured_at" not in d["advanced"]["vix_sizing"]
    assert "size_pct" not in d["advanced"]["vix_sizing"]["bands"][2]
    assert "offset" not in d["entry"]["ce"]["conditions"][2]["right"]


def test_advanced_sample_answers_give_the_reference_strategy(replay):
    """Applying the example answers reproduces the shared 'sample with answers' fixture exactly."""
    status, out = run_pdf()
    d = out["draft"]
    qs = out["questions"]
    choose = lambda d, q, label: apply_patch(d, next(o["patch"] for o in q["options"] if o["label"].startswith(label)))  # noqa: E731
    d = choose(d, qs[0], "Current weekly")
    d = choose(d, qs[1], "Yes")
    d = answer_number(d, qs[2], 50)
    d = choose(d, qs[3], "Only on the candle")
    d = answer_number(d, qs[4], 10)
    d = answer_number(d, qs[5], 1)
    d = choose(d, qs[6], "30 points")
    d = choose(d, qs[7], "Yes")
    # The browser then asks the missing inputs; example answers: intraday, 2 lots × 65.
    d["holding"] = "INTRADAY"
    d["position"] = {"lots": 2, "lot_size": 65}
    fixture = load(CONTRACTS / "fixtures" / "strategies" / "valid" / "sample-pdf-with-answers.json")
    for k in ("name", "origin"):
        d.pop(k, None)
        fixture.pop(k, None)
    assert d == fixture


def test_one_line_sample(replay):
    """AC-UPL-06, 07 (server part): no questions, no advanced options, no PE side."""
    status, out = api.dispatch(
        "POST",
        "/v1/extract",
        json.dumps({"text": (SAMPLES / "one_line_strategy.txt").read_text()}).encode(),
        "application/json",
    )
    assert status == 200 and out["questions"] == []
    d = out["draft"]
    assert "advanced" not in d and "pe" not in d["entry"] and d["legs"][0]["option_type"] == "CE"
    assert d["exit"]["stop_loss"] == {"type": "PCT_PREMIUM", "value": 30}
    assert any("30% of the option premium" in i["text"] for i in out["items"])


def test_vwap_is_unsupported(replay):
    status, out = api.dispatch(
        "POST",
        "/v1/extract",
        json.dumps({"text": "Buy ATM call when price crosses above VWAP, SL 20 points"}).encode(),
        "application/json",
    )
    assert status == 200
    unsupported = [i for i in out["items"] if i["status"] == "UNSUPPORTED"]
    assert len(unsupported) == 1 and "no volume and no VWAP" in unsupported[0]["text"]


def test_no_rules(replay):
    status, out = api.dispatch("POST", "/v1/extract", b'{"text": "hello"}', "application/json")
    assert status == 200 and out["items"] == [] and out["questions"] == []


@pytest.mark.parametrize(
    "body,ct,code",
    [
        (b"", "application/json", "BAD_REQUEST"),
        (b'{"text": ""}', "application/json", "BAD_REQUEST"),
        (json.dumps({"text": "x" * 20001}).encode(), "application/json", "PAYLOAD_TOO_LARGE"),
        (b"\x89PNG\r\n\x1a\nzzzz", "image/png", "UNSUPPORTED_FILE"),
    ],
)
def test_errors(replay, body, ct, code):
    status, out = api.dispatch("POST", "/v1/extract", body, ct)
    assert out["error"]["code"] == code


def test_cycle_in_conditions_fails():
    from recordings.make_recordings import ONE_LINE, row

    from nikasha_extractor.core.errors import ExtractError
    from nikasha_extractor.schema import ExtractionDraft
    from nikasha_extractor.validate import validate_draft

    bad = json.loads(json.dumps(ONE_LINE))
    bad["conditions"] = [row("c1", "CE", "all", parent="c2"), row("c2", "CE", "all", parent="c1")]
    with pytest.raises(ExtractError):
        validate_draft(ExtractionDraft.model_validate(bad))

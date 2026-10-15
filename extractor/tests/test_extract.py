"""Conversion and sample oracles (REQ-UPL-05…10, 20, 21; AC-UPL-04…07, 15) with recorded LLM output."""

from __future__ import annotations

import json

import pytest

from helpers import CONTRACTS, SAMPLES, answer_number, apply_patch, load, multipart
from nikasha_extractor.core import api


def run_pdf():
    body, ct = multipart((SAMPLES / "nifty_weekly_options_strategy.pdf").read_bytes())
    return api.dispatch("POST", "/v1/extract", body, ct)


def _paths(q):
    """The strategy paths a question fills: how a question is identified, whatever its wording."""
    ops = {op["path"] for o in q.get("options", []) for op in o["patch"]}
    return frozenset(ops | {t["path"] for t in q.get("number", {}).get("targets", [])})


C, P = "/entry/ce/conditions", "/entry/pe/conditions"
EXPECTED = {  # feature 04 design §2.5: every ambiguity in the advanced sample, by the values it asks for
    frozenset({"/legs/0/expiry"}): "CHOICE",
    frozenset({"/advanced/vix_sizing/measured_at"}): "CONFIRM",
    frozenset({"/advanced/vix_sizing/bands/2/size_pct"}): "NUMBER",
    frozenset({f"{C}/0", f"{P}/0"}): "CHOICE",
    frozenset({f"{s}/{i}/right/offset/pts" for s in (C, P) for i in (2, 3)}): "NUMBER",
    frozenset({f"{s}/5/conditions/0/conditions/1/lookback" for s in (C, P)}): "NUMBER",
    frozenset({"/advanced/sl_cap_pts"}): "CHOICE",
    frozenset({"/advanced/expiry_day_cutoff"}): "CONFIRM",
}


def _questions(out):
    return {_paths(q): q for q in out["questions"]}


def test_advanced_sample_questions(replay):
    """AC-UPL-04, 05, 15: every expected ambiguity has exactly one question; the footer has none."""
    status, out = run_pdf()
    assert status == 200 and out["ignored_text_found"] is True
    qs = _questions(out)
    assert len(out["questions"]) == len(EXPECTED)
    assert {k: q["kind"] for k, q in qs.items()} == EXPECTED
    assert all(0 < len(q["prompt"]) <= 120 for q in out["questions"])
    text = json.dumps(out).lower()
    assert "medical" not in text
    # No value exists for vague or unstated inputs.
    d = out["draft"]
    assert "holding" not in d and "position" not in d and "expiry" not in d["legs"][0]
    assert "sl_cap_pts" not in d["advanced"] and "measured_at" not in d["advanced"]["vix_sizing"]
    assert "size_pct" not in d["advanced"]["vix_sizing"]["bands"][2]
    assert "offset" not in d["entry"]["ce"]["conditions"][2]["right"]


def _choose(d, q, value):
    option = next(o for o in q["options"] if o["patch"] and o["patch"][0].get("value") == value)
    return apply_patch(d, option["patch"])


def test_advanced_sample_answers_give_the_reference_strategy(replay):
    """Applying the example answers reproduces the shared 'sample with answers' fixture exactly."""
    status, out = run_pdf()
    d = out["draft"]
    qs = _questions(out)
    q = [qs[k] for k in EXPECTED]  # in EXPECTED's order
    d = _choose(d, q[0], "CURRENT_WEEKLY")
    d = _choose(d, q[1], "DAY_OPEN")
    d = answer_number(d, q[2], 50)
    d = _choose(d, q[3], {"type": "turns", "ind": "st", "to": "up"})
    d = answer_number(d, q[4], 10)
    d = answer_number(d, q[5], 1)
    d = _choose(d, q[6], 30)
    d = _choose(d, q[7], "12:00")
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


def test_orb_cpr_sample_extracts_every_rule_ac_upl_16(replay):
    """AC-UPL-16 (live recording, prompt upl-3): no rule unsupported; vague expiry and CPR width asked;
    with example answers the draft is a complete, schema-valid strategy using the 2026-10-15 vocabulary."""
    from jsonschema import Draft202012Validator

    text = (SAMPLES / "nifty_15min_orb_cpr_strategy.txt").read_text(encoding="utf-8")
    status, out = api.dispatch("POST", "/v1/extract", json.dumps({"text": text}).encode(), "application/json")
    assert status == 200
    assert not [i for i in out["items"] if i["status"] == "UNSUPPORTED"]
    qs = {frozenset(_paths(q)): q for q in out["questions"]}
    expiry = qs[frozenset({"/legs/0/expiry"})]
    width_paths = {"/entry/ce/conditions/4/right/const", "/entry/pe/conditions/4/right/const"}
    width = qs[frozenset(width_paths)]
    assert width["kind"] == "NUMBER" and len(out["questions"]) == 2
    d = out["draft"]
    assert d["exit"]["target"] == {
        "type": "SPOT_LEVEL",
        "ce": {"ind": "piv", "output": "r2"},
        "pe": {"ind": "piv", "output": "s2"},
    }
    assert d["exit"]["exit_when"]["ce"]["conditions"][0]["right"] == {"ind": "ema20", "output": "value"}
    assert d["advanced"]["partial_exit"] == {
        "percent": 50,
        "when": {"type": "SPOT_LEVEL", "ce": {"ind": "piv", "output": "r1"}, "pe": {"ind": "piv", "output": "s1"}},
        "then_stop": "PARTIAL_CANDLE",
    }
    assert d["advanced"]["trail_to_cost_at_pts"] == 25 and d["advanced"]["daily"] == {"max_trades": 1}
    assert {"type": "compare", "left": {"candle": "range"}, "op": "lte", "right": {"const": 70}} in d["entry"]["ce"][
        "conditions"
    ]
    d = apply_patch(d, next(o["patch"] for o in expiry["options"] if o["patch"][0]["value"] == "CURRENT_WEEKLY"))
    d = answer_number(d, width, 30)
    d["holding"] = "INTRADAY"
    d["position"] = {"lots": 2, "lot_size": 65}
    schema = load(CONTRACTS / "strategy.schema.json")
    assert not list(Draft202012Validator(schema).iter_errors(d))

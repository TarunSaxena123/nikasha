"""Contract tests (architecture.md §9; T-DAT-02, REQ-ENG-05, 41): schemas, OpenAPI, shared fixtures."""

from __future__ import annotations

import copy
import json
from datetime import date

import pytest
import yaml
from jsonschema import Draft202012Validator
from openapi_spec_validator import validate as validate_openapi

from conftest import CONTRACTS, FIXTURES, REPO, load_json, nifty_profile
from contract_helpers import assert_valid
from nikasha_engine.generated.instrument import InstrumentProfile
from nikasha_engine.generated.strategy import Strategy
from nikasha_engine.instruments.registry import build_instrument
from nikasha_engine.validation.semantic import DataRange, schema_problems, semantic_problems

VALID = sorted((FIXTURES / "valid").glob("*.json"))
INVALID = sorted((FIXTURES / "invalid").glob("*.json"))
DATA_RANGE = DataRange(date(2015, 1, 9), date(2026, 5, 14))
DEFAULT_SETTINGS = {"period": {"start": "2024-01-01", "end": "2024-12-31"}}


@pytest.mark.parametrize("name", ["strategy.schema.json", "instrument.schema.json"])
def test_schemas_are_valid_and_examples_pass(name):
    schema = load_json(CONTRACTS / name)
    Draft202012Validator.check_schema(schema)
    v = Draft202012Validator(schema)
    for ex in schema["examples"]:
        assert not list(v.iter_errors(ex))


def test_openapi_document_is_valid():
    validate_openapi(
        yaml.safe_load((CONTRACTS / "api.openapi.yaml").read_text()), base_uri=(CONTRACTS / "api.openapi.yaml").as_uri()
    )


def test_profile_file_equals_schema_example():
    """T-DAT-01: instruments/nifty50.json holds the approved example values exactly."""
    assert nifty_profile() == load_json(CONTRACTS / "instrument.schema.json")["examples"][0]
    InstrumentProfile.model_validate(nifty_profile())


@pytest.mark.parametrize("path", VALID, ids=lambda p: p.stem)
def test_valid_fixture_passes(path, nifty):
    s = load_json(path)
    assert schema_problems(s) == []
    assert semantic_problems(s, {"NIFTY50": nifty}, DEFAULT_SETTINGS, DATA_RANGE) == []
    Strategy.model_validate(s)  # the generated models agree with the schema
    assert_valid("Strategy", s)


@pytest.mark.parametrize("path", INVALID, ids=lambda p: p.stem)
def test_invalid_fixture_fails_for_its_named_rule(path, nifty):
    case = load_json(path)
    s = case["strategy"]
    insts = {"NIFTY50": nifty}
    if "profile_overrides" in case:
        raw = copy.deepcopy(nifty.raw)
        raw.update(case["profile_overrides"])
        insts = {"NIFTY50": build_instrument(raw)}
    sp = schema_problems(s)
    if case["expect"]["kind"] == "SCHEMA":
        assert sp, "should fail the schema"
        assert [p.rule for p in sp if p.rule] == case["expect"]["rules"]
        assert all(p.message and p.field_label for p in sp)
    else:
        assert sp == []
        probs = semantic_problems(s, insts, case.get("settings", DEFAULT_SETTINGS), DATA_RANGE)
        assert [p.rule for p in probs] == case["expect"]["rules"]
    name_rule = path.stem.split("-")[0] + "-" + path.stem.split("-")[1]
    if name_rule.startswith("SEM-"):
        assert name_rule in case["expect"]["rules"]


def test_every_sem_rule_has_a_fixture():
    covered = {p.stem[:6] for p in INVALID if p.stem.startswith("SEM-")}
    assert covered == {f"SEM-{i:02d}" for i in range(1, 21)}


def test_problem_messages_name_no_paths_or_ids(nifty):
    for path in INVALID:
        case = load_json(path)
        probs = schema_problems(case["strategy"]) or semantic_problems(
            case["strategy"], {"NIFTY50": nifty}, case.get("settings", DEFAULT_SETTINGS), DATA_RANGE
        )
        for p in probs:
            assert "/" not in p.field_label and "_" not in p.message.replace("e.g.", "")
            assert "{" not in p.message


def test_generated_models_are_current():
    import subprocess
    import sys

    out = subprocess.run(
        [sys.executable, str(REPO / "engine" / "scripts" / "codegen.py"), "--check"], capture_output=True, text=True
    )
    assert out.returncode == 0, out.stdout


def test_vwap_is_rejected_by_the_schema():
    """REQ-ENG-05."""
    case = load_json(FIXTURES / "invalid" / "SCHEMA-vwap-indicator.json")
    assert schema_problems(case["strategy"])
    assert "VWAP" not in json.dumps(load_json(CONTRACTS / "strategy.schema.json")["$defs"]["Indicator"])

"""T-UPL-01: extraction fixtures validate against api.openapi.yaml → ExtractionResult and are current."""

from __future__ import annotations

import subprocess
import sys

import pytest
import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

from helpers import CONTRACTS, REPO, load

API_URI = "https://nikasha.local/contracts/api.openapi.yaml"


def validator(name: str) -> Draft202012Validator:
    api = yaml.safe_load((CONTRACTS / "api.openapi.yaml").read_text())
    res = [(API_URI, Resource.from_contents(api, default_specification=DRAFT202012))]
    for f in ("strategy.schema.json", "instrument.schema.json"):
        s = load(CONTRACTS / f)
        res.append((s["$id"], Resource.from_contents(s)))
    return Draft202012Validator(
        {"$ref": f"{API_URI}#/components/schemas/{name}"}, registry=Registry().with_resources(res)
    )


@pytest.mark.parametrize("name", ["advanced-sample", "one-line-sample", "vwap", "no-rules"])
def test_fixture_validates(name):
    errors = list(
        validator("ExtractionResult").iter_errors(load(CONTRACTS / "fixtures" / "extraction" / f"{name}.json"))
    )
    assert not errors, errors[0].message


def test_fixtures_current():
    out = subprocess.run(
        [sys.executable, str(REPO / "extractor" / "scripts" / "make_fixtures.py"), "--check"],
        capture_output=True,
        text=True,
    )
    assert out.returncode == 0, out.stdout + out.stderr[-400:]

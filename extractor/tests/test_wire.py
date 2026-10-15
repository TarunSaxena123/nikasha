"""The wire schema sent to the LLM (feature 04 design §2.2): within the structured-output limits and
mapped exactly to ExtractionDraft."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from anthropic.lib._parse._transform import transform_schema

from nikasha_extractor.convert import convert
from nikasha_extractor.schema import ExtractionDraft
from nikasha_extractor.wire import WireDraft, from_wire, to_wire

RECORDINGS = sorted((Path(__file__).parent / "recordings").glob("*.json"))


def _count(node: Any, acc: dict[str, int]) -> dict[str, int]:
    if isinstance(node, dict):
        if "anyOf" in node or isinstance(node.get("type"), list):
            acc["union"] += 1
        if node.get("type") == "object":
            acc["optional"] += len(set(node.get("properties", {})) - set(node.get("required", [])))
        for v in node.values():
            _count(v, acc)
    elif isinstance(node, list):
        for v in node:
            _count(v, acc)
    return acc


def test_schema_has_no_unions_or_optional_fields():
    # Documented limits: 16 union-typed and 24 optional fields per request; we use none.
    assert _count(transform_schema(WireDraft), {"union": 0, "optional": 0}) == {"union": 0, "optional": 0}


@pytest.mark.parametrize("path", RECORDINGS, ids=lambda p: p.name)
def test_round_trip(path):
    # Compared as the app sees it: an unsupported item's reason travels as its "understood" text.
    draft = ExtractionDraft.model_validate(json.loads(path.read_text())["output"])
    assert convert(from_wire(to_wire(draft))) == convert(draft)


def test_not_stated_and_unparsable_numbers_become_missing():
    draft = ExtractionDraft.model_validate(json.loads(RECORDINGS[0].read_text())["output"])
    w = to_wire(draft)
    w.basics.lots, w.basics.lot_size, w.basics.distance_pts, w.basics.action = "", "about two", "1,000", "NONE"
    w.exit.hold_to_expiry = "NO"
    out = from_wire(w)
    assert out.basics.lots is None and out.basics.lot_size is None  # asked, never guessed
    assert out.basics.distance_pts == 1000 and out.basics.action is None
    assert out.exit.hold_to_expiry is False

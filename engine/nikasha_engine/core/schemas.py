"""JSON Schema validators built from the contract files (the same files the web app uses)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

from nikasha_engine.core.paths import contracts_dir


def _load(name: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads((contracts_dir() / name).read_text(encoding="utf-8"))
    return data


@lru_cache(maxsize=4)
def validator(name: str) -> Draft202012Validator:
    """Validator for a schema file in specs/contracts (e.g. 'strategy.schema.json')."""
    schema = _load(name)
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema, format_checker=FormatChecker())


def contract_path(name: str) -> Path:
    return contracts_dir() / name


def schema_registry() -> Registry:
    """Registry resolving 'strategy.schema.json' etc. for OpenAPI component validation."""
    resources = []
    for name in ("strategy.schema.json", "instrument.schema.json"):
        schema = _load(name)
        resources.append((name, Resource.from_contents(schema)))
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)

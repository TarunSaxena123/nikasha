"""Validators for OpenAPI component schemas, resolving references to the shared JSON Schemas."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

from conftest import CONTRACTS, load_json

API_URI = "https://nikasha.local/contracts/api.openapi.yaml"


@lru_cache(maxsize=1)
def _registry() -> Registry:  # type: ignore[type-arg]
    api = yaml.safe_load((CONTRACTS / "api.openapi.yaml").read_text())
    resources = [(API_URI, Resource.from_contents(api, default_specification=_spec()))]
    for name in ("strategy.schema.json", "instrument.schema.json"):
        schema = load_json(CONTRACTS / name)
        resources.append((f"urn:nikasha:{name}", Resource.from_contents(schema)))
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


def _spec() -> Any:
    from referencing.jsonschema import DRAFT202012

    return DRAFT202012


def component_validator(name: str) -> Draft202012Validator:
    schema = {"$ref": f"{API_URI}#/components/schemas/{name}"}
    return Draft202012Validator(schema, registry=_registry(), format_checker=FormatChecker())


def assert_valid(name: str, instance: Any) -> None:
    errors = sorted(component_validator(name).iter_errors(instance), key=lambda e: list(e.absolute_path))
    assert not errors, "\n".join(f"{list(e.absolute_path)}: {e.message}" for e in errors[:10])

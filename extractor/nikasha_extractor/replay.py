"""Replays recorded LLM outputs instead of calling the API (tests and the local privacy E2E).

A recording is chosen by a marker phrase in the text: each file `<name>.<PROMPT_VERSION>.json` holds
{"match": "<phrase>", "output": <ExtractionDraft JSON>}. Unmatched text gets the 'no rules' recording.
"""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from nikasha_extractor.prompt import PROMPT_VERSION
from nikasha_extractor.schema import ExtractionDraft


class _Messages:
    def __init__(self, folder: Path) -> None:
        self.recordings = [
            json.loads(p.read_text(encoding="utf-8")) for p in sorted(folder.glob(f"*.{PROMPT_VERSION}.json"))
        ]
        self.calls: list[dict[str, Any]] = []

    def parse(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        text = kwargs["messages"][0]["content"]
        chosen = next((r for r in self.recordings if r["match"] and r["match"] in text), None)
        chosen = chosen or next(r for r in self.recordings if not r["match"])
        return SimpleNamespace(stop_reason="end_turn", parsed_output=ExtractionDraft.model_validate(chosen["output"]))


class ReplayClient:
    def __init__(self, folder: Path) -> None:
        self.beta = SimpleNamespace(messages=_Messages(folder))

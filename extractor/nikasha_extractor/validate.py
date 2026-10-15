"""Checks on the LLM output that structured outputs can't express (feature 04 design §2.1)."""

from __future__ import annotations

import re

from nikasha_extractor.core.errors import ExtractError
from nikasha_extractor.schema import ExtractionDraft

MAX_QUOTE = 300
MAX_TEXT = 200
TIME = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
LEAF = {"compare", "cross", "state", "turns", "slope", "state_or_turns"}


def _time_ok(t: str | None) -> bool:
    return t is None or bool(TIME.match(t))


def validate_draft(d: ExtractionDraft) -> ExtractionDraft:
    """Raise EXTRACTION_FAILED on structural problems; trim over-long texts."""
    ids = [r.id for r in d.conditions]
    if len(ids) != len(set(ids)):
        raise ExtractError("EXTRACTION_FAILED")
    by_id = {r.id: r for r in d.conditions}
    # A comparison may lack its right side only while a vague-value question asks for it.
    asked = {t[5:] for i in d.items if i.status == "VAGUE" and i.field == "condition_value" for t in i.targets}
    for r in d.conditions:
        if r.parent_id is not None:
            parent = by_id.get(r.parent_id)
            if parent is None or parent.kind not in ("all", "any") or parent.side != r.side:
                raise ExtractError("EXTRACTION_FAILED")
        if r.kind in ("compare", "cross") and (r.left is None or (r.right is None and r.id not in asked)):
            raise ExtractError("EXTRACTION_FAILED")
        if r.kind in ("state", "turns", "state_or_turns") and not r.ind:
            raise ExtractError("EXTRACTION_FAILED")
        if r.kind == "slope" and r.left is None:
            raise ExtractError("EXTRACTION_FAILED")
    # Cycles: walking up from any row must reach the top within the number of rows.
    for r in d.conditions:
        seen, cur = 0, r
        while cur.parent_id is not None:
            cur = by_id[cur.parent_id]
            seen += 1
            if seen > len(ids):
                raise ExtractError("EXTRACTION_FAILED")
    ind_ids = [i.id for i in d.indicators]
    if len(ind_ids) != len(set(ind_ids)):
        raise ExtractError("EXTRACTION_FAILED")
    times = [d.basics.fixed_entry_time, d.exit.time_exit_at, d.advanced.expiry_day_cutoff]
    times += [t for w in d.advanced.entry_windows + d.advanced.no_entry_windows for t in (w.start, w.end)]
    if not all(_time_ok(t) for t in times):
        raise ExtractError("EXTRACTION_FAILED")
    item_ids = [i.id for i in d.items]
    if len(item_ids) != len(set(item_ids)):
        raise ExtractError("EXTRACTION_FAILED")
    for item in d.items:
        item.quote = item.quote[:MAX_QUOTE]
        item.understood = item.understood[:MAX_TEXT]
        for t in item.targets:
            if t.startswith("cond:") and t[5:] not in by_id:
                raise ExtractError("EXTRACTION_FAILED")
        if item.question:
            item.question.prompt = item.question.prompt[:MAX_TEXT]
            item.question.options = item.question.options[:4]
    return d

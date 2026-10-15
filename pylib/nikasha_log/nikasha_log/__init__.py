"""Allow-list logging for Nikasha's Python functions (feature 07 design §2.1).

Only technical fields are ever written. User content (strategies, settings, uploads, extracted
rules, reports, validation details) can't be logged because unknown fields and free-text values
are dropped before anything is printed. Exceptions are logged as their type and code location,
never their message or arguments.
"""

from __future__ import annotations

import json
import logging
import re
import sys
import time
import traceback
from typing import TextIO

ALLOWED: frozenset[str] = frozenset(
    {
        "ts",
        "level",
        "event",
        "request_id",
        "endpoint",
        "status",
        "code",
        "duration_ms",
        "engine_version",
        "cold_start",
        "memory_mb",
        "count_trades",
        "count_items",
        "count_days",
        "exc_type",
        "exc_where",
    }
)

_SAFE_STR = re.compile(r"^[A-Za-z0-9_.:/\-]{0,64}$")
_EXC_WHERE_MAX = 512
_THIRD_PARTY = ("anthropic", "httpx", "httpcore", "botocore", "urllib3", "boto3")

# Tests set this to True so an unknown field fails loudly instead of being dropped silently.
STRICT = False
_stream: TextIO | None = None


def set_stream(stream: TextIO | None) -> None:
    """Redirect output (tests). None restores stdout."""
    global _stream
    _stream = stream


def _safe_value(value: object) -> object | None:
    if isinstance(value, bool) or value is None:
        return value
    if isinstance(value, int | float):
        return value
    if isinstance(value, str) and _SAFE_STR.match(value):
        return value
    return None


def log(event: str, *, level: str = "INFO", **fields: object) -> None:
    """Write one JSON line with allow-listed fields only."""
    record: dict[str, object] = {"ts": round(time.time(), 3), "level": level}
    safe_event = _safe_value(event)
    record["event"] = safe_event if isinstance(safe_event, str) else "invalid_event"
    for key, value in fields.items():
        if value is None:
            continue
        if key not in ALLOWED or key in ("ts", "level", "event"):
            if STRICT:
                raise AssertionError(f"field not allowed in logs: {key}")
            continue
        if key == "exc_where" and isinstance(value, str) and len(value) <= _EXC_WHERE_MAX:
            record[key] = value
            continue
        safe = _safe_value(value)
        if safe is None and value is not None:
            if STRICT:
                raise AssertionError(f"value not allowed in logs for field: {key}")
            continue
        record[key] = safe
    out = _stream or sys.stdout
    out.write(json.dumps(record, separators=(",", ":")) + "\n")
    out.flush()


def exception_where(exc: BaseException) -> str:
    """'file.py:line:function' frames from the traceback, innermost last. No message, no locals."""
    frames = traceback.extract_tb(exc.__traceback__)
    parts = [f"{f.filename.rsplit('/', 1)[-1]}:{f.lineno}:{f.name}" for f in frames[-6:]]
    return ">".join(parts)[-_EXC_WHERE_MAX:]


def log_exception(exc: BaseException, *, request_id: str, endpoint: str, code: str = "ENGINE_ERROR") -> None:
    """Log an exception by type and code location only (REQ-PRV-26)."""
    log(
        "exception",
        level="ERROR",
        request_id=request_id,
        endpoint=endpoint,
        code=code,
        exc_type=type(exc).__name__,
        exc_where=exception_where(exc),
    )


def silence_third_party() -> None:
    """Third-party loggers can echo request data; keep them at WARNING with no handlers."""
    for name in _THIRD_PARTY:
        lg = logging.getLogger(name)
        lg.setLevel(logging.WARNING)
        for h in list(lg.handlers):
            lg.removeHandler(h)
        lg.propagate = False


silence_third_party()

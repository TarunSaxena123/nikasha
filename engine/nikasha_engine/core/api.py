"""Transport-agnostic engine core: dispatch(method, path, body) → (status, body) (architecture.md §5.3).

Every request is wrapped (feature 07 design §2.2): validation errors → 422 with plain-English
problems; known errors → their code; anything unexpected → 500 ENGINE_ERROR. Logs carry only
technical fields via nikasha_log; request and response bodies never reach the logger.
"""

from __future__ import annotations

import importlib
import json
import os
import time
import uuid
from threading import Lock
from typing import Any

from nikasha_engine.core.errors import ApiError, error_body
from nikasha_engine.core.version import engine_version
from nikasha_engine.data.loader import DataError, MarketData, load_market_data
from nikasha_engine.instruments.registry import Instrument, Registry, RegistryError, load_registry
from nikasha_engine.validation.semantic import (
    DataRange,
    Problem,
    schema_problems,
    semantic_problems,
    settings_problems,
)
from nikasha_log import log, log_exception

MAX_BODY_BYTES = 1_000_000


class _State:
    def __init__(self) -> None:
        self.lock = Lock()
        self.ready = False
        self.startup_error: str | None = None
        self.registry: Registry | None = None
        self.market: dict[str, MarketData] = {}
        self.cold = True
        self.meta_cache: dict[str, Any] | None = None


STATE = _State()


def init(force: bool = False) -> None:
    """Load profiles and data once per container (fail fast on an invalid profile, REQ-DAT-02)."""
    with STATE.lock:
        if STATE.ready and not force:
            return
        STATE.ready, STATE.startup_error, STATE.registry, STATE.market, STATE.meta_cache = True, None, None, {}, None
        try:
            reg = load_registry()
            STATE.registry = reg
            for inst in reg.all():
                STATE.market[inst.symbol] = load_market_data(inst)
        except (RegistryError, DataError) as exc:
            STATE.startup_error = exc.code
            log("startup", level="ERROR", code=exc.code)


def instruments() -> dict[str, Instrument]:
    assert STATE.registry is not None
    return {i.symbol: i for i in STATE.registry.all()}


def data_range(symbol: str) -> DataRange:
    md = STATE.market[symbol]
    return DataRange(md.first_date, md.last_date)


def _parse_json(body: bytes | str | None) -> Any:
    if body is None or len(body) == 0:
        raise ApiError("BAD_REQUEST")
    if len(body) > MAX_BODY_BYTES:
        raise ApiError("PAYLOAD_TOO_LARGE")
    try:
        return json.loads(body)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ApiError("BAD_REQUEST") from exc


def validate_request(payload: Any, *, need_base: bool = False) -> tuple[dict[str, Any], dict[str, Any]]:
    """Schema then SEM rules for {strategy, settings}. Raises ApiError with plain-English problems."""
    allowed = {"strategy", "settings"} | ({"base"} if need_base else set())
    if not isinstance(payload, dict) or not {"strategy", "settings"} <= set(payload) or set(payload) - allowed:
        raise ApiError("BAD_REQUEST")
    strategy, settings = payload["strategy"], payload["settings"]
    problems: list[Problem] = settings_problems(settings) + schema_problems(strategy)
    if problems:
        raise ApiError("VALIDATION_FAILED", [p.as_dict() for p in problems])
    insts = instruments()
    dr = data_range(strategy["underlying"]) if strategy["underlying"] in insts else None
    sem = semantic_problems(strategy, insts, settings, dr)
    if sem:
        only_period = all(p.rule in ("SEM-13", "SEM-14") for p in sem)
        raise ApiError("PERIOD_INVALID" if only_period else "VALIDATION_FAILED", [p.as_dict() for p in sem])
    return strategy, settings


def meta() -> dict[str, Any]:
    if STATE.meta_cache is None:
        from nikasha_engine.core.meta import build_meta

        STATE.meta_cache = build_meta(instruments(), STATE.market, engine_version())
    return STATE.meta_cache


def evaluate(payload: Any) -> tuple[dict[str, Any], int]:
    strategy, settings = validate_request(payload)
    from nikasha_engine.backtest.runner import run_all

    md = STATE.market[strategy["underlying"]]
    base, minus, plus = run_all(md, strategy, settings)
    builder = importlib.import_module("nikasha_engine.report.build")
    report: dict[str, Any] = builder.build_report(strategy, settings, base, minus, plus, md, engine_version())
    return report, len(base.trades)


def plan_suggestions(payload: Any) -> dict[str, Any]:
    strategy, settings = validate_request(payload, need_base=True)
    planner = importlib.import_module("nikasha_engine.suggestions.planner")
    result: dict[str, Any] = planner.plan(strategy, settings, payload["base"], STATE.market[strategy["underlying"]])
    return result


def dispatch(method: str, path: str, body: bytes | str | None = None, request_id: str | None = None) -> tuple[int, Any]:
    rid = request_id or uuid.uuid4().hex[:16]
    started = time.perf_counter()
    cold, STATE.cold = STATE.cold, False
    endpoint = path if path in ("/v1/meta", "/v1/evaluate", "/v1/suggestions/plan") else "other"
    count_trades: int | None = None
    try:
        init()
        if STATE.startup_error:
            raise ApiError("ENGINE_ERROR")
        if os.environ.get("NIKASHA_FAULT_INJECTION") == "1" and path == "/v1/__fault":
            # Test builds only (feature 07 design §3.3): proves exception messages never reach logs.
            raise RuntimeError(_parse_json(body).get("marker", "fault"))
        if method == "GET" and path == "/v1/meta":
            status, out = 200, meta()
        elif method == "POST" and path == "/v1/evaluate":
            out, count_trades = evaluate(_parse_json(body))
            status = 200
        elif method == "POST" and path == "/v1/suggestions/plan":
            status, out = 200, plan_suggestions(_parse_json(body))
        else:
            raise ApiError("BAD_REQUEST", status=404)
    except ApiError as err:
        status, out = err.status, error_body(err.code, err.problems, err.message)
        log(
            "request",
            level="WARN",
            request_id=rid,
            endpoint=endpoint,
            status=status,
            code=err.code,
            duration_ms=round((time.perf_counter() - started) * 1000, 1),
            cold_start=cold,
            engine_version=engine_version(),
        )
        return status, out
    except Exception as exc:  # every unexpected failure becomes a plain 500
        log_exception(exc, request_id=rid, endpoint=endpoint)
        return 500, error_body("ENGINE_ERROR")
    log(
        "request",
        request_id=rid,
        endpoint=endpoint,
        status=status,
        duration_ms=round((time.perf_counter() - started) * 1000, 1),
        cold_start=cold,
        engine_version=engine_version(),
        count_trades=count_trades,
    )
    return status, out

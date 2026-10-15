"""GET /v1/meta (REQ-DAT-19): every date comes from the loaded data, never hardcoded."""

from __future__ import annotations

from datetime import date
from typing import Any

from nikasha_engine.data.gaps import inventory
from nikasha_engine.data.loader import MarketData
from nikasha_engine.instruments.registry import COST_KEYS, Instrument, min_to_hhmm


def timestamp(epoch_minute: int) -> str:
    from nikasha_engine.data.loader import day_to_date

    d = day_to_date(epoch_minute // 1440)
    return f"{d.isoformat()}T{min_to_hhmm(epoch_minute % 1440)}"


def build_meta(insts: dict[str, Instrument], market: dict[str, MarketData], version: str) -> dict[str, Any]:
    return {"engine_version": version, "instruments": [summary(insts[s], market[s]) for s in sorted(insts)]}


def summary(inst: Instrument, md: MarketData) -> dict[str, Any]:
    first, last = md.first_date, md.last_date
    gaps = inventory(md)
    kinds = []
    for kind in ("WEEKLY", "MONTHLY"):
        p = inst.periods[kind]
        start = max(p.available_from, first)
        kinds.append(
            {
                "kind": kind,
                "available_from": p.available_from.isoformat(),
                "default_period": {"start": start.isoformat(), "end": last.isoformat()},
                "in_sample": {"start": p.in_sample_from.isoformat(), "end": p.in_sample_to.isoformat()},
                "out_of_sample_from": p.out_of_sample_from.isoformat(),
            }
        )
    return {
        "symbol": inst.symbol,
        "name": inst.name,
        "data_range": {"first": timestamp(md.first_timestamp), "last": timestamp(md.last_timestamp)},
        "volatility_name": inst.volatility_name,
        "lot_size_suggested": inst.lot_size_suggested,
        "lot_size_note": inst.lot_size_note,
        "strike_interval": _num(inst.strike_interval),
        "allowed_timeframes_min": list(inst.allowed_timeframes),
        "intraday_squareoff": min_to_hhmm(inst.squareoff),
        "session": {"first_bar": min_to_hhmm(inst.first_bar), "last_bar": min_to_hhmm(inst.last_bar)},
        "expiry_kinds": kinds,
        "default_costs": {
            "verified_on": inst.costs_verified_on.isoformat(),
            "items": [
                {
                    "key": k,
                    "value": inst.default_costs[k]["value"],
                    "label": inst.default_costs[k]["label"],
                    "applies_to": inst.default_costs[k]["applies_to"],
                    "source": inst.default_costs[k]["source"],
                }
                for k in COST_KEYS
            ],
        },
        "risk_free_rate": inst.risk_free_rate,
        "data_source": data_source(inst, first, last),
        "data_gaps": {
            "days_without_volatility": [d.isoformat() for d in gaps.days_without_volatility],
            "minutes_missing_underlying": gaps.missing_underlying,
            "minutes_missing_volatility": gaps.missing_volatility,
        },
    }


def data_source(inst: Instrument, first: date, last: date) -> dict[str, Any]:
    src = inst.data_source
    return {
        "name": src["name"],
        "url": src["url"],
        "note": src["note"],
        "first": first.isoformat(),
        "last": last.isoformat(),
    }


def _num(x: float) -> float | int:
    return int(x) if float(x).is_integer() else x

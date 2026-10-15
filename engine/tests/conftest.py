"""Shared test helpers: real and synthetic market data, strategies, settings, a controllable pricer."""

from __future__ import annotations

import copy
import json
from collections.abc import Callable
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pytest

import nikasha_log
from nikasha_engine.backtest.exits import LegFill, Pricer
from nikasha_engine.backtest.runner import Prepared, RunResult, prepare, run_once
from nikasha_engine.core.paths import data_dir
from nikasha_engine.data.loader import MarketData, Series, build_market_data, date_to_day
from nikasha_engine.instruments.registry import Instrument, build_instrument, hhmm_to_min

REPO = Path(__file__).resolve().parents[2]
CONTRACTS = REPO / "specs" / "contracts"
FIXTURES = CONTRACTS / "fixtures" / "strategies"
nikasha_log.STRICT = True  # an unknown log field fails a test instead of being dropped


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def nifty_profile() -> dict[str, Any]:
    data: dict[str, Any] = load_json(REPO / "instruments" / "nifty50.json")
    return data


@pytest.fixture(scope="session")
def nifty() -> Instrument:
    return build_instrument(nifty_profile())


def default_costs(inst: Instrument) -> dict[str, float]:
    return {k: float(v["value"]) for k, v in inst.default_costs.items()}


ZERO_COSTS = {
    k: 0.0
    for k in (
        "brokerage_per_order",
        "stt_sell_pct",
        "stt_exercise_pct",
        "exchange_txn_pct",
        "sebi_per_crore",
        "stamp_buy_pct",
        "gst_pct",
        "slippage_pts",
    )
}


def settings(start: str, end: str, costs: dict[str, float] | None = None, **extra: Any) -> dict[str, Any]:
    s: dict[str, Any] = {"period": {"start": start, "end": end}, "costs": dict(costs or ZERO_COSTS)}
    s.update(extra)
    return s


def strategy(name: str) -> dict[str, Any]:
    data: dict[str, Any] = copy.deepcopy(load_json(FIXTURES / "valid" / f"{name}.json"))
    return data


def single_leg(**over: Any) -> dict[str, Any]:
    """A plain intraday ATM CE buy with a fixed 10:00 entry; tests override parts."""
    s: dict[str, Any] = {
        "schema_version": "1.0",
        "underlying": "NIFTY50",
        "timeframe_min": 15,
        "holding": "INTRADAY",
        "position": {"lots": 1, "lot_size": 65},
        "indicators": {},
        "legs": [
            {
                "action": "BUY",
                "option_type": "CE",
                "expiry": "CURRENT_WEEKLY",
                "strike": {"method": "MONEYNESS", "moneyness": "ATM", "distance_pts": 0},
            }
        ],
        "entry": {"at_time": "10:00"},
        "exit": {"stop_loss": {"type": "PCT_PREMIUM", "value": 30}, "target": {"type": "PCT_PREMIUM", "value": 50}},
    }
    s.update(over)
    return s


# ---------------- synthetic market data ----------------

Bar = tuple[float, float, float, float]


def synth(
    inst: Instrument,
    days: list[date],
    spot: Callable[[int, int], Bar | None] | float = 24500.0,
    vix: Callable[[int, int], float | None] | float = 15.0,
) -> MarketData:
    """Market data for `days`, every minute of the session. A callable returns None to drop a minute."""
    mins, so, sh, sl, sc = [], [], [], [], []
    vm, vo, vc = [], [], []
    for di, d in enumerate(days):
        base = date_to_day(d) * 1440
        for tod in range(inst.first_bar, inst.last_bar + 1):
            bar = spot(di, tod) if callable(spot) else (spot, spot, spot, spot)
            if bar is not None:
                mins.append(base + tod)
                so.append(bar[0])
                sh.append(bar[1])
                sl.append(bar[2])
                sc.append(bar[3])
            v = vix(di, tod) if callable(vix) else vix
            if v is not None:
                vm.append(base + tod)
                vo.append(v)
                vc.append(v)
    und = Series(np.array(mins, dtype=np.int64), np.array(so), np.array(sh), np.array(sl), np.array(sc))
    vol = Series(np.array(vm, dtype=np.int64), np.array(vo), np.array(vo), np.array(vc), np.array(vc))
    return build_market_data(inst, und, vol)


def weekdays(start: date, n: int) -> list[date]:
    out, d = [], start
    while len(out) < n:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


def t(hhmm: str) -> int:
    return hhmm_to_min(hhmm)


class LinearPricer(Pricer):
    """Premium moves 1:1 with spot so tests control premiums exactly through the spot bars.

    Call: premium = spot − (K − 100); put: premium = (K + 100) − spot  (100 at the strike).
    """

    def at(self, idx: Any, leg: LegFill, spot: Any, vol: Any, raw: bool = False) -> Any:
        if leg.is_call:
            return np.asarray(spot - (leg.strike - 100.0), dtype=np.float64)
        return np.asarray((leg.strike + 100.0) - spot, dtype=np.float64)


def run(
    md: MarketData,
    strat: dict[str, Any],
    sett: dict[str, Any],
    pricer_cls: type[Pricer] | None = LinearPricer,
    shift: float = 0.0,
) -> RunResult:
    prep: Prepared = prepare(md, strat, sett)
    pricer = pricer_cls(md, shift) if pricer_cls else None
    return run_once(prep, shift, pricer)


# ---------------- real data ----------------


@pytest.fixture(scope="session")
def real_md(nifty: Instrument) -> MarketData:
    from nikasha_engine.data.loader import load_market_data

    if not (data_dir() / nifty.underlying_file).exists():
        pytest.skip("Parquet files not built (run engine/scripts/csv_to_parquet.py)")
    return load_market_data(nifty)

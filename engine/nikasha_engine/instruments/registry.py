"""Instrument registry (REQ-DAT-01…04, backend.md §5).

Every instrument-specific value comes from a profile in `instruments/*.json`, validated against
`contracts/instrument.schema.json` at start-up. The engine holds no instrument constants.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from nikasha_engine.core.paths import instruments_dir
from nikasha_engine.core.schemas import validator

WEEKDAYS = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4}
COST_KEYS = (
    "brokerage_per_order",
    "stt_sell_pct",
    "stt_exercise_pct",
    "exchange_txn_pct",
    "sebi_per_crore",
    "stamp_buy_pct",
    "gst_pct",
    "slippage_pts",
)


class RegistryError(Exception):
    """A profile is missing or invalid. Carries a technical code only (never profile content)."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def hhmm_to_min(value: str) -> int:
    """'10:30' → 630 (minutes since midnight)."""
    h, m = value.split(":")
    return int(h) * 60 + int(m)


def min_to_hhmm(value: int) -> str:
    return f"{value // 60:02d}:{value % 60:02d}"


@dataclass(frozen=True)
class ExpiryRule:
    kind: str  # WEEKLY | MONTHLY
    weekday: int  # 0 = Monday
    valid_from: date
    valid_to: date | None


@dataclass(frozen=True)
class PeriodConfig:
    available_from: date
    in_sample_from: date
    in_sample_to: date
    out_of_sample_from: date


@dataclass(frozen=True)
class Instrument:
    """Typed view of one validated profile. `raw` keeps the profile for /v1/meta."""

    symbol: str
    name: str
    raw: dict[str, Any]
    first_bar: int
    last_bar: int
    squareoff: int
    expiry_time: int
    strike_interval: float
    tick_size: float
    lot_size_suggested: int
    lot_size_note: str
    expiry_rules: tuple[ExpiryRule, ...]
    extra_trading_days: tuple[date, ...]
    volatility_name: str
    pricing_provider: str
    risk_free_rate: float
    sensitivity_shift: float
    default_costs: dict[str, dict[str, Any]]
    costs_verified_on: date
    periods: dict[str, PeriodConfig]
    vol_band_edges: tuple[float, ...]
    regime_adx_period: int
    regime_trending_min: float
    regime_sideways_max: float
    allowed_timeframes: tuple[int, ...]
    underlying_file: str
    volatility_file: str | None
    data_source: dict[str, str]

    @property
    def minutes_per_day(self) -> int:
        return self.last_bar - self.first_bar + 1


def _d(value: str) -> date:
    return date.fromisoformat(value)


def build_instrument(profile: dict[str, Any]) -> Instrument:
    """Validate one profile and build its typed view. Raises RegistryError on any problem."""
    errors = list(validator("instrument.schema.json").iter_errors(profile))
    if errors:
        raise RegistryError("PROFILE_INVALID")
    vol = profile["volatility"]
    data = profile["data"]
    if vol["source"] == "INDEX_FILE" and not data.get("volatility_file"):
        raise RegistryError("PROFILE_INVALID")
    session = profile["session"]
    first_bar, last_bar = hhmm_to_min(session["first_bar"]), hhmm_to_min(session["last_bar"])
    squareoff = hhmm_to_min(session["intraday_squareoff"])
    if not first_bar < squareoff <= last_bar:
        raise RegistryError("PROFILE_INVALID")
    if profile["pricing"]["provider"] != "BLACK_SCHOLES_VIX":
        # Only this provider is implemented; other providers need their own module (product.md §8).
        raise RegistryError("PROVIDER_NOT_IMPLEMENTED")
    rules = tuple(
        ExpiryRule(
            kind=r["kind"],
            weekday=WEEKDAYS[r["weekday"]],
            valid_from=_d(r["valid_from"]),
            valid_to=_d(r["valid_to"]) if r.get("valid_to") else None,
        )
        for r in profile["expiry"]["rules"]
    )
    periods = {
        kind: PeriodConfig(
            available_from=_d(p["available_from"]),
            in_sample_from=_d(p["in_sample"]["from"]),
            in_sample_to=_d(p["in_sample"]["to"]),
            out_of_sample_from=_d(p["out_of_sample_from"]),
        )
        for kind, p in profile["periods"].items()
    }
    contract = profile["contract"]
    regime = profile["report"]["regime"]
    return Instrument(
        symbol=profile["identity"]["symbol"],
        name=profile["identity"]["name"],
        raw=profile,
        first_bar=first_bar,
        last_bar=last_bar,
        squareoff=squareoff,
        expiry_time=hhmm_to_min(profile["expiry"]["expiry_time"]),
        strike_interval=float(contract["strike_interval"]),
        tick_size=float(contract["tick_size"]),
        lot_size_suggested=int(contract["lot_size_suggested"]),
        lot_size_note=contract["lot_size_note"],
        expiry_rules=rules,
        extra_trading_days=tuple(_d(x) for x in profile["expiry"]["extra_trading_days"]),
        volatility_name=vol["name"],
        pricing_provider=profile["pricing"]["provider"],
        risk_free_rate=float(profile["pricing"]["risk_free_rate"]),
        sensitivity_shift=float(profile["pricing"]["sensitivity_shift_pts"]),
        default_costs=profile["default_costs"]["items"],
        costs_verified_on=_d(profile["default_costs"]["verified_on"]),
        periods=periods,
        vol_band_edges=tuple(float(x) for x in profile["report"]["vol_band_edges"]),
        regime_adx_period=int(regime["adx_period"]),
        regime_trending_min=float(regime["trending_min"]),
        regime_sideways_max=float(regime["sideways_max"]),
        allowed_timeframes=tuple(int(x) for x in profile["allowed_timeframes_min"]),
        underlying_file=data["underlying_file"],
        volatility_file=data.get("volatility_file"),
        data_source=dict(data["source"]),
    )


class Registry:
    def __init__(self, instruments: dict[str, Instrument]) -> None:
        self._by_symbol = instruments

    def get(self, symbol: str) -> Instrument | None:
        return self._by_symbol.get(symbol)

    def symbols(self) -> list[str]:
        return sorted(self._by_symbol)

    def all(self) -> list[Instrument]:
        return [self._by_symbol[s] for s in self.symbols()]


def load_registry(directory: Path | None = None) -> Registry:
    """Load and validate every profile. Any invalid profile fails the whole registry (fail fast)."""
    folder = directory or instruments_dir()
    files = sorted(folder.glob("*.json"))
    if not files:
        raise RegistryError("NO_PROFILES")
    found: dict[str, Instrument] = {}
    for f in files:
        try:
            profile = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise RegistryError("PROFILE_UNREADABLE") from exc
        inst = build_instrument(profile)
        if inst.symbol in found:
            raise RegistryError("PROFILE_DUPLICATE")
        found[inst.symbol] = inst
    return Registry(found)

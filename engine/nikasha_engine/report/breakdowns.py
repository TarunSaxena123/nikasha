"""Breakdowns by entry (REQ-RPT-05; feature 02 design §2.3). Groups with no trades are omitted."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import date
from typing import Any

from nikasha_engine.backtest.costs import round2
from nikasha_engine.report import fmt

WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
REGIME_LABELS = {
    "TRENDING": "Trending days",
    "MIXED": "Mixed days",
    "SIDEWAYS": "Sideways days",
    "UNKNOWN": "Not enough history",
}
REGIME_ORDER = ("TRENDING", "MIXED", "SIDEWAYS", "UNKNOWN")
SIDE_LABELS = {"CE": "Call (CE)", "PE": "Put (PE)", "MULTI": "Multi-leg"}
SIDE_ORDER = ("CE", "PE", "MULTI")


@dataclass(frozen=True)
class GroupTrade:
    entry_date: date
    net: float
    vol_band: int  # index of the band
    regime: str
    expiry_day: bool
    side: str


def vol_band_index(v: float, edges: Sequence[float]) -> int:
    i = 0
    while i < len(edges) and v >= edges[i]:
        i += 1
    return i


def vol_band_labels(edges: Sequence[float], name: str) -> list[str]:
    e = [fmt.points(x) for x in edges]
    labels = [f"{name} below {e[0]}"]
    labels += [f"{name} {e[i]}–{e[i + 1]}" for i in range(len(e) - 1)]
    labels.append(f"{name} {e[-1]} and above")
    return labels


def _row(key: str, label: str, nets: list[float]) -> dict[str, Any]:
    wins = sum(1 for n in nets if n > 0)
    return {
        "key": key,
        "label": label,
        "trades": len(nets),
        "wins": wins,
        "win_rate_pct": round(100.0 * wins / len(nets), 2) if nets else None,
        "net_pnl": round2(sum(nets)),
        "expectancy": round2(sum(nets) / len(nets)) if nets else None,
    }


def _group(
    trades: Sequence[GroupTrade],
    keyf: Callable[[GroupTrade], Any],
    order: list[Any],
    label: Callable[[Any], str],
    key_text: Callable[[Any], str],
) -> list[dict[str, Any]]:
    buckets: dict[Any, list[float]] = {}
    for t in trades:
        buckets.setdefault(keyf(t), []).append(t.net)
    return [_row(key_text(k), label(k), buckets[k]) for k in order if k in buckets]


def breakdowns(trades: Sequence[GroupTrade], band_labels: list[str]) -> dict[str, list[dict[str, Any]]]:
    years = sorted({t.entry_date.year for t in trades})
    months = sorted({(t.entry_date.year, t.entry_date.month) for t in trades})
    return {
        "by_year": _group(trades, lambda t: t.entry_date.year, years, str, str),
        "by_month": _group(
            trades,
            lambda t: (t.entry_date.year, t.entry_date.month),
            months,
            lambda k: date(k[0], k[1], 1).strftime("%b %Y"),
            lambda k: f"{k[0]}-{k[1]:02d}",
        ),
        "by_vol_band": _group(
            trades, lambda t: t.vol_band, list(range(len(band_labels))), lambda k: band_labels[k], lambda k: f"band_{k}"
        ),
        "by_regime": _group(trades, lambda t: t.regime, list(REGIME_ORDER), REGIME_LABELS.__getitem__, str),
        "by_weekday": _group(
            trades,
            lambda t: t.entry_date.weekday(),
            list(range(7)),
            lambda k: WEEKDAYS[k],
            lambda k: WEEKDAYS[k].lower(),
        ),
        "by_expiry_day": _group(
            trades,
            lambda t: t.expiry_day,
            [True, False],
            lambda k: "Expiry day" if k else "Other days",
            lambda k: "expiry_day" if k else "other_days",
        ),
        "by_side": _group(trades, lambda t: t.side, list(SIDE_ORDER), SIDE_LABELS.__getitem__, str),
    }

"""Suggestion planning (feature 06 design §2; REQ-SUG-02…06). Pure and deterministic; no backtests.

Each variant is a copy of the strategy with exactly one change, validated with the schema and SEM
rules. Texts are fixed, past-simulated templates (no ranking, no advice).
"""

from __future__ import annotations

import copy
import json
import math
from typing import Any

from nikasha_engine.core.paths import contracts_dir
from nikasha_engine.data.loader import MarketData
from nikasha_engine.report import fmt
from nikasha_engine.validation.semantic import DataRange, schema_problems, semantic_problems

MIN_TRADES = 30
MIN_GROUP_TRADES = 10
MAX_VARIANTS = 12
MAX_FILTERS = 3
FACTORS = (0.67, 0.83, 1.17, 1.33)
TEMPLATE_ID = "simple-trend-follower"

T_NOT_OFFERED = "Ideas need at least 30 trades to compare fairly; this strategy had {n} in the period."
T_NONE_APPLY = "No ideas apply to this strategy's settings."
T_SWEEP_CHANGE = "{field} {new} instead of {old}"
T_SWEEP_REASON = "Your {field_lower} of {old} was tested on {n} trades; this shows how sensitive that result was to the value."
T_VIX_CHANGE = "Skip trades when {vol} is {band}"
T_VIX_REASON = "Trades taken when {vol} was {band} lost {exp} on average ({n} trades)."
T_SIDE_CHANGE = "{keep} only (skip {skip})"
T_SIDE_REASON = "{skip_cap} trades lost {exp} on average ({n} trades), while {keep_lower} trades did not."
T_ALT_CHANGE = "A simple trend-following approach (template)"
T_ALT_REASON = "A common starting point, shown for comparison on the same period."

TEMPLATES = [v for k, v in dict(globals()).items() if k.startswith("T_") and isinstance(v, str)]


def round5(x: float) -> float:
    """Nearest 5, halves up."""
    return 5.0 * math.floor(x / 5.0 + 0.5)


def _num(x: float) -> str:
    return fmt.points(x)


def _value_text(kind: str, v: float) -> str:
    return f"{_num(v)}%" if kind == "PCT_PREMIUM" else f"{_num(v)} points"


def _group(field: str, kind: str) -> str:
    name = "Stop-loss" if field == "stop_loss" else "Target"
    return f"{name} ({'% of premium' if kind == 'PCT_PREMIUM' else 'points'})"


def sweeps(strategy: dict[str, Any], trades: int) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for field in ("stop_loss", "target"):
        level = strategy["exit"].get(field)
        if not level or level.get("type") not in ("PCT_PREMIUM", "POINTS"):
            continue
        v = float(level["value"])
        values = sorted({round5(v * f) for f in FACTORS} - {v})
        values = [x for x in values if x > 0]
        name = "Stop-loss" if field == "stop_loss" else "Target"
        for new in values:
            s = copy.deepcopy(strategy)
            s["exit"][field]["value"] = int(new) if float(new).is_integer() else new
            out.append({
                "kind": "PARAMETER_SWEEP",
                "group": _group(field, level["type"]),
                "change_text": T_SWEEP_CHANGE.format(field=name, new=_value_text(level["type"], new),
                                                     old=_value_text(level["type"], v)),
                "reason_text": T_SWEEP_REASON.format(field_lower=name.lower(), old=_value_text(level["type"], v),
                                                     n=fmt.number(trades)),
                "strategy": s,
                "_field": field,
                "_value": new,
            })
    return out


def _add_condition(strategy: dict[str, Any], rule: dict[str, Any]) -> dict[str, Any]:
    """AND an extra rule into every entry condition set; a fixed-time-only entry gets conditions."""
    s = copy.deepcopy(strategy)
    entry = s["entry"]
    sides = [k for k in ("ce", "pe", "all_legs") if k in entry]
    if not sides:
        legs = s["legs"]
        if len(legs) > 1:
            sides = ["all_legs"]
        else:
            sides = ["ce"] if legs[0]["option_type"] == "CE" else ["pe"]
        for k in sides:
            entry[k] = copy.deepcopy(rule)
        return s
    for k in sides:
        entry[k] = {"type": "all", "conditions": [entry[k], copy.deepcopy(rule)]}
    return s


def _vix(op: str, value: float) -> dict[str, Any]:
    return {"type": "compare", "left": {"vix": "close"}, "op": op, "right": {"const": value}}


def filters(strategy: dict[str, Any], base: dict[str, Any], md: MarketData) -> list[dict[str, Any]]:
    inst = md.instrument
    edges = list(inst.vol_band_edges)
    vol = inst.volatility_name
    out: list[dict[str, Any]] = []
    for row in base.get("by_vol_band", []):
        if row["trades"] < MIN_GROUP_TRADES or row["expectancy"] is None or row["expectancy"] >= 0:
            continue
        key = str(row["key"])
        if not key.startswith("band_"):
            continue
        i = int(key.split("_")[1])
        if i == 0:
            rule, band = _vix("gte", edges[0]), f"below {_num(edges[0])}"
        elif i >= len(edges):
            rule, band = _vix("lt", edges[-1]), f"{_num(edges[-1])} and above"
        else:
            lo, hi = edges[i - 1], edges[i]
            rule = {"type": "any", "conditions": [_vix("lt", lo), _vix("gte", hi)]}
            band = f"{_num(lo)}–{_num(hi)}"
        out.append({
            "kind": "REGIME_FILTER",
            "group": "Filters",
            "change_text": T_VIX_CHANGE.format(vol=vol, band=band),
            "reason_text": T_VIX_REASON.format(vol=vol, band=band, exp=fmt.rupees(abs(row["expectancy"])),
                                               n=fmt.number(row["trades"])),
            "strategy": _add_condition(strategy, rule),
        })
    legs = strategy["legs"]
    if len(legs) == 1 and legs[0]["option_type"] == "SIGNAL":
        sides = {r["key"]: r for r in base.get("by_side", [])}
        ce, pe = sides.get("CE"), sides.get("PE")
        for losing, winning, keep, skip in ((ce, pe, "PE", "CE"), (pe, ce, "CE", "PE")):
            if not losing or not winning or losing["trades"] < MIN_GROUP_TRADES or losing["expectancy"] is None:
                continue
            if losing["expectancy"] < 0 and (winning["expectancy"] or 0) >= 0:
                s = copy.deepcopy(strategy)
                s["legs"][0]["option_type"] = keep
                s["entry"].pop(skip.lower(), None)
                names = {"CE": "Calls", "PE": "Puts"}
                out.append({
                    "kind": "REGIME_FILTER",
                    "group": "Filters",
                    "change_text": T_SIDE_CHANGE.format(keep=names[keep], skip=names[skip].lower()),
                    "reason_text": T_SIDE_REASON.format(skip_cap=names[skip][:-1], exp=fmt.rupees(abs(losing["expectancy"])),
                                                        n=fmt.number(losing["trades"]), keep_lower=names[keep][:-1].lower()),
                    "strategy": s,
                })
    return out[:MAX_FILTERS]


def alternative(strategy: dict[str, Any]) -> list[dict[str, Any]]:
    if strategy.get("template_id") == TEMPLATE_ID:
        return []
    path = contracts_dir() / "fixtures" / "strategies" / "valid" / f"{TEMPLATE_ID}.json"
    try:
        tpl = json.loads(path.read_text(encoding="utf-8"))
    except OSError:
        tpl = _TEMPLATE_FALLBACK
    tpl = copy.deepcopy(tpl)
    tpl["position"] = copy.deepcopy(strategy["position"])
    tpl["underlying"] = strategy["underlying"]
    return [{"kind": "ALTERNATIVE", "group": "Another approach", "change_text": T_ALT_CHANGE,
             "reason_text": T_ALT_REASON, "strategy": tpl}]


def plan(strategy: dict[str, Any], settings: dict[str, Any], base: dict[str, Any], md: MarketData) -> dict[str, Any]:
    trades = int(base["metrics"]["trades"])
    if trades < MIN_TRADES:
        return {"variants": [], "not_offered_text": T_NOT_OFFERED.format(n=fmt.number(trades))}
    candidates = sweeps(strategy, trades) + filters(strategy, base, md) + alternative(strategy)
    insts = {md.instrument.symbol: md.instrument}
    dr = DataRange(md.first_date, md.last_date)
    variants: list[dict[str, Any]] = []
    for c in candidates:
        s = c["strategy"]
        if schema_problems(s) or semantic_problems(s, insts, settings, dr):
            continue
        v = {k: val for k, val in c.items() if not k.startswith("_")}
        v["id"] = f"v{len(variants) + 1}"
        variants.append(v)
        if len(variants) == MAX_VARIANTS:
            break
    if not variants:
        return {"variants": [], "not_offered_text": T_NONE_APPLY}
    return {"variants": variants, "not_offered_text": None}


# Used only if the shared fixture file isn't packaged (e.g. a stripped image).
_TEMPLATE_FALLBACK: dict[str, Any] = {
    "schema_version": "1.0", "name": "Simple Trend Follower", "origin": "TEMPLATE", "template_id": TEMPLATE_ID,
    "underlying": "NIFTY50", "timeframe_min": 15, "holding": "INTRADAY", "position": {"lots": 1, "lot_size": 65},
    "indicators": {"ema9": {"type": "EMA", "period": 9, "source": "close"},
                   "ema21": {"type": "EMA", "period": 21, "source": "close"}},
    "legs": [{"action": "BUY", "option_type": "SIGNAL", "expiry": "CURRENT_WEEKLY",
              "strike": {"method": "MONEYNESS", "moneyness": "ATM", "distance_pts": 0}}],
    "entry": {"ce": {"type": "cross", "left": {"ind": "ema9", "output": "value"}, "direction": "above",
                     "right": {"ind": "ema21", "output": "value"}},
              "pe": {"type": "cross", "left": {"ind": "ema9", "output": "value"}, "direction": "below",
                     "right": {"ind": "ema21", "output": "value"}}},
    "exit": {"stop_loss": {"type": "PCT_PREMIUM", "value": 30}, "target": {"type": "PCT_PREMIUM", "value": 50}},
    "advanced": {"entry_windows": [{"from": "09:30", "to": "14:30"}], "daily": {"max_trades": 2}},
}

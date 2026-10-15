"""Strategy validation: JSON Schema, then the semantic rules SEM-01…20 (contracts/strategy-rules.md).

Every problem is plain English with a field label (never a path). The web app's strategyRules.ts
implements the same rules; shared fixtures prove both sides agree.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from nikasha_engine.core.schemas import validator
from nikasha_engine.instruments.registry import Instrument, hhmm_to_min, min_to_hhmm

OUTPUTS_BY_TYPE: dict[str, set[str]] = {
    "EMA": {"value"},
    "SMA": {"value"},
    "RSI": {"value"},
    "ADX": {"value", "plus_di", "minus_di"},
    "SUPERTREND": {"value"},
    "MACD": {"value", "signal", "hist"},
    "BBANDS": {"upper", "middle", "lower"},
    "OPENING_RANGE": {"high", "low"},
    "PIVOTS": {"p", "tc", "bc", "r1", "r2", "r3", "s1", "s2", "s3", "cpr_width", "cpr_width_pct"},
}
MAX_DEPTH = 4
MAX_CONDITIONS_PER_SIDE = 30
MAX_QUANTITY = 100_000


@dataclass(frozen=True)
class Problem:
    rule: str | None
    field_label: str
    message: str

    def as_dict(self) -> dict[str, str]:
        d = {"field_label": self.field_label, "message": self.message}
        if self.rule:
            d["rule"] = self.rule
        return d


@dataclass(frozen=True)
class DataRange:
    first: date
    last: date


def fmt_date(d: date) -> str:
    return f"{d.day} {d.strftime('%b %Y')}"


# ---------- schema problems in plain English ----------

_SCHEMA_LABELS: list[tuple[str, str, str]] = [
    # (path prefix, field label, message)
    ("legs/*/strike", "Strike", "Choose one way to pick the strike."),
    ("indicators", "Indicator settings", "One of the indicators isn't set up in a way Nikasha supports."),
    ("timeframe_min", "Candle timeframe", "Choose one of the candle timeframes Nikasha offers."),
    ("holding", "Holding", "Choose Intraday or Positional."),
    ("position", "Position size", "Enter whole numbers of lots and a lot size."),
    ("legs", "Options to trade", "Each option leg needs a buy/sell action, option type, expiry and strike."),
    ("entry", "Entry conditions", "The entry rule isn't complete or uses something Nikasha doesn't support."),
    ("exit/stop_loss", "Stop-loss", "The stop-loss isn't set up in a way Nikasha supports."),
    ("exit/target", "Target", "The target isn't set up in a way Nikasha supports."),
    ("exit/time_exit", "Exit rule", "The time exit needs a time and a day."),
    ("exit", "Exit rule", "The exit rule isn't set up in a way Nikasha supports."),
    ("advanced", "Advanced options", "One of the advanced options isn't set up in a way Nikasha supports."),
    ("underlying", "Instrument", "This instrument isn't available in Nikasha yet."),
    ("schema_version", "Strategy", "This strategy was made by a different version of Nikasha."),
    ("", "Strategy", "Your strategy has a part Nikasha can't read."),
]


def _path_key(path: list[Any]) -> str:
    return "/".join("*" if isinstance(p, int) else str(p) for p in path)


def schema_problems(strategy: Any) -> list[Problem]:
    errors = list(validator("strategy.schema.json").iter_errors(strategy))
    if not errors:
        return []
    problems: list[Problem] = []
    seen: set[str] = set()
    for err in errors:
        key = _path_key(list(err.absolute_path))
        if not key and err.validator == "required" and "'" in err.message:
            key = err.message.split("'")[1]
        for prefix, label, message in _SCHEMA_LABELS:
            if prefix and key != prefix and not key.startswith(prefix + "/"):
                continue
            if label not in seen:
                seen.add(label)
                problems.append(Problem("SEM-19" if prefix == "legs/*/strike" else None, label, message))
            break
    return problems


def settings_problems(settings: Any) -> list[Problem]:
    """Shape of EvaluationSettings (period, all costs present, no defaults applied)."""
    out: list[Problem] = []
    if not isinstance(settings, dict):
        return [Problem(None, "Evaluation settings", "Evaluation settings are missing.")]
    allowed = {"period", "costs", "capital_rupees"}
    if set(settings) - allowed:
        out.append(Problem(None, "Evaluation settings", "The evaluation settings have a part Nikasha can't read."))
    period = settings.get("period")
    ok_period = isinstance(period, dict) and set(period) == {"start", "end"}
    if isinstance(period, dict) and ok_period:
        try:
            date.fromisoformat(period["start"])
            date.fromisoformat(period["end"])
        except (TypeError, ValueError):
            ok_period = False
    if not ok_period:
        out.append(Problem(None, "Backtest period", "Choose a start and end date for the backtest."))
    costs = settings.get("costs")
    keys = (
        "brokerage_per_order",
        "stt_sell_pct",
        "stt_exercise_pct",
        "exchange_txn_pct",
        "sebi_per_crore",
        "stamp_buy_pct",
        "gst_pct",
        "slippage_pts",
    )
    if (
        not isinstance(costs, dict)
        or set(costs) != set(keys)
        or any(isinstance(costs[k], bool) or not isinstance(costs[k], int | float) or costs[k] < 0 for k in keys)
    ):
        out.append(Problem(None, "Costs", "Every cost item needs a value of zero or more."))
    cap = settings.get("capital_rupees")
    if cap is not None and (isinstance(cap, bool) or not isinstance(cap, int | float) or cap <= 0):
        out.append(Problem(None, "Capital", "Capital must be more than zero, or left empty."))
    return out


# ---------- semantic rules ----------


def _walk(node: dict[str, Any], depth: int = 0) -> tuple[int, int, list[dict[str, Any]]]:
    """(max group depth, leaf count, all nodes) of a condition tree."""
    if node["type"] in ("all", "any"):
        max_d, leaves, nodes = depth + 1, 0, [node]
        for child in node["conditions"]:
            d, n, sub = _walk(child, depth + 1)
            max_d, leaves = max(max_d, d), leaves + n
            nodes += sub
        return max_d, leaves, nodes
    return depth, 1, [node]


def _operands(node: dict[str, Any]) -> list[dict[str, Any]]:
    t = node["type"]
    if t in ("compare", "cross"):
        return [node["left"], node["right"]]
    if t == "slope":
        return [node["operand"]]
    return []


def _allowed_minutes(strategy: dict[str, Any], inst: Instrument) -> bool:
    """SEM-18: do the entry / no-entry windows leave at least one fill minute?

    The expiry-day cutoff only limits expiry days, so on its own it never leaves zero minutes.
    """
    adv = strategy.get("advanced") or {}
    last = inst.squareoff - 1 if strategy["holding"] == "INTRADAY" else inst.last_bar
    minutes = set(range(inst.first_bar, last + 1))
    if adv.get("entry_windows"):
        allowed: set[int] = set()
        for w in adv["entry_windows"]:
            allowed |= set(range(hhmm_to_min(w["from"]), hhmm_to_min(w["to"])))
        minutes &= allowed
    for w in adv.get("no_entry_windows") or []:
        minutes -= set(range(hhmm_to_min(w["from"]), hhmm_to_min(w["to"])))
    return bool(minutes)


def semantic_problems(
    strategy: dict[str, Any],
    instruments: dict[str, Instrument],
    settings: dict[str, Any] | None = None,
    data_range: DataRange | None = None,
) -> list[Problem]:
    """SEM-01…25 on a schema-valid strategy. Returns problems in rule order."""
    probs: list[Problem] = []
    inst = instruments.get(strategy["underlying"])
    if inst is None:
        return [Problem("SEM-01", "Instrument", "This instrument isn't available in Nikasha yet.")]

    # SEM-02
    if strategy["timeframe_min"] not in inst.allowed_timeframes:
        names = ", ".join(_tf_name(x) for x in inst.allowed_timeframes)
        probs.append(Problem("SEM-02", "Candle timeframe", f"Choose one of these candle timeframes: {names}."))

    indicators: dict[str, Any] = strategy["indicators"]
    entry: dict[str, Any] = strategy["entry"]
    exit_when: dict[str, Any] = strategy["exit"].get("exit_when") or {}
    # Entry and exit condition sets share SEM-03, 04 and 15.
    sides = [entry[k] for k in ("ce", "pe", "all_legs") if k in entry] + list(exit_when.values())
    all_nodes: list[dict[str, Any]] = []
    for tree in sides:
        all_nodes += _walk(tree)[2]
    level_specs = _level_specs(strategy)

    # SEM-03
    missing: list[str] = []
    level_refs = [o for spec in level_specs for o in (spec.get("ce"), spec.get("pe")) if o and "ind" in o]
    for o in level_refs:
        ind = indicators.get(o["ind"])
        if ind is None or o["output"] not in OUTPUTS_BY_TYPE[ind["type"]]:
            missing.append(o["ind"])
    for node in all_nodes:
        refs = [o for o in _operands(node) if "ind" in o]
        for o in refs:
            ind = indicators.get(o["ind"])
            if ind is None or o["output"] not in OUTPUTS_BY_TYPE[ind["type"]]:
                missing.append(o["ind"])
        if node["type"] in ("state", "turns") and node["ind"] not in indicators:
            missing.append(node["ind"])
    if missing:
        probs.append(
            Problem(
                "SEM-03", "Entry conditions", f"A condition uses an indicator that hasn't been set up: {missing[0]}."
            )
        )

    # SEM-04
    for node in all_nodes:
        if node["type"] in ("state", "turns"):
            ind = indicators.get(node["ind"])
            if ind is not None and ind["type"] != "SUPERTREND":
                probs.append(Problem("SEM-04", "Entry conditions", "'Turns green/red' only works with Supertrend."))
                break

    # SEM-05
    if any(i["type"] == "MACD" and i["fast"] >= i["slow"] for i in indicators.values()):
        probs.append(Problem("SEM-05", "Indicator settings", "MACD fast period must be shorter than the slow period."))

    # SEM-06
    interval = inst.strike_interval
    for leg in strategy["legs"]:
        s = leg["strike"]
        if s["method"] != "MONEYNESS":
            continue
        d = float(s["distance_pts"])
        bad = d != 0 if s["moneyness"] == "ATM" else (d <= 0 or abs(d / interval - round(d / interval)) > 1e-9)
        if bad:
            probs.append(
                Problem(
                    "SEM-06",
                    "Strike",
                    f"For ITM or OTM, enter a distance in steps of {_num(interval)} points "
                    f"(e.g. {_num(interval * 2)}).",
                )
            )
            break

    ex: dict[str, Any] = strategy["exit"]
    adv: dict[str, Any] = strategy.get("advanced") or {}
    intraday = strategy["holding"] == "INTRADAY"
    sq = min_to_hhmm(inst.squareoff)

    # SEM-07
    if not intraday and not (
        "target" in ex
        or "time_exit" in ex
        or ex.get("hold_to_expiry")
        or "exit_after_candles" in adv
        or "exit_when" in ex
    ):
        probs.append(
            Problem(
                "SEM-07",
                "Exit rule",
                "Choose what should happen to an open positional trade: hold until expiry, exit at a set time on "
                "expiry day, set a target, or exit after a number of candles.",
            )
        )

    # SEM-08
    if intraday:
        te = ex.get("time_exit")
        if ex.get("hold_to_expiry") or (te and (te["on"] != "ENTRY_DAY" or hhmm_to_min(te["at"]) >= inst.squareoff)):
            probs.append(Problem("SEM-08", "Exit rule", f"Intraday positions close by {sq}, so this exit can't apply."))

    # SEM-09
    fb, lb = inst.first_bar, inst.last_bar
    times: list[str] = []
    windows = list(adv.get("entry_windows") or []) + list(adv.get("no_entry_windows") or [])
    if "at_time" in entry:
        times.append(entry["at_time"])
    if adv.get("expiry_day_cutoff"):
        times.append(adv["expiry_day_cutoff"])
    if ex.get("time_exit"):
        times.append(ex["time_exit"]["at"])
    for w in windows:
        times += [w["from"], w["to"]]
    bad_time = any(not fb <= hhmm_to_min(t) <= lb for t in times)
    bad_window = any(hhmm_to_min(w["from"]) >= hhmm_to_min(w["to"]) for w in windows)
    bad_at = intraday and "at_time" in entry and hhmm_to_min(entry["at_time"]) >= inst.squareoff
    sem09 = bad_time or bad_window or bad_at
    if sem09:
        probs.append(
            Problem(
                "SEM-09",
                "Times",
                f"Times must be within market hours ({min_to_hhmm(fb)}–{min_to_hhmm(lb)}), "
                "and a window must start before it ends.",
            )
        )

    # SEM-10
    legs = strategy["legs"]
    types = [leg["option_type"] for leg in legs]
    can_ce = any(t in ("CE", "SIGNAL") for t in types)
    can_pe = any(t in ("PE", "SIGNAL") for t in types)
    sem10 = False
    if "SIGNAL" in types and (len(legs) != 1 or not ("ce" in entry or "pe" in entry)):
        sem10 = True
    for t in types:
        if t == "CE" and not ("ce" in entry or "all_legs" in entry or "at_time" in entry):
            sem10 = True
        if t == "PE" and not ("pe" in entry or "all_legs" in entry or "at_time" in entry):
            sem10 = True
    if ("ce" in entry and not can_ce) or ("pe" in entry and not can_pe):
        sem10 = True
    if sem10:
        probs.append(Problem("SEM-10", "Entry trigger", "The entry rule doesn't match the options you chose to trade."))

    # SEM-11
    if len(legs) > 1:
        if (
            "SIGNAL" in types
            or "ce" in entry
            or "pe" in entry
            or not ("all_legs" in entry or "at_time" in entry)
            or len({leg["expiry"] for leg in legs}) > 1
            or ex["stop_loss"]["type"] == "TRIGGER_CANDLE"
        ):
            probs.append(
                Problem(
                    "SEM-11",
                    "Legs",
                    "Multi-leg strategies open all legs together on the same expiry, with one combined stop-loss.",
                )
            )

    # SEM-12
    vs = adv.get("vix_sizing")
    if vs and not _bands_cover(vs["bands"]):
        probs.append(
            Problem(
                "SEM-12",
                "Volatility sizing",
                "Volatility sizing must say what to do for every VIX level, with no gaps or overlaps.",
            )
        )

    # SEM-13 and SEM-14 need the period (evaluate requests)
    period = (settings or {}).get("period") if settings else None
    if period:
        start, end = date.fromisoformat(period["start"]), date.fromisoformat(period["end"])
        weekly_from = inst.periods["WEEKLY"].available_from
        if any(leg["expiry"] in ("CURRENT_WEEKLY", "NEXT_WEEKLY") for leg in legs) and start < weekly_from:
            probs.append(
                Problem(
                    "SEM-13",
                    "Expiry",
                    f"Weekly options only exist from {fmt_date(weekly_from)}. "
                    "Choose a later start date or monthly expiry.",
                )
            )
        if data_range and not (data_range.first <= start < end <= data_range.last):
            probs.append(
                Problem(
                    "SEM-14",
                    "Backtest period",
                    f"Choose dates between {fmt_date(data_range.first)} and {fmt_date(data_range.last)}.",
                )
            )

    # SEM-15
    for tree in sides:
        depth, leaves, _ = _walk(tree)
        if depth > MAX_DEPTH or leaves > MAX_CONDITIONS_PER_SIDE:
            probs.append(Problem("SEM-15", "Entry conditions", "This entry rule is too complex. Please simplify it."))
            break

    # SEM-16
    if ex["stop_loss"]["type"] == "TRIGGER_CANDLE" and not any(k in entry for k in ("ce", "pe", "all_legs")):
        probs.append(
            Problem(
                "SEM-16",
                "Stop-loss",
                "'Trigger candle' stop-loss needs an entry signal candle; a fixed-time entry has none.",
            )
        )

    # SEM-17
    te = ex.get("time_exit")
    if intraday and (ex.get("hold_to_expiry") or (te and te["on"] == "EXPIRY_DAY")):
        probs.append(Problem("SEM-17", "Exit rule", "This exit only applies to positional strategies."))

    # SEM-18 (only meaningful once the times themselves are valid, SEM-09)
    if not sem09 and not _allowed_minutes(strategy, inst):
        probs.append(Problem("SEM-18", "Entry timing", "Your time windows leave no time to enter a trade."))

    # SEM-20
    pos = strategy["position"]
    if pos["lots"] * pos["lot_size"] > MAX_QUANTITY:
        probs.append(Problem("SEM-20", "Position size", "That position size is too large to simulate."))

    # SEM-21
    if adv.get("trail_to_cost_at_r") is not None and adv.get("trail_to_cost_at_pts") is not None:
        probs.append(
            Problem(
                "SEM-21",
                "Trail to cost",
                "Choose one way to move the stop to cost: a multiple of the risk, or premium points.",
            )
        )

    pe_spec = adv.get("partial_exit")
    uses_levels = bool(level_specs) or bool(pe_spec and pe_spec["then_stop"] == "PARTIAL_CANDLE")
    # SEM-22
    if uses_levels and len(legs) > 1:
        probs.append(Problem("SEM-22", "Exit levels", "Index-level exits work with one leg only."))
    # SEM-23
    if level_specs and len(legs) == 1:
        otype = legs[0]["option_type"]
        need = {"CE": ["ce"], "PE": ["pe"]}.get(otype, ["ce", "pe"])
        bad = any(k not in spec or not ("ind" in spec[k] or "const" in spec[k]) for spec in level_specs for k in need)
        if bad:
            probs.append(
                Problem(
                    "SEM-23",
                    "Exit levels",
                    "Give the index level for each side you trade (calls and puts), using an indicator value or a "
                    "number.",
                )
            )
    # SEM-24
    if exit_when:
        keys = set(exit_when)
        otype = legs[0]["option_type"]
        if len(legs) > 1:
            ok = keys == {"all_legs"}
        elif otype == "SIGNAL":
            ok = "all_legs" not in keys
        else:
            ok = keys <= {otype.lower(), "all_legs"} and len(keys) == 1
        if not ok:
            probs.append(
                Problem(
                    "SEM-24",
                    "Exit conditions",
                    "The exit conditions don't match the option type: use call and put conditions for one signal "
                    "leg, or one set for all legs.",
                )
            )
    # SEM-25
    if pe_spec and pos["lots"] < 2:
        probs.append(
            Problem(
                "SEM-25",
                "Partial exit",
                "A partial exit needs at least 2 lots, so part of the position can be closed and part kept.",
            )
        )

    return probs


def _level_specs(strategy: dict[str, Any]) -> list[dict[str, Any]]:
    """Every SPOT_LEVEL spec (target, partial exit): each has optional `ce` / `pe` operands."""
    out: list[dict[str, Any]] = []
    tgt = strategy["exit"].get("target")
    if tgt and tgt["type"] == "SPOT_LEVEL":
        out.append(tgt)
    pe_spec = (strategy.get("advanced") or {}).get("partial_exit")
    if pe_spec and pe_spec["when"]["type"] == "SPOT_LEVEL":
        out.append(pe_spec["when"])
    return out


def _bands_cover(bands: list[dict[str, Any]]) -> bool:
    ordered = sorted(bands, key=lambda b: b.get("vix_from", 0.0))
    first, last = ordered[0], ordered[-1]
    if first.get("vix_from", 0) not in (0, 0.0):
        return False
    if "vix_to" in last:
        return False
    for a, b in zip(ordered, ordered[1:], strict=False):
        if "vix_to" not in a or "vix_from" not in b or a["vix_to"] != b["vix_from"]:
            return False
    return all(("vix_to" not in b) or b.get("vix_from", 0) < b["vix_to"] for b in ordered)


def _num(x: float) -> str:
    return str(int(x)) if float(x).is_integer() else str(x)


def _tf_name(m: int) -> str:
    if m < 60:
        return f"{m} min"
    return f"{m // 60} hour" if m == 60 else f"{m // 60} hours"

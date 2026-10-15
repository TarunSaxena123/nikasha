"""Settings used, skipped data/signals, "How this was simulated" and disclosures (REQ-RPT-11…13)."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from nikasha_engine.core.paths import contracts_dir
from nikasha_engine.instruments.registry import COST_KEYS, Instrument, min_to_hhmm
from nikasha_engine.report import fmt

SKIP_TEXTS = {
    "CONFLICTING_SIGNALS": "Call and put signals at the same time",
    "POSITION_OPEN": "A trade was already open",
    "OUTSIDE_ENTRY_WINDOW": "Outside your entry windows",
    "IN_NO_ENTRY_WINDOW": "Inside a no-entry window",
    "AFTER_EXPIRY_CUTOFF": "After the expiry-day cutoff",
    "MAX_TRADES": "Daily trade limit reached",
    "SL_HITS_LIMIT": "Daily stop-loss limit reached",
    "MAX_DAILY_LOSS": "Daily loss limit reached",
    "AFTER_SQUAREOFF": "Too late in the day (at or after the intraday square-off)",
    "NEXT_DAY_FILL": "Signal on the last candle of the day (would only fill the next morning)",
    "NO_CONTRACT": "No option contract of the chosen expiry on that date",
    "EXPIRY_AFTER_DATA_END": "The contract would expire after the last date in the data",
    "UNPRICEABLE": "Price data missing at the entry minute",
    "EXIT_LEVELS_UNAVAILABLE": "The stop-loss or target couldn't be set at entry",
}

EXIT_TEXTS = {
    "STOP_LOSS": "Stop-loss hit",
    "TARGET": "Target reached",
    "TRAIL_TO_COST": "Stop moved to entry price, then hit",
    "TIME_EXIT": "Time exit",
    "SQUARE_OFF": "Intraday square-off",
    "N_CANDLES": "Exit after the set number of candles",
    "EXPIRY_SETTLEMENT": "Settled at expiry at intrinsic value",
    "SIGNAL_EXIT": "Exit condition met",
    "SPOT_TARGET": "Index reached the target level",
    "TRAILING_STOP": "Index broke back past the partial-exit candle",
}

LEVEL_OUTPUTS = {
    "high": "high",
    "low": "low",
    "p": "P",
    "tc": "TC",
    "bc": "BC",
    "r1": "R1",
    "r2": "R2",
    "r3": "R3",
    "s1": "S1",
    "s2": "S2",
    "s3": "S3",
    "cpr_width": "CPR width",
    "cpr_width_pct": "CPR width %",
    "value": "",
}


def _indicator_name(ind: dict[str, Any] | None) -> str:
    if ind is None:
        return "indicator"
    t = ind["type"]
    if t == "OPENING_RANGE":
        return f"Opening range {ind['minutes']}"
    if t == "PIVOTS":
        return "Pivots"
    if t in ("EMA", "SMA", "RSI", "ADX", "BBANDS"):
        return f"{t} {ind['period']}"
    return str(t).title()


def level_text(op: dict[str, Any], indicators: dict[str, Any]) -> str:
    """An index level in words: "Pivots R2", "Opening range 15 high" or a number."""
    if "const" in op:
        return fmt.points(op["const"])
    name = _indicator_name(indicators.get(op["ind"]))
    out = LEVEL_OUTPUTS.get(op["output"], op["output"])
    return f"{name} {out}".strip()


def _sides_text(spec: dict[str, Any], indicators: dict[str, Any]) -> str:
    parts = [
        f"{level_text(spec[k], indicators)} ({'calls' if k == 'ce' else 'puts'})" for k in ("ce", "pe") if k in spec
    ]
    return " / ".join(parts)


def _partial_text(pe: dict[str, Any], indicators: dict[str, Any]) -> str:
    w = pe["when"]
    if w["type"] == "SPOT_LEVEL":
        when = f"when the index reaches {_sides_text(w, indicators)}"
    else:
        g = w["gain"]
        unit = {"PCT_PREMIUM": "% of the premium", "POINTS": " premium points", "RR": " × the initial risk"}[g["type"]]
        when = f"after a gain of {fmt.points(g['value'])}{unit}"
    then = {
        "UNCHANGED": "the rest keeps its exits",
        "COST": "the rest's stop moves to the entry price",
        "PARTIAL_CANDLE": "the rest exits if the index breaks back past that candle's low (or high)",
    }[pe["then_stop"]]
    return f"Close {pe['percent']}% of the lots {when}; {then}"


EXPIRY_TEXTS = {
    "CURRENT_WEEKLY": "Current weekly expiry",
    "NEXT_WEEKLY": "Next weekly expiry",
    "MONTHLY": "Monthly expiry",
}


@lru_cache(maxsize=1)
def advanced_options() -> list[dict[str, str]]:
    data = json.loads((contracts_dir() / "advanced-options.json").read_text(encoding="utf-8"))
    return list(data["options"])


def timeframe_text(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes}-minute candles"
    hours = minutes // 60
    return "1-hour candles" if hours == 1 else f"{hours}-hour candles"


def _windows(ws: list[dict[str, str]]) -> str:
    return ", ".join(f"{w['from']}–{w['to']}" for w in ws)


def _leg_text(leg: dict[str, Any]) -> str:
    action = "Buy" if leg["action"] == "BUY" else "Sell"
    otype = {"CE": "call", "PE": "put", "SIGNAL": "call or put"}[leg["option_type"]]
    s = leg["strike"]
    if s["method"] == "MONEYNESS":
        strike = (
            "at the money" if s["moneyness"] == "ATM" else f"{fmt.points(s['distance_pts'])} points {s['moneyness']}"
        )
    elif s["method"] == "DELTA":
        strike = f"delta {s['target_delta']}"
    else:
        strike = f"premium near {fmt.rupees(s['target_premium'], 2)}"
    return f"{action} {otype}, {strike}"


def advanced_used(strategy: dict[str, Any]) -> list[dict[str, Any]]:
    adv: dict[str, Any] = strategy.get("advanced") or {}
    ex: dict[str, Any] = strategy["exit"]
    legs: list[dict[str, Any]] = strategy["legs"]
    tgt = ex.get("target") or {}
    values: dict[str, str | None] = {
        "sl_cap": f"Stop no more than {fmt.points(adv['sl_cap_pts'])} points from entry"
        if "sl_cap_pts" in adv
        else None,
        "trigger_candle_sl": (
            "Stop at the signal candle's premium low (bought options) or high (sold options)"
            if ex["stop_loss"]["type"] == "TRIGGER_CANDLE"
            else None
        ),
        "rr_target": f"Target at {fmt.points(tgt['value'])} × the stop distance" if tgt.get("type") == "RR" else None,
        "trail_to_cost": (
            f"Stop moves to the entry price after a gain of {fmt.points(adv['trail_to_cost_at_r'])} × the initial risk"
            if "trail_to_cost_at_r" in adv
            else f"Stop moves to the entry price after a gain of {fmt.points(adv['trail_to_cost_at_pts'])} points"
            if "trail_to_cost_at_pts" in adv
            else None
        ),
        "exit_conditions": (
            "Exit at the next minute's open when the exit conditions are true on a candle close"
            if ex.get("exit_when")
            else None
        ),
        "index_target": (
            f"Exit when the index reaches {_sides_text(tgt, strategy['indicators'])}"
            if tgt.get("type") == "SPOT_LEVEL"
            else None
        ),
        "partial_exit": _partial_text(adv["partial_exit"], strategy["indicators"]) if adv.get("partial_exit") else None,
        "exit_after_candles": (
            f"Exit after {fmt.count(adv['exit_after_candles'], 'candle')} if no stop or target is hit"
            if "exit_after_candles" in adv
            else None
        ),
        "vix_sizing": _vix_sizing_text(adv["vix_sizing"]) if "vix_sizing" in adv else None,
        "entry_windows": f"New entries only {_windows(adv['entry_windows'])}" if adv.get("entry_windows") else None,
        "no_entry_windows": f"No new entries {_windows(adv['no_entry_windows'])}"
        if adv.get("no_entry_windows")
        else None,
        "expiry_day_cutoff": (
            f"No new entries from {adv['expiry_day_cutoff']} on expiry day" if adv.get("expiry_day_cutoff") else None
        ),
        "daily_limits": _daily_text(adv["daily"]) if adv.get("daily") else None,
        "multiple_legs": (
            f"{len(legs)} legs, opened together with one combined stop-loss: "
            + "; ".join(_leg_text(leg) for leg in legs)
            if len(legs) > 1
            else None
        ),
        "strike_by_delta_premium": (
            "; ".join(_leg_text(leg) for leg in legs if leg["strike"]["method"] != "MONEYNESS")
            if any(leg["strike"]["method"] != "MONEYNESS" for leg in legs)
            else None
        ),
    }
    return [
        {"label": o["label"], "used": values[o["key"]] is not None, "value_text": values[o["key"]] or "Not used"}
        for o in advanced_options()
    ]


def _vix_sizing_text(vs: dict[str, Any]) -> str:
    when = "at the day's open" if vs["measured_at"] == "DAY_OPEN" else "at entry"
    parts = []
    for b in sorted(vs["bands"], key=lambda b: b.get("vix_from", 0)):
        lo, hi = b.get("vix_from"), b.get("vix_to")
        if lo is None or lo == 0:
            rng = f"below {fmt.points(hi)}" if hi is not None else "any level"
        elif hi is None:
            rng = f"{fmt.points(lo)} and above"
        else:
            rng = f"{fmt.points(lo)}–{fmt.points(hi)}"
        parts.append(f"{rng} → {fmt.points(b['size_pct'])}% of the lots")
    return f"VIX measured {when}: " + "; ".join(parts) + " (rounded down, at least 1 lot)"


def _daily_text(d: dict[str, Any]) -> str:
    parts = []
    if "max_trades" in d:
        parts.append(f"at most {fmt.count(d['max_trades'], 'trade')} a day")
    if "stop_after_sl_hits" in d:
        parts.append(f"stop for the day after {fmt.count(d['stop_after_sl_hits'], 'stop-loss', 'stop-losses')}")
    if "max_daily_loss_rupees" in d:
        parts.append(f"stop for the day after a loss of {fmt.rupees(d['max_daily_loss_rupees'])}")
    text = "; ".join(parts)
    return text[0].upper() + text[1:]


def _cost_value_text(key: str, value: float) -> str:
    if key == "brokerage_per_order":
        return f"{fmt.rupees(value, 2 if not float(value).is_integer() else 0)} per order"
    if key == "sebi_per_crore":
        return f"{fmt.rupees(value, 2 if not float(value).is_integer() else 0)} per crore"
    if key == "slippage_pts":
        return f"{fmt.points(value)} points per fill"
    return f"{value:g}%"


def settings_used(
    strategy: dict[str, Any],
    settings: dict[str, Any],
    inst: Instrument,
    period_text: str,
    no_effect: dict[str, int],
) -> dict[str, Any]:
    pos = strategy["position"]
    lots, size = int(pos["lots"]), int(pos["lot_size"])
    qty_text = f"{fmt.count(lots, 'lot')} × {size} = {fmt.number(lots * size)} quantity per trade"
    if (strategy.get("advanced") or {}).get("vix_sizing"):
        qty_text += " (changed by volatility sizing on some trades)"
    sq = min_to_hhmm(inst.squareoff)
    holding = (
        f"Intraday (closed by {sq})" if strategy["holding"] == "INTRADAY" else "Positional (can be held overnight)"
    )
    costs = [
        {
            "label": inst.default_costs[k]["label"],
            "value_text": _cost_value_text(k, float(settings["costs"][k])),
            "source": inst.default_costs[k]["source"],
        }
        for k in COST_KEYS
    ]
    cap = settings.get("capital_rupees")
    return {
        "quantity_text": qty_text,
        "holding_text": holding,
        "timeframe_text": timeframe_text(int(strategy["timeframe_min"])),
        "expiry_text": EXPIRY_TEXTS[strategy["legs"][0]["expiry"]],
        "period_text": period_text,
        "costs": costs,
        "risk_free_rate_pct": round(inst.risk_free_rate * 100, 4),
        "capital_text": fmt.rupees(float(cap)) if cap else "Not entered",
        "advanced": advanced_used(strategy),
        "no_effect_rules": [{"text": t, "trades_affected": n} for t, n in sorted(no_effect.items())],
    }


def simulation_notes(inst: Instrument, settings: dict[str, Any]) -> list[str]:
    sq = min_to_hhmm(inst.squareoff)
    vol = inst.volatility_name
    return [
        "Entries fill at the open of the minute after the signal candle closes (or at the fixed entry time).",
        "Stop-loss and target are checked every minute; if both are reached in the same minute, the stop-loss "
        "is assumed to come first.",
        f"Intraday positions are closed at {sq}.",
        "Positions still open at expiry are settled at intrinsic value, using the expiry day's last minute.",
        f"Strikes are chosen from the index level at the signal, rounded to {fmt.points(inst.strike_interval)} points.",
        f"Option premiums are modelled with Black-Scholes using {vol} as the volatility (each minute's range uses "
        f"that minute's closing {vol}) and a {fmt.points(round(inst.risk_free_rate * 100, 4))}% risk-free rate.",
        f"Slippage of {fmt.points(float(settings['costs']['slippage_pts']))} points is applied to every fill.",
        "Charges are applied at today's rates for the whole period.",
        "Only one position is open at a time.",
        "Missing market data is never filled in; minutes and days without data are skipped.",
    ]


def disclosures(inst: Instrument) -> dict[str, str]:
    vol = inst.volatility_name
    return {
        "modelled_premiums_text": (
            "Premiums modelled, not actual. Nikasha has no historical option prices, so every option price in this "
            f"report is calculated from the index level and {vol}. Real prices, and so real results, would differ."
        ),
        "volatility_limitation_text": (
            f"{vol} measures expected 30-day volatility for near-the-money options. It doesn't capture how far-from-"
            "the-money options or options close to expiry are priced, so results for expiry-day trades and far "
            "strikes are the least reliable."
        ),
        "costs_note_text": (
            "Costs use the rates you confirmed, which are today's rates. Charges were different in earlier years, "
            "and that change isn't modelled."
        ),
    }

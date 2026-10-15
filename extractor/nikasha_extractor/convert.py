"""ExtractionDraft → ExtractionResult (feature 04 design §2.3). Deterministic; no LLM.

- Builds a partial strategy in the shape of strategy.schema.json. Unstated values stay absent.
- Rebuilds the condition tree from parent ids; remembers each row's JSON Pointer.
- Turns VAGUE items into questions whose options carry RFC 6902 patches (or NUMBER/TIME targets).
- Texts from the model are trimmed and replaced by a fixed fallback if they contain a banned phrase.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from nikasha_extractor.core.errors import ExtractError
from nikasha_extractor.schema import ConditionRow, ExtractionDraft, Item, Operand

FALLBACK_TEXT = "We found a rule here; please check it on the review screen"
FIELD_LABELS: dict[str, str] = {
    "action": "Buy or sell",
    "option_side": "Option type",
    "moneyness": "Strike",
    "distance_pts": "Strike distance",
    "expiry": "Expiry",
    "timeframe_min": "Candle timeframe",
    "holding": "Holding",
    "lots": "Number of lots",
    "lot_size": "Lot size",
    "fixed_entry_time": "Entry time",
    "entry_condition": "Entry conditions",
    "stop_loss": "Stop-loss",
    "target": "Target",
    "time_exit": "Time exit",
    "hold_to_expiry": "Exit rule",
    "indicator": "Indicators",
    "sl_cap_pts": "SL cap",
    "trail_to_cost_at_r": "Trail stop to cost",
    "exit_after_candles": "Exit after N candles",
    "vix_sizing": "Volatility (VIX) sizing",
    "vix_band_size": "Volatility (VIX) sizing",
    "entry_windows": "Entry windows",
    "no_entry_windows": "No-entry windows",
    "expiry_day_cutoff": "Expiry-day cutoff",
    "daily_limits": "Daily limits",
    "condition": "Entry conditions",
    "condition_offset": "Entry conditions",
    "condition_kind": "Entry conditions",
    "slope_lookback": "Entry conditions",
    "expiry_weekday_term": "Expiry-day cutoff",
    "premarket_time": "Volatility (VIX) sizing",
    "exit_condition": "Exit conditions",
    "partial_exit": "Partial exit",
    "condition_value": "Entry conditions",
    "trail_to_cost_at_pts": "Trail stop to cost",
    "other": "Other rule",
}
MANDATORY = {
    "action",
    "option_side",
    "moneyness",
    "distance_pts",
    "expiry",
    "timeframe_min",
    "holding",
    "lots",
    "lot_size",
    "fixed_entry_time",
    "entry_condition",
    "stop_loss",
    "target",
    "time_exit",
    "condition",
    "condition_offset",
    "condition_kind",
    "slope_lookback",
    "condition_value",
    "exit_condition",
}
PARAMS = {
    "EMA": ("period", "source"),
    "SMA": ("period", "source"),
    "RSI": ("period",),
    "ADX": ("period",),
    "SUPERTREND": ("period", "multiplier"),
    "MACD": ("fast", "slow", "signal"),
    "BBANDS": ("period", "stddev", "source"),
    "OPENING_RANGE": ("minutes",),
    "PIVOTS": (),
}
TIME = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")


def _banned() -> list[str]:
    for base in (Path(__file__).resolve().parents[2] / "specs" / "contracts", Path("/var/task/contracts")):
        f = base / "banned-phrases.txt"
        if f.exists():
            return [
                x.strip().lower()
                for x in f.read_text(encoding="utf-8").splitlines()
                if x.strip() and not x.startswith("#")
            ]
    return ["buy now", "sell now", "guaranteed", "sure-shot", "best strategy", "we recommend", "you should trade"]


BANNED = _banned()


def clean(text: str, limit: int = 200) -> str:
    t = " ".join(text.split())[:limit]
    return FALLBACK_TEXT if any(b in t.lower() for b in BANNED) else t


def _num(x: float | None) -> int | float | None:
    if x is None:
        return None
    return int(x) if float(x).is_integer() else x


# ---------- strategy ----------


def _operand(o: Operand | None) -> dict[str, Any] | None:
    if o is None:
        return None
    if o.kind == "indicator":
        out: dict[str, Any] = {"ind": o.ind, "output": o.output or "value"}
    elif o.kind == "price":
        out = {"price": o.price}
    elif o.kind == "vix":
        out = {"vix": o.vix or "close"}
    elif o.kind == "candle":
        return {"candle": o.candle or "range"}
    else:
        return {"const": _num(o.const)}
    if o.offset_pts is not None:
        out["offset"] = {"pts": _num(o.offset_pts)}
    elif o.offset_pct is not None:
        out["offset"] = {"pct": _num(o.offset_pct)}
    return out


def _node(r: ConditionRow, children: list[dict[str, Any]]) -> dict[str, Any]:
    k = r.kind
    if k in ("all", "any"):
        return {"type": k, "conditions": children}
    if k == "compare":
        # A missing right side is a vague threshold still to be asked (condition_value): an empty slot.
        return {"type": "compare", "left": _operand(r.left), "op": r.op or "gt", "right": _operand(r.right) or {}}
    if k == "cross":
        return {
            "type": "cross",
            "left": _operand(r.left),
            "direction": r.direction if r.direction in ("above", "below") else "above",
            "right": _operand(r.right),
        }
    if k == "state":
        return {"type": "state", "ind": r.ind, "is": r.to_or_is or "up"}
    if k in ("turns", "state_or_turns"):
        # A pending choice is drafted as "turns"; its question replaces it (feature 04 design §2.3).
        return {"type": "turns", "ind": r.ind, "to": r.to_or_is or "up"}
    node: dict[str, Any] = {
        "type": "slope",
        "operand": _operand(r.left),
        "direction": "down" if r.direction == "down" else "up",
    }
    if r.lookback is not None:
        node["lookback"] = r.lookback
    return node


def build_tree(rows: list[ConditionRow]) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    """Per side, the condition tree; and each row id's JSON Pointer in the strategy.

    Entry sides are keyed ce / pe / all_legs; exit-condition sides exit_ce / exit_pe / exit_all_legs.
    """
    sides = {
        "CE": "ce",
        "PE": "pe",
        "ALL_LEGS": "all_legs",
        "EXIT_CE": "exit_ce",
        "EXIT_PE": "exit_pe",
        "EXIT_ALL_LEGS": "exit_all_legs",
    }
    trees: dict[str, dict[str, Any]] = {}
    pointers: dict[str, str] = {}

    def build(r: ConditionRow, path: str) -> dict[str, Any]:
        pointers[r.id] = path
        kids = [c for c in rows if c.parent_id == r.id]
        return _node(r, [build(c, f"{path}/conditions/{i}") for i, c in enumerate(kids)])

    for side, key in sides.items():
        roots = [r for r in rows if r.side == side and r.parent_id is None]
        if not roots:
            continue
        base = f"/exit/exit_when/{key[5:]}" if key.startswith("exit_") else f"/entry/{key}"
        if len(roots) == 1 and roots[0].kind in ("all", "any"):
            trees[key] = build(roots[0], base)
        else:
            trees[key] = {
                "type": "all",
                "conditions": [build(r, f"{base}/conditions/{i}") for i, r in enumerate(roots)],
            }
    return trees, pointers


def build_strategy(d: ExtractionDraft) -> tuple[dict[str, Any], dict[str, str]]:
    b = d.basics
    s: dict[str, Any] = {
        "schema_version": "1.0",
        "name": "Uploaded strategy",
        "origin": "UPLOAD",
        "underlying": "NIFTY50",
    }
    if b.timeframe_min is not None:
        s["timeframe_min"] = b.timeframe_min
    if b.holding:
        s["holding"] = b.holding
    pos = {k: v for k, v in (("lots", b.lots), ("lot_size", b.lot_size)) if v is not None}
    if pos:
        s["position"] = pos
    s["indicators"] = {
        i.id: {
            "type": i.type,
            **{
                p: _num(getattr(i, p)) if p != "source" else i.source
                for p in PARAMS[i.type]
                if getattr(i, p) is not None
            },
        }
        for i in d.indicators
    }
    leg: dict[str, Any] = {}
    if b.action:
        leg["action"] = b.action
    if b.expiry:
        leg["expiry"] = b.expiry
    if b.moneyness:
        strike: dict[str, Any] = {"method": "MONEYNESS", "moneyness": b.moneyness}
        if b.moneyness == "ATM":
            strike["distance_pts"] = 0
        elif b.distance_pts is not None:
            strike["distance_pts"] = _num(b.distance_pts)
        leg["strike"] = strike
    side = b.option_side
    if side == "CALL_AND_PUT_TOGETHER":
        s["legs"] = [{**leg, "option_type": "CE"}, {**leg, "option_type": "PE"}]
    elif side:
        s["legs"] = [{**leg, "option_type": {"CALL": "CE", "PUT": "PE", "BOTH_BY_SIGNAL": "SIGNAL"}[side]}]
    elif leg:
        s["legs"] = [leg]
    trees, pointers = build_tree(d.conditions)
    entry: dict[str, Any] = {k: v for k, v in trees.items() if not k.startswith("exit_")}
    exit_when = {k[5:]: v for k, v in trees.items() if k.startswith("exit_")}
    if b.fixed_entry_time:
        entry["at_time"] = b.fixed_entry_time
    if entry:
        s["entry"] = entry
    e = d.exit
    ex: dict[str, Any] = {}
    if e.sl_type:
        ex["stop_loss"] = {
            "type": e.sl_type,
            **({"value": _num(e.sl_value)} if e.sl_value is not None and e.sl_type != "TRIGGER_CANDLE" else {}),
        }
    if e.target_type == "SPOT_LEVEL":
        levels = {k: _operand(o) for k, o in (("ce", e.target_ce), ("pe", e.target_pe)) if o is not None}
        ex["target"] = {"type": "SPOT_LEVEL", **levels}
    elif e.target_type:
        ex["target"] = {
            "type": e.target_type,
            **({"value": _num(e.target_value)} if e.target_value is not None else {}),
        }
    if exit_when:
        ex["exit_when"] = exit_when
    if e.time_exit_at or e.time_exit_on:
        ex["time_exit"] = {k: v for k, v in (("at", e.time_exit_at), ("on", e.time_exit_on)) if v}
    if e.hold_to_expiry:
        ex["hold_to_expiry"] = True
    if ex:
        s["exit"] = ex
    a = d.advanced
    adv: dict[str, Any] = {}
    for key in ("sl_cap_pts", "trail_to_cost_at_r", "trail_to_cost_at_pts", "exit_after_candles", "expiry_day_cutoff"):
        v = getattr(a, key)
        if v is not None:
            adv[key] = _num(v) if isinstance(v, float | int) else v
    if a.vix_sizing is not None:
        vs: dict[str, Any] = {
            "bands": [
                {
                    k: _num(v)
                    for k, v in (("vix_from", band.vix_from), ("vix_to", band.vix_to), ("size_pct", band.size_pct))
                    if v is not None
                }
                for band in a.vix_sizing.bands
            ]
        }
        if a.vix_sizing.measured_at:
            vs["measured_at"] = a.vix_sizing.measured_at
        adv["vix_sizing"] = vs
    for key in ("entry_windows", "no_entry_windows"):
        ws = [{k: v for k, v in (("from", w.start), ("to", w.end)) if v} for w in getattr(a, key)]
        if ws:
            adv[key] = ws
    daily = {
        k: _num(v)
        for k, v in (
            ("max_trades", a.daily_max_trades),
            ("stop_after_sl_hits", a.daily_stop_after_sl_hits),
            ("max_daily_loss_rupees", a.daily_max_loss_rupees),
        )
        if v is not None
    }
    if daily:
        adv["daily"] = daily
    if a.partial_percent is not None or a.partial_when or a.partial_then:
        pe: dict[str, Any] = {}
        if a.partial_percent is not None:
            pe["percent"] = a.partial_percent
        if a.partial_when == "PREMIUM_GAIN":
            gain = {
                k: v for k, v in (("type", a.partial_gain_type), ("value", _num(a.partial_gain_value))) if v is not None
            }
            pe["when"] = {"type": "PREMIUM_GAIN", "gain": gain}
        elif a.partial_when == "SPOT_LEVEL":
            levels = {k: _operand(o) for k, o in (("ce", a.partial_ce), ("pe", a.partial_pe)) if o is not None}
            pe["when"] = {"type": "SPOT_LEVEL", **levels}
        if a.partial_then:
            pe["then_stop"] = a.partial_then
        adv["partial_exit"] = pe
    if adv:
        s["advanced"] = adv
    return s, pointers


# ---------- questions ----------


def _parse_value(field: str, text: str) -> Any:
    t = text.strip()
    if t.upper() == "SKIP":
        return "SKIP"
    if TIME.match(t):
        return t
    m = re.match(r"^-?\d+(\.\d+)?", t)
    if m and field not in (
        "expiry",
        "holding",
        "action",
        "condition_kind",
        "premarket_time",
        "moneyness",
        "option_side",
    ):
        return _num(float(m.group(0)))
    return t


def _patches(item: Item, value: Any, strategy: dict[str, Any], pointers: dict[str, str]) -> list[dict[str, Any]] | None:
    """Patch for one option value, or None when it can't be expressed (the option is dropped)."""
    f = item.field
    if value == "SKIP":
        return []
    legs = strategy.get("legs") or [{}]
    if f == "expiry" and value in ("CURRENT_WEEKLY", "NEXT_WEEKLY", "MONTHLY"):
        return [{"op": "add", "path": f"/legs/{i}/expiry", "value": value} for i in range(len(legs))]
    if f == "holding" and value in ("INTRADAY", "POSITIONAL"):
        return [{"op": "add", "path": "/holding", "value": value}]
    if f == "action" and value in ("BUY", "SELL"):
        return [{"op": "add", "path": f"/legs/{i}/action", "value": value} for i in range(len(legs))]
    if f == "timeframe_min" and isinstance(value, int):
        return [{"op": "add", "path": "/timeframe_min", "value": value}]
    if f in ("sl_cap_pts", "trail_to_cost_at_r", "trail_to_cost_at_pts", "exit_after_candles") and isinstance(
        value, int | float
    ):
        return [{"op": "add", "path": f"/advanced/{f}", "value": value}]
    if f in ("expiry_day_cutoff", "expiry_weekday_term") and isinstance(value, str) and TIME.match(value):
        return [{"op": "add", "path": "/advanced/expiry_day_cutoff", "value": value}]
    if f == "premarket_time" and value in ("DAY_OPEN", "ENTRY"):
        return [{"op": "add", "path": "/advanced/vix_sizing/measured_at", "value": value}]
    if f == "condition_kind" and value in ("turns", "state"):
        ops = []
        for t in item.targets:
            p = pointers.get(t[5:]) if t.startswith("cond:") else None
            if p is None:
                return None
            node = _get(strategy, p)
            if not isinstance(node, dict) or "ind" not in node:
                return None
            direction = node.get("to") or node.get("is") or "up"
            new = (
                {"type": "turns", "ind": node["ind"], "to": direction}
                if value == "turns"
                else {"type": "state", "ind": node["ind"], "is": direction}
            )
            ops.append({"op": "replace", "path": p, "value": new})
        return ops
    if f in ("stop_loss", "target") and isinstance(value, int | float):
        return [{"op": "add", "path": f"/exit/{f}/value", "value": value}]
    if f == "vix_band_size" and isinstance(value, int | float):
        return [{"op": "add", "path": p, "value": value} for p in _vix_band_paths(item)] or None
    if f in ("condition_offset", "slope_lookback", "condition_value") and isinstance(value, int | float):
        targets = _number_targets(item, pointers, strategy)
        return [{"op": "add", "path": t["path"], "value": value * t.get("multiplier", 1)} for t in targets] or None
    if f == "fixed_entry_time" and isinstance(value, str) and TIME.match(value):
        return [{"op": "add", "path": "/entry/at_time", "value": value}]
    if f == "distance_pts" and isinstance(value, int | float):
        return [{"op": "add", "path": f"/legs/{i}/strike/distance_pts", "value": value} for i in range(len(legs))]
    return None


def _get(doc: Any, pointer: str) -> Any:
    cur = doc
    for seg in pointer.split("/")[1:]:
        cur = cur[int(seg)] if isinstance(cur, list) else cur.get(seg) if isinstance(cur, dict) else None
        if cur is None:
            return None
    return cur


def _vix_band_paths(item: Item) -> list[str]:
    return [
        f"/advanced/vix_sizing/bands/{int(t.split(':')[1])}/size_pct" for t in item.targets if t.startswith("vix_band:")
    ]


def _number_targets(item: Item, pointers: dict[str, str], strategy: dict[str, Any]) -> list[dict[str, Any]]:
    out = []
    for t in item.targets:
        if not t.startswith("cond:") or t[5:] not in pointers:
            continue
        p = pointers[t[5:]]
        node = _get(strategy, p) or {}
        if item.field == "slope_lookback":
            out.append({"path": f"{p}/lookback"})
        elif item.field == "condition_value":
            out.append({"path": f"{p}/right/const"})
        else:
            # "decisively above" adds points; "decisively below" subtracts them (one answer, several places).
            sign = -1 if node.get("op") in ("lt", "lte") or node.get("direction") == "below" else 1
            target: dict[str, Any] = {"path": f"{p}/right/offset/pts"}
            if sign < 0:
                target["multiplier"] = -1
            out.append(target)
    return out


NUMBER_LIMITS: dict[str, tuple[float, float | None, float]] = {
    "condition_offset": (0, None, 1),
    "slope_lookback": (1, 50, 1),
    "vix_band_size": (1, 1000, 5),
    "sl_cap_pts": (0.05, None, 0.05),
    "stop_loss": (0.05, None, 0.05),
    "target": (0.05, None, 0.05),
    "exit_after_candles": (1, 500, 1),
    "trail_to_cost_at_r": (0.1, 20, 0.1),
    "trail_to_cost_at_pts": (0.05, None, 0.05),
    "condition_value": (0, None, 0.05),
    "distance_pts": (50, None, 50),
}


def build_question(item: Item, strategy: dict[str, Any], pointers: dict[str, str], n: int) -> dict[str, Any] | None:
    q = item.question
    if q is None:
        return None
    base: dict[str, Any] = {"id": f"q{n}", "item_id": item.id, "prompt": clean(q.prompt, 120)}
    if q.kind in ("CHOICE", "CONFIRM"):
        options = []
        for o in q.options:
            patch = _patches(item, _parse_value(item.field, o.value_text), strategy, pointers)
            if patch is not None:
                options.append({"label": clean(o.label, 120), "patch": patch})
        if not options:
            return None
        base["kind"] = q.kind
        base["options"] = options
        rec = q.recommended_option if q.kind == "CONFIRM" else None
        base["recommended_option_index"] = rec if rec is not None and 0 <= rec < len(options) else None
        if q.kind == "CONFIRM" and base["recommended_option_index"] is None:
            base["recommended_option_index"] = 0
        return base
    if q.kind == "NUMBER":
        if item.field == "vix_band_size":
            targets: list[dict[str, Any]] = [{"path": p} for p in _vix_band_paths(item)]
        elif item.field in ("condition_offset", "slope_lookback", "condition_value"):
            targets = _number_targets(item, pointers, strategy)
        else:
            path = {
                "sl_cap_pts": "/advanced/sl_cap_pts",
                "stop_loss": "/exit/stop_loss/value",
                "target": "/exit/target/value",
                "exit_after_candles": "/advanced/exit_after_candles",
                "trail_to_cost_at_r": "/advanced/trail_to_cost_at_r",
                "trail_to_cost_at_pts": "/advanced/trail_to_cost_at_pts",
                "lots": "/position/lots",
                "lot_size": "/position/lot_size",
                "timeframe_min": "/timeframe_min",
            }.get(item.field)
            targets = [{"path": path}] if path else []
        if not targets:
            return None
        lo, hi, step = NUMBER_LIMITS.get(item.field, (0, None, 1))
        number: dict[str, Any] = {
            "unit_label": clean(q.unit_label or "", 20) or "value",
            "min": lo,
            "step": step,
            "targets": targets,
        }
        if hi is not None:
            number["max"] = hi
        return {**base, "kind": "NUMBER", "number": number}
    path = {
        "fixed_entry_time": "/entry/at_time",
        "expiry_day_cutoff": "/advanced/expiry_day_cutoff",
        "expiry_weekday_term": "/advanced/expiry_day_cutoff",
        "time_exit": "/exit/time_exit/at",
    }.get(item.field)
    if not path:
        return None
    return {**base, "kind": "TIME", "time": {"path": path}}


def convert(d: ExtractionDraft) -> dict[str, Any]:
    strategy, pointers = build_strategy(d)
    items: list[dict[str, Any]] = []
    questions: list[dict[str, Any]] = []
    for item in d.items:
        out: dict[str, Any] = {
            "id": item.id,
            "status": item.status,
            "field_label": FIELD_LABELS.get(item.field, "Other rule"),
            "text": clean(item.reason if item.status == "UNSUPPORTED" and item.reason else item.understood),
            "mandatory": item.field in MANDATORY,
        }
        if item.quote.strip():
            out["quote"] = " ".join(item.quote.split())[:300]
        items.append(out)
        if item.status == "VAGUE":
            q = build_question(item, strategy, pointers, len(questions) + 1)
            if q is None:
                # A vague rule we can't ask about would mean guessing: fail rather than silently drop it.
                raise ExtractError("EXTRACTION_FAILED")
            questions.append(q)
    return {"items": items, "draft": strategy, "questions": questions, "ignored_text_found": d.ignored_text_found}

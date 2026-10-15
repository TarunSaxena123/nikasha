"""The schema actually sent to the LLM, and its mapping to ExtractionDraft (feature 04 design §2.2).

Structured outputs reject a schema whose compiled grammar is too large; in practice that is about
70 distinct fields in total, whatever their types, and at most 16 nullable (union) fields. So the
wire schema is compact and has no nullable or optional fields:
- "Not stated" is "" for text and numbers (numbers travel as text), NONE for choices, kind NONE for
  a question, and ref "" for an unused operand.
- An operand is one `ref` ("ema9", "macd.signal", "close", "vix.close" or a number) plus an offset.
- A condition row has one `op` for comparisons, cross directions and up/down.
- Indicator parameters are one comma-separated `params` text, in a fixed order per type.
- Advanced options are a list of {name, value} settings, only those the text states; an item's
  question is flattened into the item. Index levels are written "ce_ref|pe_ref" (target value,
  partial exit "level:…"); a premium-gain partial exit is "gain:TYPE:VALUE".
`from_wire` turns this back into ExtractionDraft, so convert.py and validate.py work on one internal
shape. A number that doesn't parse is treated as not stated, so the app asks instead of guessing.
"""

from __future__ import annotations

import math
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from nikasha_extractor import schema as d

NONE = "NONE"
PRICES = ("open", "high", "low", "close")
OUTPUTS = (
    "value",
    "signal",
    "hist",
    "upper",
    "middle",
    "lower",
    "plus_di",
    "minus_di",
    "high",
    "low",
    "p",
    "tc",
    "bc",
    "r1",
    "r2",
    "r3",
    "s1",
    "s2",
    "s3",
    "cpr_width",
    "cpr_width_pct",
)
# Order of the numbers in Indicator.params per type.
PARAMS: dict[str, tuple[str, ...]] = {
    "EMA": ("period",),
    "SMA": ("period",),
    "RSI": ("period",),
    "ADX": ("period",),
    "SUPERTREND": ("period", "multiplier"),
    "MACD": ("fast", "slow", "signal"),
    "BBANDS": ("period", "stddev"),
    "OPENING_RANGE": ("minutes",),
    "PIVOTS": (),
}
_INT_PARAMS = {"period", "fast", "slow", "signal", "minutes"}


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Operand(_Strict):
    ref: str
    offset_pts: str
    offset_pct: str


class Indicator(_Strict):
    id: str
    type: d.IndType
    source: Literal["open", "high", "low", "close", "NONE"]
    params: str


class ConditionRow(_Strict):
    id: str
    parent_id: str
    side: Literal["CE", "PE", "ALL_LEGS", "EXIT_CE", "EXIT_PE", "EXIT_ALL_LEGS"]
    kind: Literal["all", "any", "compare", "cross", "state", "turns", "slope", "state_or_turns"]
    left: Operand
    op: Literal["gt", "gte", "lt", "lte", "above", "below", "up", "down", "NONE"]
    right: Operand
    lookback: str


class Basics(_Strict):
    action: Literal["BUY", "SELL", "NONE"]
    option_side: Literal["CALL", "PUT", "BOTH_BY_SIGNAL", "CALL_AND_PUT_TOGETHER", "NONE"]
    moneyness: Literal["ATM", "ITM", "OTM", "NONE"]
    distance_pts: str
    expiry: Literal["CURRENT_WEEKLY", "NEXT_WEEKLY", "MONTHLY", "NONE"]
    timeframe_min: str
    holding: Literal["INTRADAY", "POSITIONAL", "NONE"]
    lots: str
    lot_size: str
    fixed_entry_time: str


class ExitSpec(_Strict):
    sl_type: Literal["PCT_PREMIUM", "POINTS", "TRIGGER_CANDLE", "NONE"]
    sl_value: str
    target_type: Literal["PCT_PREMIUM", "POINTS", "RR", "SPOT_LEVEL", "NONE"]
    target_value: str
    time_exit_at: str
    time_exit_on: Literal["ENTRY_DAY", "EXPIRY_DAY", "NONE"]
    hold_to_expiry: Literal["YES", "NO", "NONE"]


SettingName = Literal[
    "sl_cap_pts",
    "trail_to_cost_at_r",
    "exit_after_candles",
    "vix_measured_at",
    "vix_band",
    "entry_window",
    "no_entry_window",
    "expiry_day_cutoff",
    "daily_max_trades",
    "daily_stop_after_sl_hits",
    "daily_max_loss_rupees",
    "trail_to_cost_at_pts",
    "partial_percent",
    "partial_when",
    "partial_then",
]


class Setting(_Strict):
    """One advanced option the text states. Values: a number; DAY_OPEN or ENTRY (vix_measured_at);
    "HH:MM" (expiry_day_cutoff); "HH:MM-HH:MM" (windows); "FROM-TO=SIZE" with FROM or TO empty
    for an open end (vix_band, e.g. "-12=50", "12-15=75", "15-=100")."""

    name: SettingName
    value: str


class QuestionOption(_Strict):
    label: str
    value_text: str


class Item(_Strict):
    id: str
    status: Literal["FOUND", "VAGUE", "UNSUPPORTED"]
    field: d.FieldKey
    quote: str
    understood: str
    targets: list[str]
    question_kind: Literal["CHOICE", "NUMBER", "TIME", "CONFIRM", "NONE"]
    question: str
    unit_label: str
    options: list[QuestionOption]
    recommended_option: str


class WireDraft(_Strict):
    ignored_text_found: bool
    basics: Basics
    indicators: list[Indicator]
    conditions: list[ConditionRow]
    exit: ExitSpec
    advanced: list[Setting]
    items: list[Item]


# ---- wire → draft -------------------------------------------------------------------------------


def _enum(v: str) -> Any:
    return None if v == NONE else v


def _text(v: str) -> str | None:
    v = v.strip()
    return v or None


def _float(v: str) -> float | None:
    try:
        x = float(v.strip().replace(",", "").rstrip("%"))
    except ValueError:
        return None
    return x if math.isfinite(x) else None


def _int(v: str) -> int | None:
    x = _float(v)
    return int(x) if x is not None and x.is_integer() else None


def _ref_parts(ref: str) -> tuple[str, str | None]:
    head, _, tail = ref.strip().partition(".")
    return head, (tail or None)


def _operand(o: Operand) -> d.Operand | None:
    ref = o.ref.strip()
    if not ref:
        return None
    pts, pct = _float(o.offset_pts), _float(o.offset_pct)
    const = _float(ref)
    head, tail = _ref_parts(ref)
    if const is not None:
        kind, ind, output, price, vix = "const", None, None, None, None
    elif ref.lower() in PRICES:
        kind, ind, output, price, vix = "price", None, None, ref.lower(), None
    elif head.lower() == "candle" and tail in ("range", "body"):
        return d.Operand(
            kind="candle",
            ind=None,
            output=None,
            price=None,
            vix=None,
            const=None,
            candle=tail,
            offset_pts=pts,
            offset_pct=pct,
        )
    elif head.lower() == "vix":
        kind, ind, output, price, vix = "vix", None, None, None, (tail if tail in ("open", "close") else None)
    else:
        kind, ind, output, price, vix = "indicator", head, (tail if tail in OUTPUTS else None), None, None
    return d.Operand(
        kind=kind, ind=ind, output=output, price=price, vix=vix, const=const, offset_pts=pts, offset_pct=pct
    )


def _row(c: ConditionRow) -> d.ConditionRow:
    op = _enum(c.op)
    k = c.kind
    left = right = None
    ind = to_or_is = direction = cmp = None
    if k in ("state", "turns", "state_or_turns"):
        ind = _text(_ref_parts(c.left.ref)[0])
        to_or_is = op if op in ("up", "down") else None
    elif k == "compare":
        left, right, cmp = _operand(c.left), _operand(c.right), op if op in ("gt", "gte", "lt", "lte") else None
    elif k == "cross":
        left, right, direction = _operand(c.left), _operand(c.right), op if op in ("above", "below") else None
    elif k == "slope":
        left, direction = _operand(c.left), op if op in ("up", "down") else None
    return d.ConditionRow(
        id=c.id,
        parent_id=_text(c.parent_id),
        side=c.side,
        kind=k,
        left=left,
        op=cmp,
        right=right,
        direction=direction,
        ind=ind,
        to_or_is=to_or_is,
        lookback=_int(c.lookback) if k == "slope" else None,
    )


def _indicator(i: Indicator) -> d.Indicator:
    values = [v.strip() for v in i.params.split(",")] if i.params.strip() else []
    p: dict[str, Any] = {}
    for name, raw in zip(PARAMS[i.type], values, strict=False):
        p[name] = _int(raw) if name in _INT_PARAMS else _float(raw)
    return d.Indicator(
        id=i.id,
        type=i.type,
        period=p.get("period"),
        source=_enum(i.source),
        multiplier=p.get("multiplier"),
        fast=p.get("fast"),
        slow=p.get("slow"),
        signal=p.get("signal"),
        stddev=p.get("stddev"),
        minutes=p.get("minutes"),
    )


def _window(w: str) -> d.Window:
    start, _, end = w.partition("-")
    return d.Window(start=_text(start), end=_text(end))


def _band(v: str) -> d.VixBand:
    rng, _, size = v.partition("=")
    lo, _, hi = rng.partition("-")
    return d.VixBand(vix_from=_float(lo), vix_to=_float(hi), size_pct=_float(size))


def _ref_operand(ref: str) -> d.Operand | None:
    return _operand(Operand(ref=ref, offset_pts="", offset_pct=""))


def _levels(text: str) -> tuple[d.Operand | None, d.Operand | None]:
    """Index levels written "ce_ref|pe_ref" (either side may be empty)."""
    ce, _, pe = text.partition("|")
    return _ref_operand(ce), _ref_operand(pe)


def _partial(one: dict[str, str]) -> dict[str, Any]:
    """partial_when: "gain:PCT_PREMIUM:50" / "gain:POINTS:25" / "gain:RR:1" or "level:ce_ref|pe_ref"."""
    when = one.get("partial_when", "").strip()
    out: dict[str, Any] = {"partial_percent": _int(one.get("partial_percent", ""))}
    then = one.get("partial_then", "").strip()
    out["partial_then"] = then if then in ("UNCHANGED", "COST", "PARTIAL_CANDLE") else None
    if when.startswith("gain:"):
        _, gtype, gval = (when.split(":") + ["", ""])[:3]
        out["partial_when"] = "PREMIUM_GAIN"
        out["partial_gain_type"] = gtype if gtype in ("PCT_PREMIUM", "POINTS", "RR") else None
        out["partial_gain_value"] = _float(gval)
    elif when.startswith("level:"):
        out["partial_when"] = "SPOT_LEVEL"
        out["partial_ce"], out["partial_pe"] = _levels(when[len("level:") :])
    return out


def _advanced(settings: list[Setting]) -> d.AdvancedSpec:
    one: dict[str, str] = {}
    for st in settings:
        one.setdefault(st.name, st.value)  # a single-valued option stated twice: the first one counts
    many = {n: [st.value for st in settings if st.name == n] for n in ("vix_band", "entry_window", "no_entry_window")}
    measured = one.get("vix_measured_at", "").strip()
    return d.AdvancedSpec(
        sl_cap_pts=_float(one.get("sl_cap_pts", "")),
        trail_to_cost_at_r=_float(one.get("trail_to_cost_at_r", "")),
        exit_after_candles=_int(one.get("exit_after_candles", "")),
        vix_sizing=None
        if "vix_measured_at" not in one and not many["vix_band"]
        else d.VixSizing(
            measured_at=measured if measured in ("DAY_OPEN", "ENTRY") else None,
            bands=[_band(v) for v in many["vix_band"]],
        ),
        entry_windows=[_window(v) for v in many["entry_window"]],
        no_entry_windows=[_window(v) for v in many["no_entry_window"]],
        expiry_day_cutoff=_text(one.get("expiry_day_cutoff", "")),
        daily_max_trades=_int(one.get("daily_max_trades", "")),
        daily_stop_after_sl_hits=_int(one.get("daily_stop_after_sl_hits", "")),
        daily_max_loss_rupees=_float(one.get("daily_max_loss_rupees", "")),
        trail_to_cost_at_pts=_float(one.get("trail_to_cost_at_pts", "")),
        **_partial(one),
    )


def _item(i: Item) -> d.Item:
    unsupported = i.status == "UNSUPPORTED"
    # An item that asks a question isn't clear: it is VAGUE whatever status the reply gave it.
    status = "VAGUE" if i.status == "FOUND" and i.question_kind != NONE else i.status
    return d.Item(
        id=i.id,
        status=status,
        field=i.field,
        quote=i.quote,
        understood=i.understood,
        reason=_text(i.understood) if unsupported else None,  # an unsupported item's "understood" is its reason
        targets=i.targets,
        question=None
        if i.question_kind == NONE
        else d.ItemQuestion(
            prompt=i.question,
            kind=i.question_kind,
            unit_label=_text(i.unit_label),
            options=[d.QuestionOption(label=o.label, value_text=o.value_text) for o in i.options],
            recommended_option=_int(i.recommended_option),
        ),
    )


_VAGUE_BASICS = {"action", "option_side", "moneyness", "distance_pts", "expiry", "timeframe_min", "holding"}
_VAGUE_BASICS |= {"lots", "lot_size", "fixed_entry_time"}
_VAGUE_ADVANCED = {
    "sl_cap_pts",
    "trail_to_cost_at_r",
    "trail_to_cost_at_pts",
    "exit_after_candles",
    "expiry_day_cutoff",
}
_VAGUE_EXIT = {"stop_loss": "sl_value", "target": "target_value", "time_exit": "time_exit_at"}


def clear_vague(x: d.ExtractionDraft) -> d.ExtractionDraft:
    """A VAGUE item's value is asked, never pre-filled: clear whatever the reply put there."""
    rows = {c.id: c for c in x.conditions}
    vs = x.advanced.vix_sizing
    for item in x.items:
        if item.status != "VAGUE":
            continue
        f = item.field
        if f in _VAGUE_BASICS:
            setattr(x.basics, f, None)
        elif f in _VAGUE_ADVANCED:
            setattr(x.advanced, f, None)
        elif f == "expiry_weekday_term":
            x.advanced.expiry_day_cutoff = None
        elif f in _VAGUE_EXIT:
            setattr(x.exit, _VAGUE_EXIT[f], None)
        elif f == "premarket_time" and vs is not None:
            vs.measured_at = None
        for t in item.targets:
            kind, _, ref = t.partition(":")
            if kind == "cond" and ref in rows:
                row = rows[ref]
                if f == "slope_lookback":
                    row.lookback = None
                elif f == "condition_value" and row.right is not None and row.right.kind == "const":
                    row.right = None  # the threshold is asked (e.g. "wide CPR" without a number)
                elif f == "condition_offset":
                    for o in (row.left, row.right):
                        if o is not None:
                            o.offset_pts = o.offset_pct = None
            elif kind == "vix_band" and f == "vix_band_size" and vs is not None and ref.isdigit():
                if int(ref) < len(vs.bands):
                    vs.bands[int(ref)].size_pct = None
    return x


def from_wire(w: WireDraft) -> d.ExtractionDraft:
    return clear_vague(_from_wire(w))


def _from_wire(w: WireDraft) -> d.ExtractionDraft:
    b, e = w.basics, w.exit
    return d.ExtractionDraft(
        ignored_text_found=w.ignored_text_found,
        basics=d.Basics(
            action=_enum(b.action),
            option_side=_enum(b.option_side),
            moneyness=_enum(b.moneyness),
            distance_pts=_float(b.distance_pts),
            expiry=_enum(b.expiry),
            timeframe_min=_int(b.timeframe_min),
            holding=_enum(b.holding),
            lots=_int(b.lots),
            lot_size=_int(b.lot_size),
            fixed_entry_time=_text(b.fixed_entry_time),
        ),
        indicators=[_indicator(i) for i in w.indicators],
        conditions=[_row(c) for c in w.conditions],
        exit=d.ExitSpec(
            sl_type=_enum(e.sl_type),
            sl_value=_float(e.sl_value),
            target_type=_enum(e.target_type),
            target_value=None if e.target_type == "SPOT_LEVEL" else _float(e.target_value),
            time_exit_at=_text(e.time_exit_at),
            time_exit_on=_enum(e.time_exit_on),
            hold_to_expiry={"YES": True, "NO": False}.get(e.hold_to_expiry),
            **(
                dict(zip(("target_ce", "target_pe"), _levels(e.target_value), strict=True))
                if e.target_type == "SPOT_LEVEL"
                else {}
            ),
        ),
        advanced=_advanced(w.advanced),
        items=[_item(i) for i in w.items],
    )


# ---- draft → wire (replayed recordings and tests) -----------------------------------------------


def _s(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def _e(v: Any) -> Any:
    return NONE if v is None else v


def _w_operand(o: d.Operand | None) -> dict[str, str]:
    if o is None:
        return {"ref": "", "offset_pts": "", "offset_pct": ""}
    if o.kind == "const":
        ref = _s(o.const)
    elif o.kind == "price":
        ref = _s(o.price)
    elif o.kind == "vix":
        ref = f"vix.{o.vix}" if o.vix else "vix"
    elif o.kind == "candle":
        ref = f"candle.{o.candle}"
    else:
        ref = f"{o.ind}.{o.output}" if o.output else _s(o.ind)
    return {"ref": ref, "offset_pts": _s(o.offset_pts), "offset_pct": _s(o.offset_pct)}


def _w_row(c: d.ConditionRow) -> dict[str, Any]:
    state = c.kind in ("state", "turns", "state_or_turns")
    return {
        "id": c.id,
        "parent_id": _s(c.parent_id),
        "side": c.side,
        "kind": c.kind,
        "left": {"ref": _s(c.ind), "offset_pts": "", "offset_pct": ""} if state else _w_operand(c.left),
        "op": _e(c.to_or_is if state else c.op or c.direction),
        "right": _w_operand(c.right),
        "lookback": _s(c.lookback),
    }


def _w_indicator(i: d.Indicator) -> dict[str, Any]:
    values = [_s(getattr(i, name)) for name in PARAMS[i.type]]
    while values and values[-1] == "":
        values.pop()
    return {"id": i.id, "type": i.type, "source": _e(i.source), "params": ",".join(values)}


def _w_window(w: d.Window) -> str:
    return f"{_s(w.start)}-{_s(w.end)}"


def _w_advanced(a: d.AdvancedSpec) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for name in ("sl_cap_pts", "trail_to_cost_at_r", "exit_after_candles"):
        if getattr(a, name) is not None:
            out.append({"name": name, "value": _s(getattr(a, name))})
    if a.vix_sizing is not None:
        if a.vix_sizing.measured_at is not None:
            out.append({"name": "vix_measured_at", "value": a.vix_sizing.measured_at})
        for bd in a.vix_sizing.bands:
            out.append({"name": "vix_band", "value": f"{_s(bd.vix_from)}-{_s(bd.vix_to)}={_s(bd.size_pct)}"})
    out += [{"name": "entry_window", "value": _w_window(w)} for w in a.entry_windows]
    out += [{"name": "no_entry_window", "value": _w_window(w)} for w in a.no_entry_windows]
    for name in ("expiry_day_cutoff", "daily_max_trades", "daily_stop_after_sl_hits", "daily_max_loss_rupees"):
        if getattr(a, name) is not None:
            out.append({"name": name, "value": _s(getattr(a, name))})
    if a.trail_to_cost_at_pts is not None:
        out.append({"name": "trail_to_cost_at_pts", "value": _s(a.trail_to_cost_at_pts)})
    if a.partial_percent is not None:
        out.append({"name": "partial_percent", "value": _s(a.partial_percent)})
    if a.partial_when == "PREMIUM_GAIN":
        out.append({"name": "partial_when", "value": f"gain:{_s(a.partial_gain_type)}:{_s(a.partial_gain_value)}"})
    elif a.partial_when == "SPOT_LEVEL":
        refs = f"{_w_operand(a.partial_ce)['ref']}|{_w_operand(a.partial_pe)['ref']}"
        out.append({"name": "partial_when", "value": f"level:{refs}"})
    if a.partial_then is not None:
        out.append({"name": "partial_then", "value": a.partial_then})
    return out


def _w_item(i: d.Item) -> dict[str, Any]:
    q = i.question
    return {
        "id": i.id,
        "status": i.status,
        "field": i.field,
        "quote": i.quote,
        "understood": i.reason if i.status == "UNSUPPORTED" and i.reason else i.understood,
        "targets": i.targets,
        "question_kind": NONE if q is None else q.kind,
        "question": "" if q is None else q.prompt,
        "unit_label": "" if q is None else _s(q.unit_label),
        "options": [] if q is None else [o.model_dump() for o in q.options],
        "recommended_option": "" if q is None else _s(q.recommended_option),
    }


def to_wire(x: d.ExtractionDraft) -> WireDraft:
    b, e, a = x.basics, x.exit, x.advanced
    choices = ("action", "option_side", "moneyness", "expiry", "holding")
    return WireDraft.model_validate(
        {
            "ignored_text_found": x.ignored_text_found,
            "basics": {k: (_e(v) if k in choices else _s(v)) for k, v in b.model_dump().items()},
            "indicators": [_w_indicator(i) for i in x.indicators],
            "conditions": [_w_row(c) for c in x.conditions],
            "exit": {
                "sl_type": _e(e.sl_type),
                "sl_value": _s(e.sl_value),
                "target_type": _e(e.target_type),
                "target_value": f"{_w_operand(e.target_ce)['ref']}|{_w_operand(e.target_pe)['ref']}"
                if e.target_type == "SPOT_LEVEL"
                else _s(e.target_value),
                "time_exit_at": _s(e.time_exit_at),
                "time_exit_on": _e(e.time_exit_on),
                "hold_to_expiry": NONE if e.hold_to_expiry is None else ("YES" if e.hold_to_expiry else "NO"),
            },
            "advanced": _w_advanced(a),
            "items": [_w_item(i) for i in x.items],
        }
    )

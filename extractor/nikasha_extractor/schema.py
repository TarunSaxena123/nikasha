"""The flat extraction schema sent to the LLM as structured output (feature 04 design §2.2).

No recursion and no numeric or length constraints (structured outputs don't support them); every
field is required but may be null, and objects forbid extra keys. Constraints are checked after
the call in validate.py, and the condition tree is rebuilt from parent ids in convert.py.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


IndType = Literal["EMA", "SMA", "RSI", "ADX", "SUPERTREND", "MACD", "BBANDS", "OPENING_RANGE", "PIVOTS"]
Output = Literal[
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
]
PriceField = Literal["open", "high", "low", "close"]

FieldKey = Literal[
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
    "hold_to_expiry",
    "indicator",
    "sl_cap_pts",
    "trail_to_cost_at_r",
    "exit_after_candles",
    "vix_sizing",
    "vix_band_size",
    "entry_windows",
    "no_entry_windows",
    "expiry_day_cutoff",
    "daily_limits",
    "condition",
    "condition_offset",
    "condition_kind",
    "slope_lookback",
    "expiry_weekday_term",
    "premarket_time",
    "exit_condition",
    "partial_exit",
    "condition_value",
    "trail_to_cost_at_pts",
    "other",
]


class Operand(_Strict):
    kind: Literal["indicator", "price", "vix", "const", "candle"]
    ind: str | None
    output: Output | None
    price: PriceField | None
    vix: Literal["open", "close"] | None
    const: float | None
    candle: Literal["range", "body"] | None = None
    offset_pts: float | None
    offset_pct: float | None


class Indicator(_Strict):
    id: str
    type: IndType
    period: int | None
    source: PriceField | None
    multiplier: float | None
    fast: int | None
    slow: int | None
    signal: int | None
    stddev: float | None
    minutes: int | None = None


class ConditionRow(_Strict):
    id: str
    parent_id: str | None
    side: Literal["CE", "PE", "ALL_LEGS", "EXIT_CE", "EXIT_PE", "EXIT_ALL_LEGS"]
    kind: Literal["all", "any", "compare", "cross", "state", "turns", "slope", "state_or_turns"]
    left: Operand | None
    op: Literal["gt", "gte", "lt", "lte"] | None
    right: Operand | None
    direction: Literal["above", "below", "up", "down"] | None
    ind: str | None
    to_or_is: Literal["up", "down"] | None
    lookback: int | None


class Basics(_Strict):
    action: Literal["BUY", "SELL"] | None
    option_side: Literal["CALL", "PUT", "BOTH_BY_SIGNAL", "CALL_AND_PUT_TOGETHER"] | None
    moneyness: Literal["ATM", "ITM", "OTM"] | None
    distance_pts: float | None
    expiry: Literal["CURRENT_WEEKLY", "NEXT_WEEKLY", "MONTHLY"] | None
    timeframe_min: int | None
    holding: Literal["INTRADAY", "POSITIONAL"] | None
    lots: int | None
    lot_size: int | None
    fixed_entry_time: str | None


class ExitSpec(_Strict):
    sl_type: Literal["PCT_PREMIUM", "POINTS", "TRIGGER_CANDLE"] | None
    sl_value: float | None
    target_type: Literal["PCT_PREMIUM", "POINTS", "RR", "SPOT_LEVEL"] | None
    target_value: float | None
    time_exit_at: str | None
    time_exit_on: Literal["ENTRY_DAY", "EXPIRY_DAY"] | None
    hold_to_expiry: bool | None
    target_ce: Operand | None = None  # SPOT_LEVEL target levels (feature 04 design §2.5b)
    target_pe: Operand | None = None


class Window(_Strict):
    start: str | None
    end: str | None


class VixBand(_Strict):
    vix_from: float | None
    vix_to: float | None
    size_pct: float | None


class VixSizing(_Strict):
    measured_at: Literal["DAY_OPEN", "ENTRY"] | None
    bands: list[VixBand]


class AdvancedSpec(_Strict):
    sl_cap_pts: float | None
    trail_to_cost_at_r: float | None
    exit_after_candles: int | None
    vix_sizing: VixSizing | None
    entry_windows: list[Window]
    no_entry_windows: list[Window]
    expiry_day_cutoff: str | None
    daily_max_trades: int | None
    daily_stop_after_sl_hits: int | None
    daily_max_loss_rupees: float | None
    trail_to_cost_at_pts: float | None = None
    partial_percent: int | None = None
    partial_when: Literal["PREMIUM_GAIN", "SPOT_LEVEL"] | None = None
    partial_gain_type: Literal["PCT_PREMIUM", "POINTS", "RR"] | None = None
    partial_gain_value: float | None = None
    partial_ce: Operand | None = None
    partial_pe: Operand | None = None
    partial_then: Literal["UNCHANGED", "COST", "PARTIAL_CANDLE"] | None = None


class QuestionOption(_Strict):
    label: str
    value_text: str


class ItemQuestion(_Strict):
    prompt: str
    kind: Literal["CHOICE", "NUMBER", "TIME", "CONFIRM"]
    unit_label: str | None
    options: list[QuestionOption]
    recommended_option: int | None


class Item(_Strict):
    id: str
    status: Literal["FOUND", "VAGUE", "UNSUPPORTED"]
    field: FieldKey
    quote: str
    understood: str
    reason: str | None
    targets: list[str]
    question: ItemQuestion | None


class ExtractionDraft(_Strict):
    ignored_text_found: bool
    basics: Basics
    indicators: list[Indicator]
    conditions: list[ConditionRow]
    exit: ExitSpec
    advanced: AdvancedSpec
    items: list[Item]

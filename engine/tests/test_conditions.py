"""REQ-ENG-06…11 (AC-ENG-04, 05): condition semantics."""

from __future__ import annotations

import numpy as np

from nikasha_engine.conditions import evaluator as ev


class FakeCtx(ev.Context):
    def __init__(self, n: int, series: dict[str, dict[str, np.ndarray]]):
        from test_indicators import _candles

        super().__init__(_candles({"open": [1.0] * n, "high": [1.0] * n, "low": [1.0] * n, "close": [1.0] * n}), {})
        self._values = series


def cross(left="a", right="b", direction="above"):
    return {
        "type": "cross",
        "left": {"ind": left, "output": "value"},
        "direction": direction,
        "right": {"ind": right, "output": "value"},
    }


def test_cross_equality_cases():
    """AC-ENG-04: 100/100 then 101/100 → true; 99/100 then 100/100 → false."""
    ctx = FakeCtx(2, {"a": {"value": np.array([100.0, 101.0])}, "b": {"value": np.array([100.0, 100.0])}})
    assert ev.evaluate(cross(), ctx).tolist() == [False, True]
    ctx = FakeCtx(2, {"a": {"value": np.array([99.0, 100.0])}, "b": {"value": np.array([100.0, 100.0])}})
    assert ev.evaluate(cross(), ctx).tolist() == [False, False]


def test_adx_rule_from_the_advanced_sample():
    """AC-ENG-05: (ADX > 20 AND rising over 1) OR ADX > 30."""
    rule = {
        "type": "any",
        "conditions": [
            {
                "type": "all",
                "conditions": [
                    {"type": "compare", "left": {"ind": "adx", "output": "value"}, "op": "gt", "right": {"const": 20}},
                    {"type": "slope", "operand": {"ind": "adx", "output": "value"}, "direction": "up", "lookback": 1},
                ],
            },
            {"type": "compare", "left": {"ind": "adx", "output": "value"}, "op": "gt", "right": {"const": 30}},
        ],
    }
    cases = {(24, 25): True, (26, 25): False, (36, 35): True, (31, 30): False}
    for (prev, now), want in cases.items():
        ctx = FakeCtx(2, {"adx": {"value": np.array([float(prev), float(now)])}})
        assert ev.evaluate(rule, ctx)[1] == want, (prev, now)


def test_nan_operand_is_false():
    ctx = FakeCtx(3, {"a": {"value": np.array([np.nan, 5.0, 5.0])}, "b": {"value": np.array([1.0, np.nan, 1.0])}})
    cmp = {
        "type": "compare",
        "left": {"ind": "a", "output": "value"},
        "op": "gt",
        "right": {"ind": "b", "output": "value"},
    }
    assert ev.evaluate(cmp, ctx).tolist() == [False, False, True]
    lt = {**cmp, "op": "lt"}
    assert ev.evaluate(lt, ctx).tolist() == [False, False, False]


def test_vix_operand_missing_is_false():
    ctx = FakeCtx(2, {})
    ctx.c = ctx.c.__class__(**{**ctx.c.__dict__, "v_close": np.array([np.nan, 20.0])})
    node = {"type": "compare", "left": {"vix": "close"}, "op": "gt", "right": {"const": 15}}
    assert ev.evaluate(node, ctx).tolist() == [False, True]


def test_offsets_points_and_percent():
    ctx = FakeCtx(1, {"a": {"value": np.array([100.0])}, "b": {"value": np.array([95.0])}})
    pts = {
        "type": "compare",
        "left": {"ind": "a", "output": "value"},
        "op": "gt",
        "right": {"ind": "b", "output": "value", "offset": {"pts": 10}},
    }
    pct = {
        "type": "compare",
        "left": {"ind": "a", "output": "value"},
        "op": "gt",
        "right": {"ind": "b", "output": "value", "offset": {"pct": 4}},
    }
    assert ev.evaluate(pts, ctx).tolist() == [False]
    assert ev.evaluate(pct, ctx).tolist() == [True]


def test_state_and_turns():
    ctx = FakeCtx(4, {"st": {"value": np.zeros(4), "direction": np.array([np.nan, -1.0, 1.0, 1.0])}})
    assert ev.evaluate({"type": "state", "ind": "st", "is": "up"}, ctx).tolist() == [False, False, True, True]
    assert ev.evaluate({"type": "turns", "ind": "st", "to": "up"}, ctx).tolist() == [False, False, True, False]


def test_all_any_any_depth():
    ctx = FakeCtx(2, {"a": {"value": np.array([1.0, 3.0])}})
    gt2 = {"type": "compare", "left": {"ind": "a", "output": "value"}, "op": "gt", "right": {"const": 2}}
    lt2 = {**gt2, "op": "lt"}
    tree = {
        "type": "all",
        "conditions": [{"type": "any", "conditions": [gt2, lt2]}, {"type": "all", "conditions": [gt2]}],
    }
    assert ev.evaluate(tree, ctx).tolist() == [False, True]

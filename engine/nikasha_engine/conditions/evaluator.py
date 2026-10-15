"""Condition tree → boolean array over candles (REQ-ENG-06…11; feature 01 design §2.8).

A condition is false on any candle where one of its inputs has no value (warm-up, or a volatility
operand on a candle without volatility data). Conditions use the real volatility values; the
sensitivity shift affects pricing only, so signals are identical in all three runs.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import numpy.typing as npt

from nikasha_engine.candles.resample import Candles
from nikasha_engine.indicators import compute

FloatArr = npt.NDArray[np.float64]
BoolArr = npt.NDArray[np.bool_]


class Context:
    def __init__(self, candles: Candles, indicators: dict[str, dict[str, Any]]) -> None:
        self.c = candles
        self.specs = indicators
        self._values: dict[str, dict[str, FloatArr]] = {}

    def outputs(self, ind_id: str) -> dict[str, FloatArr]:
        if ind_id not in self._values:
            self._values[ind_id] = compute(self.c, self.specs[ind_id])
        return self._values[ind_id]


def _shift(x: FloatArr, k: int) -> FloatArr:
    """x[t − k], NaN where t − k < 0."""
    out = np.full(len(x), np.nan)
    if k < len(x):
        out[k:] = x[: len(x) - k]
    return out


def operand(node: dict[str, Any], ctx: Context) -> FloatArr:
    c = ctx.c
    if "ind" in node:
        v = ctx.outputs(node["ind"])[node["output"]]
    elif "price" in node:
        v = {"open": c.open, "high": c.high, "low": c.low, "close": c.close}[node["price"]]
    elif "vix" in node:
        v = c.v_open if node["vix"] == "open" else c.v_close
    else:
        return np.full(len(c), float(node["const"]))
    off = node.get("offset")
    if off:
        v = v + float(off["pts"]) if "pts" in off else v * (1.0 + float(off["pct"]) / 100.0)
    return np.asarray(v, dtype=np.float64)


def _both_valid(*arrays: FloatArr) -> BoolArr:
    ok = np.ones(len(arrays[0]), dtype=bool)
    for a in arrays:
        ok &= ~np.isnan(a)
    return ok


def evaluate(node: dict[str, Any], ctx: Context) -> BoolArr:
    t = node["type"]
    if t == "all":
        out = np.ones(len(ctx.c), dtype=bool)
        for child in node["conditions"]:
            out &= evaluate(child, ctx)
        return out
    if t == "any":
        out = np.zeros(len(ctx.c), dtype=bool)
        for child in node["conditions"]:
            out |= evaluate(child, ctx)
        return out
    if t == "compare":
        left, right = operand(node["left"], ctx), operand(node["right"], ctx)
        ok = _both_valid(left, right)
        with np.errstate(invalid="ignore"):
            res = {"gt": left > right, "gte": left >= right, "lt": left < right, "lte": left <= right}[node["op"]]
        return np.asarray(ok & res, dtype=bool)
    if t == "cross":
        left, right = operand(node["left"], ctx), operand(node["right"], ctx)
        lp, rp = _shift(left, 1), _shift(right, 1)
        ok = _both_valid(left, right, lp, rp)
        with np.errstate(invalid="ignore"):
            if node["direction"] == "above":
                res = (left > right) & (lp <= rp)
            else:
                res = (left < right) & (lp >= rp)
        return np.asarray(ok & res, dtype=bool)
    if t in ("state", "turns"):
        d = ctx.outputs(node["ind"])["direction"]
        want = 1.0 if node.get("is", node.get("to")) == "up" else -1.0
        if t == "state":
            return np.asarray(d == want, dtype=bool)
        prev = _shift(d, 1)
        return np.asarray((d == want) & ~np.isnan(prev) & (prev != want), dtype=bool)
    if t == "slope":
        x = operand(node["operand"], ctx)
        past = _shift(x, int(node["lookback"]))
        ok = _both_valid(x, past)
        with np.errstate(invalid="ignore"):
            res = x > past if node["direction"] == "up" else x < past
        return np.asarray(ok & res, dtype=bool)
    raise ValueError("unknown condition")

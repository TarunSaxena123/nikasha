"""Indicator formulas (REQ-ENG-03, 04; feature 01 design §2.7, decision D1).

All functions take numpy arrays over the full candle series and return arrays of the same length.
Values before an indicator's warm-up are NaN. Notation follows the design table:
SMA = simple mean; EMA seeded with the SMA of the first n values (α = 2/(n+1));
RMA = Wilder's smoothing seeded with the SMA of the first n values (α = 1/n).
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt
import pandas as pd
from scipy.signal import lfilter

FloatArr = npt.NDArray[np.float64]


def _first_valid(x: FloatArr) -> int:
    idx = np.flatnonzero(~np.isnan(x))
    return int(idx[0]) if len(idx) else len(x)


def _smoothed(x: FloatArr, n: int, alpha: float) -> FloatArr:
    """Recursive smoothing seeded with the SMA of the first n valid values.

    The first valid output sits at (first valid input + n - 1). NaNs may only appear as a prefix.
    """
    out = np.full(len(x), np.nan)
    start = _first_valid(x)
    seed_at = start + n - 1
    if seed_at >= len(x):
        return out
    seed = float(np.mean(x[start : seed_at + 1]))
    out[seed_at] = seed
    rest = x[seed_at + 1 :]
    if len(rest):
        y, _ = lfilter([alpha], [1.0, -(1.0 - alpha)], rest, zi=[(1.0 - alpha) * seed])
        out[seed_at + 1 :] = y
    return out


def sma(x: FloatArr, n: int) -> FloatArr:
    return np.asarray(pd.Series(x).rolling(n, min_periods=n).mean().to_numpy(), dtype=np.float64)


def ema(x: FloatArr, n: int) -> FloatArr:
    return _smoothed(x, n, 2.0 / (n + 1))


def rma(x: FloatArr, n: int) -> FloatArr:
    return _smoothed(x, n, 1.0 / n)


def rsi(close: FloatArr, n: int) -> FloatArr:
    delta = np.full(len(close), np.nan)
    delta[1:] = np.diff(close)
    gains = np.where(np.isnan(delta), np.nan, np.maximum(delta, 0.0))
    losses = np.where(np.isnan(delta), np.nan, np.maximum(-delta, 0.0))
    g, lo = rma(gains, n), rma(losses, n)
    out = np.full(len(close), np.nan)
    valid = ~np.isnan(g) & ~np.isnan(lo)
    with np.errstate(divide="ignore", invalid="ignore"):
        rs = g / lo
        out[valid] = 100.0 - 100.0 / (1.0 + rs[valid])
    both_zero = valid & (g == 0) & (lo == 0)
    only_loss_zero = valid & (lo == 0) & (g > 0)
    out[only_loss_zero] = 100.0
    out[both_zero] = 50.0
    return out


def true_range(high: FloatArr, low: FloatArr, close: FloatArr) -> FloatArr:
    tr = high - low
    if len(tr) > 1:
        prev = close[:-1]
        tr[1:] = np.maximum.reduce([high[1:] - low[1:], np.abs(high[1:] - prev), np.abs(low[1:] - prev)])
    return np.asarray(tr, dtype=np.float64)


def atr(high: FloatArr, low: FloatArr, close: FloatArr, n: int) -> FloatArr:
    return rma(true_range(high, low, close), n)


def adx(high: FloatArr, low: FloatArr, close: FloatArr, n: int) -> dict[str, FloatArr]:
    """ADX(n) with +DI and −DI (Wilder). DI valid from n; ADX valid from 2n − 1."""
    size = len(close)
    plus_dm = np.full(size, np.nan)
    minus_dm = np.full(size, np.nan)
    tr = np.full(size, np.nan)
    if size > 1:
        up = high[1:] - high[:-1]
        dn = low[:-1] - low[1:]
        plus_dm[1:] = np.where((up > dn) & (up > 0), up, 0.0)
        minus_dm[1:] = np.where((dn > up) & (dn > 0), dn, 0.0)
        tr[1:] = true_range(high, low, close)[1:]
    tr_s = rma(tr, n)
    pdm_s, mdm_s = rma(plus_dm, n), rma(minus_dm, n)
    flat = tr_s == 0  # no range at all: both DIs are 0 (avoids 0/0)
    safe_tr = np.where(flat, 1.0, tr_s)
    plus_di = np.where(flat, 0.0, 100.0 * pdm_s / safe_tr)
    minus_di = np.where(flat, 0.0, 100.0 * mdm_s / safe_tr)
    total = plus_di + minus_di
    safe_total = np.where(total == 0, 1.0, total)
    dx = np.where(total == 0, 0.0, 100.0 * np.abs(plus_di - minus_di) / safe_total)
    dx = np.where(np.isnan(tr_s), np.nan, dx)
    plus_di = np.where(np.isnan(tr_s), np.nan, plus_di)
    minus_di = np.where(np.isnan(tr_s), np.nan, minus_di)
    return {"value": rma(dx, n), "plus_di": plus_di, "minus_di": minus_di}


def supertrend(high: FloatArr, low: FloatArr, close: FloatArr, period: int, multiplier: float) -> dict[str, FloatArr]:
    """Supertrend on (high+low)/2 with Wilder ATR. direction: +1 up (green), −1 down (red), NaN before warm-up."""
    size = len(close)
    hl2 = (high + low) / 2.0
    a = atr(high, low, close, period)
    value = np.full(size, np.nan)
    direction = np.full(size, np.nan)
    t0 = _first_valid(a)
    if t0 >= size:
        return {"value": value, "direction": direction}
    bu = hl2 + multiplier * a
    bl = hl2 - multiplier * a
    fu_prev, fl_prev = float(bu[t0]), float(bl[t0])
    d_prev = 1.0 if close[t0] > hl2[t0] else -1.0
    direction[t0] = d_prev
    value[t0] = fl_prev if d_prev > 0 else fu_prev
    bu_l, bl_l, c_l = bu.tolist(), bl.tolist(), close.tolist()
    for t in range(t0 + 1, size):
        c_prev = c_l[t - 1]
        fu = bu_l[t] if (bu_l[t] < fu_prev or c_prev > fu_prev) else fu_prev
        fl = bl_l[t] if (bl_l[t] > fl_prev or c_prev < fl_prev) else fl_prev
        if d_prev < 0:
            d = 1.0 if c_l[t] > fu else -1.0
        else:
            d = -1.0 if c_l[t] < fl else 1.0
        direction[t] = d
        value[t] = fl if d > 0 else fu
        fu_prev, fl_prev, d_prev = fu, fl, d
    return {"value": value, "direction": direction}


def macd(close: FloatArr, fast: int, slow: int, signal: int) -> dict[str, FloatArr]:
    line = ema(close, fast) - ema(close, slow)
    sig = ema(line, signal)
    return {"value": line, "signal": sig, "hist": line - sig}


def bollinger(x: FloatArr, n: int, k: float) -> dict[str, FloatArr]:
    s = pd.Series(x).rolling(n, min_periods=n)
    mid = np.asarray(s.mean().to_numpy(), dtype=np.float64)
    sd = np.asarray(s.std(ddof=0).to_numpy(), dtype=np.float64)
    return {"upper": mid + k * sd, "middle": mid, "lower": mid - k * sd}


def first_valid_index(spec: dict[str, object]) -> dict[str, int]:
    """First valid candle (0-based) per output, from the design table."""
    t = spec["type"]
    if t in ("SMA", "EMA"):
        return {"value": int(spec["period"]) - 1}  # type: ignore[call-overload]
    if t == "RSI":
        return {"value": int(spec["period"])}  # type: ignore[call-overload]
    if t == "ADX":
        n = int(spec["period"])  # type: ignore[call-overload]
        return {"value": 2 * n - 1, "plus_di": n, "minus_di": n}
    if t == "SUPERTREND":
        return {"value": int(spec["period"]) - 1}  # type: ignore[call-overload]
    if t == "MACD":
        s, g = int(spec["slow"]), int(spec["signal"])  # type: ignore[call-overload]
        return {"value": s - 1, "signal": s + g - 2, "hist": s + g - 2}
    if t == "BBANDS":
        n = int(spec["period"])  # type: ignore[call-overload]
        return {"upper": n - 1, "middle": n - 1, "lower": n - 1}
    raise ValueError("unknown indicator")

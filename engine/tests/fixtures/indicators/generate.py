"""Generate indicator reference fixtures (T-ENG-02). Run once; the outputs are committed.

Reference values come from a deliberately simple scalar implementation of the formulas in
feature 01 design §2.7, written separately from the engine's vectorised code. Where an
independent open-source technical-analysis library uses the same conventions after warm-up,
its values are compared too, and the result is written to README.md.

Run: python tests/fixtures/indicators/generate.py   (from engine/, needs the `ta` package)
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
NAN = float("nan")


# ---------- scalar reference formulas ----------


def sma(x, n):
    return [NAN if i < n - 1 else sum(x[i - n + 1 : i + 1]) / n for i in range(len(x))]


def seeded(x, n, alpha):
    out = [NAN] * len(x)
    start = next((i for i, v in enumerate(x) if not math.isnan(v)), len(x))
    s = start + n - 1
    if s >= len(x):
        return out
    out[s] = sum(x[start : s + 1]) / n
    for i in range(s + 1, len(x)):
        out[i] = alpha * x[i] + (1 - alpha) * out[i - 1]
    return out


def ema(x, n):
    return seeded(x, n, 2 / (n + 1))


def rma(x, n):
    return seeded(x, n, 1 / n)


def rsi(c, n):
    d = [NAN] + [c[i] - c[i - 1] for i in range(1, len(c))]
    g = rma([NAN if math.isnan(v) else max(v, 0) for v in d], n)
    lo = rma([NAN if math.isnan(v) else max(-v, 0) for v in d], n)
    out = []
    for a, b in zip(g, lo, strict=False):
        if math.isnan(a) or math.isnan(b):
            out.append(NAN)
        elif a == 0 and b == 0:
            out.append(50.0)
        elif b == 0:
            out.append(100.0)
        else:
            out.append(100 - 100 / (1 + a / b))
    return out


def tr(h, lo, c):
    return [h[0] - lo[0]] + [max(h[i] - lo[i], abs(h[i] - c[i - 1]), abs(lo[i] - c[i - 1])) for i in range(1, len(c))]


def adx(h, lo, c, n):
    size = len(c)
    pdm, mdm, trs = [NAN], [NAN], [NAN]
    t = tr(h, lo, c)
    for i in range(1, size):
        up, dn = h[i] - h[i - 1], lo[i - 1] - lo[i]
        pdm.append(up if (up > dn and up > 0) else 0.0)
        mdm.append(dn if (dn > up and dn > 0) else 0.0)
        trs.append(t[i])
    ts, ps, ms = rma(trs, n), rma(pdm, n), rma(mdm, n)
    pdi, mdi, dx = [], [], []
    for a, b, k in zip(ps, ms, ts, strict=False):
        if math.isnan(k):
            pdi.append(NAN)
            mdi.append(NAN)
            dx.append(NAN)
            continue
        p = 0.0 if k == 0 else 100 * a / k
        m = 0.0 if k == 0 else 100 * b / k
        pdi.append(p)
        mdi.append(m)
        dx.append(0.0 if p + m == 0 else 100 * abs(p - m) / (p + m))
    return {"value": rma(dx, n), "plus_di": pdi, "minus_di": mdi}


def supertrend(h, lo, c, p, m):
    a = rma(tr(h, lo, c), p)
    value, direction = [NAN] * len(c), [NAN] * len(c)
    t0 = p - 1
    fu = fl = d = None
    for i in range(t0, len(c)):
        hl2 = (h[i] + lo[i]) / 2
        bu, bl = hl2 + m * a[i], hl2 - m * a[i]
        if i == t0:
            fu, fl = bu, bl
            d = 1.0 if c[i] > hl2 else -1.0
        else:
            fu = bu if (bu < fu or c[i - 1] > fu) else fu
            fl = bl if (bl > fl or c[i - 1] < fl) else fl
            if d < 0:
                d = 1.0 if c[i] > fu else -1.0
            else:
                d = -1.0 if c[i] < fl else 1.0
        direction[i] = d
        value[i] = fl if d > 0 else fu
    return {"value": value, "direction": direction}


def macd(c, f, s, g):
    line = [a - b for a, b in zip(ema(c, f), ema(c, s), strict=False)]
    sig = ema(line, g)
    return {"value": line, "signal": sig, "hist": [a - b for a, b in zip(line, sig, strict=False)]}


def bbands(x, n, k):
    mid = sma(x, n)
    out_u, out_l = [], []
    for i in range(len(x)):
        if i < n - 1:
            out_u.append(NAN)
            out_l.append(NAN)
            continue
        w = x[i - n + 1 : i + 1]
        mu = sum(w) / n
        sd = math.sqrt(sum((v - mu) ** 2 for v in w) / n)
        out_u.append(mid[i] + k * sd)
        out_l.append(mid[i] - k * sd)
    return {"upper": out_u, "middle": mid, "lower": out_l}


# ---------- input series ----------


def long_series(n=600, seed=20261015):
    rnd = random.Random(seed)
    price, o, h, lo, c = 24500.0, [], [], [], []
    for _ in range(n):
        op = price
        moves = [rnd.gauss(0, 12) for _ in range(15)]
        path = [op]
        for mv in moves:
            path.append(path[-1] + mv)
        cl = path[-1]
        o.append(round(op, 2))
        c.append(round(cl, 2))
        h.append(round(max(path), 2))
        lo.append(round(min(path), 2))
        price = cl
    return {"open": o, "high": h, "low": lo, "close": c}


HAND = {  # small series; values easy to verify by hand
    "open": [10, 11, 12, 11, 13, 14, 13, 15, 16, 15, 17, 18],
    "high": [11, 12, 13, 12.5, 14, 15, 14, 16, 17, 16, 18, 19],
    "low": [9, 10, 11, 10, 12, 13, 12, 14, 15, 14, 16, 17],
    "close": [10.5, 11.5, 12, 11, 13.5, 14, 12.5, 15.5, 16, 14.5, 17.5, 18],
}

SPECS = {
    "ema9": {"type": "EMA", "period": 9, "source": "close"},
    "ema3": {"type": "EMA", "period": 3, "source": "close"},
    "sma5": {"type": "SMA", "period": 5, "source": "close"},
    "rsi14": {"type": "RSI", "period": 14},
    "rsi3": {"type": "RSI", "period": 3},
    "adx14": {"type": "ADX", "period": 14},
    "adx3": {"type": "ADX", "period": 3},
    "st10_2": {"type": "SUPERTREND", "period": 10, "multiplier": 2},
    "st3_1": {"type": "SUPERTREND", "period": 3, "multiplier": 1},
    "macd": {"type": "MACD", "fast": 12, "slow": 26, "signal": 9},
    "macd_small": {"type": "MACD", "fast": 2, "slow": 4, "signal": 3},
    "bb20": {"type": "BBANDS", "period": 20, "stddev": 2, "source": "close"},
    "bb5": {"type": "BBANDS", "period": 5, "stddev": 2, "source": "close"},
}


def compute(spec, s):
    t = spec["type"]
    if t == "EMA":
        return {"value": ema(s[spec["source"]], spec["period"])}
    if t == "SMA":
        return {"value": sma(s[spec["source"]], spec["period"])}
    if t == "RSI":
        return {"value": rsi(s["close"], spec["period"])}
    if t == "ADX":
        return adx(s["high"], s["low"], s["close"], spec["period"])
    if t == "SUPERTREND":
        return supertrend(s["high"], s["low"], s["close"], spec["period"], spec["multiplier"])
    if t == "MACD":
        return macd(s["close"], spec["fast"], spec["slow"], spec["signal"])
    return bbands(s[spec["source"]], spec["period"], spec["stddev"])


def clean(v):
    return [None if math.isnan(x) else round(x, 10) for x in v]


def library_check(series):
    """Compare against an independent library where conventions converge after warm-up."""
    import pandas as pd
    import ta

    c, h, lo = pd.Series(series["close"]), pd.Series(series["high"]), pd.Series(series["low"])
    ours_ema = ema(series["close"], 9)
    ours_rsi = rsi(series["close"], 14)
    ours_macd = macd(series["close"], 12, 26, 9)
    ours_bb = bbands(series["close"], 20, 2)
    ours_sma = sma(series["close"], 5)
    ours_adx = adx(series["high"], series["low"], series["close"], 14)
    checks = {
        "SMA(5) — exact": (ta.trend.SMAIndicator(c, 5).sma_indicator(), ours_sma, 4),
        "Bollinger(20, 2) upper — exact": (
            ta.volatility.BollingerBands(c, 20, 2).bollinger_hband(),
            ours_bb["upper"],
            19,
        ),
        "EMA(9) — after candle 300 (library seeds with the first value)": (
            ta.trend.EMAIndicator(c, 9).ema_indicator(),
            ours_ema,
            300,
        ),
        "RSI(14) — after candle 300 (library seeds with the first value)": (
            ta.momentum.RSIIndicator(c, 14).rsi(),
            ours_rsi,
            300,
        ),
        "MACD(12, 26, 9) signal — after candle 300": (
            ta.trend.MACD(c, 26, 12, 9).macd_signal(),
            ours_macd["signal"],
            300,
        ),
        "ADX(14) — after candle 300": (ta.trend.ADXIndicator(h, lo, c, 14).adx(), ours_adx["value"], 300),
    }
    lines = []
    for name, (lib, ours, start) in checks.items():
        lib_v = lib.to_list()
        diffs = [
            abs(a - b)
            for a, b in zip(lib_v[start:], ours[start:], strict=False)
            if not (math.isnan(a) or math.isnan(b))
        ]
        worst = max(diffs) if diffs else float("nan")
        lines.append(
            f"| {name} | {len(diffs)} | {worst:.2e} | {'agrees (≤ 1e-6)' if worst <= 1e-6 else 'differs — see note'} |"
        )
    return lines


def main():
    long = long_series()
    for label, series in (("hand", HAND), ("long", long)):
        out = {"input": series, "indicators": {}}
        for key, spec in SPECS.items():
            out["indicators"][key] = {"spec": spec, "outputs": {k: clean(v) for k, v in compute(spec, series).items()}}
        (HERE / f"{label}.json").write_text(json.dumps(out, indent=1) + "\n")
    rows = library_check(long)
    readme = HERE / "README.md"
    readme.write_text(
        "# Indicator reference fixtures\n\n"
        "Generated by `generate.py` (T-ENG-02). `hand.json` is a 12-candle series small enough to check by hand; "
        "`long.json` is a seeded 600-candle random walk. Both hold the input series and the expected outputs for "
        "every indicator type (EMA, SMA, RSI, ADX with ±DI, Supertrend with direction, MACD, Bollinger) computed by "
        "a plain scalar implementation of feature 01 design §2.7, separate from the engine's vectorised code. "
        "The engine must match them to 1e-6 (AC-ENG-02).\n\n"
        "## Cross-check with an independent open-source library (long series)\n\n"
        "| Check | Values compared | Largest difference | Result |\n|---|---|---|---|\n"
        + "\n".join(rows)
        + "\n\n## Convention differences\n\n"
        "- The library seeds EMA, RSI and MACD with the first value; the design seeds them with the SMA of the first n "
        "values. The two converge, so the comparison starts after candle 300. The design's convention is used.\n"
        "- Supertrend is not in the library; its fixture comes from the scalar reference only, plus the hand series.\n"
        "- Where the ADX row shows a difference, the library's ADX smoothing differs from Wilder's in the design table "
        "(its seeding and DX averaging); the design's convention is used, as the design requires.\n"
    )
    print("\n".join(rows))


if __name__ == "__main__":
    main()

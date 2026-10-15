"""Simulating one trade from entry to exit (REQ-ENG-21, 23…33, 51…56; design §2.14, §2.18).

Single- and multi-leg positions share one mechanism: the combined P&L per unit
(Σ sold: entry − p; bought: p − entry). For each priceable minute, the worst and best combined
values come from the spot high and low at that minute's closing volatility; the open value comes
from spot open at the opening volatility. A single leg's levels are the premium levels of the
design table, expressed as a loss / profit per unit.

Index levels (pivots, opening range, …) are read per minute from the last candle that closed
before it; a level is reached in the direction it lay from the index at entry (REQ-ENG-53).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import numpy as np
import numpy.typing as npt

from nikasha_engine.backtest.signals import Signal
from nikasha_engine.backtest.strikes import moneyness_strike, search_strike
from nikasha_engine.candles.resample import Candles
from nikasha_engine.data.loader import MarketData, date_to_day
from nikasha_engine.instruments.registry import hhmm_to_min
from nikasha_engine.pricing.black_scholes_vix import BlackScholesVIXProvider

FloatArr = npt.NDArray[np.float64]
IntArr = npt.NDArray[np.int64]
NO_LEVELS = "EXIT_LEVELS_UNAVAILABLE"
UNPRICEABLE = "UNPRICEABLE"


@dataclass
class LegFill:
    action: str  # BUY | SELL
    option_type: str  # CE | PE
    strike: float
    expiry: date
    entry: float  # fill price incl. slippage
    exit: float = math.nan
    settled_intrinsic: float = math.nan  # set when settled at expiry

    @property
    def sign(self) -> float:
        return 1.0 if self.action == "BUY" else -1.0

    @property
    def is_call(self) -> bool:
        return self.option_type == "CE"


@dataclass
class PartialFill:
    """Part of the lots closed before the final exit (REQ-ENG-55)."""

    idx: int
    minute: int
    lots: int
    exits: list[float]  # per leg, after slippage
    reason_text: str


@dataclass
class TradeAux:
    """Per-strategy arrays computed once in `prepare`, plus the trade's lots (REQ-ENG-51, 53, 57)."""

    exit_flags: dict[str, npt.NDArray[np.bool_]] = field(default_factory=dict)  # side → candle flags
    levels: dict[str, FloatArr] = field(default_factory=dict)  # e.g. "target_ce" → per-candle level
    lots: int = 1


@dataclass
class TradePath:
    legs: list[LegFill]
    entry_idx: int
    exit_idx: int
    exit_minute: int  # epoch minutes
    exit_reason: str
    exit_fills_with_slippage: int  # how many exit fills carried slippage (0 for settlement)
    stop_amt: float
    target_amt: float | None
    extra: dict[str, Any] = field(default_factory=dict)
    partial: PartialFill | None = None


class Pricer:
    """Leg premiums over minute index arrays for one run (fixed volatility shift)."""

    def __init__(self, md: MarketData, shift: float) -> None:
        self.md = md
        inst = md.instrument
        self.bs = BlackScholesVIXProvider(inst.risk_free_rate, inst.tick_size)
        self.tick = inst.tick_size
        self.shift = shift
        self.expiry_time = inst.expiry_time

    def mte(self, idx: IntArr, expiry: date) -> FloatArr:
        exp_minute = date_to_day(expiry) * 1440 + self.expiry_time
        return np.asarray(exp_minute - self.md.minutes[idx], dtype=np.float64)

    def at(self, idx: IntArr, leg: LegFill, spot: FloatArr, vol: FloatArr, raw: bool = False) -> FloatArr:
        f = self.bs.raw_price if raw else self.bs.price
        return f(spot, leg.strike, vol, self.mte(idx, leg.expiry), leg.is_call, self.shift)

    def ohlc(self, idx: IntArr, leg: LegFill) -> tuple[FloatArr, FloatArr, FloatArr]:
        """Premium open, high, low per minute (REQ-ENG-14)."""
        md = self.md
        p_open = self.at(idx, leg, md.s_open[idx], md.v_open[idx])
        p_shigh = self.at(idx, leg, md.s_high[idx], md.v_close[idx])
        p_slow = self.at(idx, leg, md.s_low[idx], md.v_close[idx])
        if leg.is_call:
            return p_open, p_shigh, p_slow
        return p_open, p_slow, p_shigh


def _floor_tick(price: float, tick: float) -> float:
    return max(round(price, 6), tick)


def _choose_strike(
    leg_spec: dict[str, Any], is_call: bool, sig: Signal, expiry: date, md: MarketData, pricer: Pricer
) -> float | None:
    inst = md.instrument
    s = leg_spec["strike"]
    if s["method"] == "MONEYNESS":
        return moneyness_strike(sig.spot, inst.strike_interval, s["moneyness"], float(s["distance_pts"]), is_call)
    if math.isnan(sig.spot_vol):
        return None
    exp_minute = date_to_day(expiry) * 1440 + inst.expiry_time
    mte = np.array([float(exp_minute - sig.spot_minute)])
    spot = np.array([sig.spot])
    vol = np.array([sig.spot_vol])
    bs = pricer.bs
    if s["method"] == "DELTA":
        target = float(s["target_delta"])
        return search_strike(
            sig.spot,
            inst.strike_interval,
            target,
            lambda k: abs(float(bs.delta(spot, k, vol, mte, is_call, pricer.shift)[0])),
        )
    target = float(s["target_premium"])
    return search_strike(
        sig.spot,
        inst.strike_interval,
        target,
        lambda k: float(bs.price(spot, k, vol, mte, is_call, pricer.shift)[0]),
    )


def _next_priceable(md: MarketData, idx: int, limit: int) -> int:
    """First priceable minute index ≥ idx and ≤ limit, or -1."""
    if idx < 0:
        return -1
    pr = md.priceable[idx : limit + 1]
    hits = np.flatnonzero(pr)
    return idx + int(hits[0]) if len(hits) else -1


def _first_minute_at_or_after(md: MarketData, day_idx: int, tod: int) -> int:
    """Index of the first existing minute on/after (day, tod), searching forward through the data."""
    if day_idx >= len(md.days):
        return -1
    target = int(md.days[day_idx]) * 1440 + tod
    i = int(np.searchsorted(md.minutes, target, side="left"))
    return i if i < len(md.minutes) else -1


def _gain_amount(gain: dict[str, Any], entry_ref: float, risk: float) -> float:
    """Premium gain per unit for a target-like level: % of the (combined) entry premium, points, or × risk."""
    if gain["type"] == "PCT_PREMIUM":
        return entry_ref * float(gain["value"]) / 100
    if gain["type"] == "POINTS":
        return float(gain["value"])
    return float(gain["value"]) * risk


def simulate_trade(
    sig: Signal,
    strategy: dict[str, Any],
    md: MarketData,
    candles: Candles,
    pricer: Pricer,
    slippage: float,
    aux: TradeAux | None = None,
) -> TradePath | str:
    """Path of one trade, or a skip reason (EXIT_LEVELS_UNAVAILABLE / UNPRICEABLE)."""
    aux = aux or TradeAux()
    inst = md.instrument
    tick = inst.tick_size
    legs_spec: list[dict[str, Any]] = strategy["legs"]
    ex: dict[str, Any] = strategy["exit"]
    adv: dict[str, Any] = strategy.get("advanced") or {}
    intraday = strategy["holding"] == "INTRADAY"
    assert sig.expiry is not None
    expiry = sig.expiry
    f = sig.fill_idx
    fidx = np.array([f], dtype=np.int64)

    # ---- entry fills ----
    legs: list[LegFill] = []
    for spec in legs_spec:
        otype = spec["option_type"] if spec["option_type"] != "SIGNAL" else sig.side
        strike = _choose_strike(spec, otype == "CE", sig, expiry, md, pricer)
        if strike is None:
            return UNPRICEABLE
        leg = LegFill(spec["action"], otype, strike, expiry, math.nan)
        p_open = float(pricer.ohlc(fidx, leg)[0][0])
        if math.isnan(p_open):
            return UNPRICEABLE
        leg.entry = _floor_tick(p_open + slippage if leg.action == "BUY" else p_open - slippage, tick)
        legs.append(leg)
    single = len(legs) == 1
    big_e = sum(leg.entry for leg in legs)

    # ---- levels (per unit, as loss / profit amounts) ----
    sl = ex["stop_loss"]
    tgt = ex.get("target")
    if single:
        leg = legs[0]
        p = leg.entry
        bought = leg.action == "BUY"
        if sl["type"] == "PCT_PREMIUM":
            level = p * (1 - sl["value"] / 100) if bought else p * (1 + sl["value"] / 100)
        elif sl["type"] == "POINTS":
            level = p - sl["value"] if bought else p + sl["value"]
        else:  # TRIGGER_CANDLE
            if sig.candle < 0:
                return NO_LEVELS
            lo, hi = int(candles.first_idx[sig.candle]), int(candles.end_idx[sig.candle])
            cidx = np.arange(lo, hi, dtype=np.int64)
            cidx = cidx[md.priceable[cidx]]
            if len(cidx) == 0:
                return NO_LEVELS
            _, ph, pl = pricer.ohlc(cidx, leg)
            level = float(np.min(pl)) if bought else float(np.max(ph))
        cap = adv.get("sl_cap_pts")
        if cap is not None:
            level = max(level, p - cap) if bought else min(level, p + cap)
        risk = p - level if bought else level - p
        if risk <= 1e-9:
            return NO_LEVELS
        stop_amt = risk
        target_amt: float | None = None
        if tgt is not None and tgt["type"] != "SPOT_LEVEL":
            target_amt = _gain_amount(tgt, p, risk)
            if not bought and p - target_amt <= tick + 1e-9:
                return NO_LEVELS
    else:
        stop_amt = big_e * sl["value"] / 100 if sl["type"] == "PCT_PREMIUM" else float(sl["value"])
        target_amt = None
        if tgt is not None and tgt["type"] != "SPOT_LEVEL":
            target_amt = _gain_amount(tgt, big_e, stop_amt)
        if stop_amt <= 0:
            return NO_LEVELS
    trail_amt: float | None = None
    if adv.get("trail_to_cost_at_r"):
        trail_amt = adv["trail_to_cost_at_r"] * stop_amt
    elif adv.get("trail_to_cost_at_pts"):  # REQ-ENG-52
        trail_amt = float(adv["trail_to_cost_at_pts"])

    # ---- the holding window ----
    fill_day = sig.fill_day
    if intraday:
        sq = _first_minute_at_or_after(md, fill_day, inst.squareoff)
        end_idx = _next_priceable(md, sq, len(md.minutes) - 1) if sq >= 0 else -1
        if end_idx < 0:
            return UNPRICEABLE
        settle_idx = -1
    else:
        exp_day = md.day_index(expiry)
        if exp_day >= 0:
            settle_idx = int(md.day_end[exp_day]) - 1
        else:  # expiry day missing from the data (excluded day): settle at the last minute before it
            settle_idx = int(np.searchsorted(md.minutes, date_to_day(expiry) * 1440, side="left")) - 1
        # last minute with an underlying close at or before the expiry day's end
        while settle_idx > f and math.isnan(md.s_close[settle_idx]):
            settle_idx -= 1
        end_idx = settle_idx
    window = np.arange(f, end_idx + 1, dtype=np.int64)
    window = window[md.priceable[window]]
    if len(window) == 0 or window[0] != f:
        return UNPRICEABLE

    # ---- combined P&L per unit over the window ----
    n = len(window)
    pnl_open = np.zeros(n)
    pnl_hi = np.zeros(n)  # at spot high
    pnl_lo = np.zeros(n)  # at spot low
    for leg in legs:
        po = pricer.at(window, leg, md.s_open[window], md.v_open[window])
        ph = pricer.at(window, leg, md.s_high[window], md.v_close[window])
        pl = pricer.at(window, leg, md.s_low[window], md.v_close[window])
        pnl_open += leg.sign * (po - leg.entry)
        pnl_hi += leg.sign * (ph - leg.entry)
        pnl_lo += leg.sign * (pl - leg.entry)
    worst = np.minimum(pnl_hi, pnl_lo)
    best = np.maximum(pnl_hi, pnl_lo)

    eps = 1e-9
    stop_hits = np.flatnonzero(worst <= -stop_amt + eps)
    first_stop = int(stop_hits[0]) if len(stop_hits) else n
    reason_stop = "STOP_LOSS"
    if trail_amt is not None:
        trig = np.flatnonzero(best >= trail_amt - eps)
        t_tr = int(trig[0]) if len(trig) else n
        if first_stop > t_tr:
            cost_hits = np.flatnonzero(worst[t_tr + 1 :] <= eps)
            if len(cost_hits):
                first_stop = t_tr + 1 + int(cost_hits[0])
                reason_stop = "TRAIL_TO_COST"
    first_target = n
    if target_amt is not None:
        th = np.flatnonzero(best >= target_amt - eps)
        first_target = int(th[0]) if len(th) else n

    # ---- time-based exits as positions in the window ----
    def pos_of(idx: int) -> int:
        """Window position of the first priceable minute ≥ idx (n when none)."""
        if idx < 0:
            return n
        return int(np.searchsorted(window, idx, side="left"))

    def after_candle(c: int) -> int:
        """Window position of the first minute after candle `c` closes."""
        return pos_of(int(np.searchsorted(md.minutes, int(candles.end_minute[c]) + 1, side="left")))

    side = legs[0].option_type.lower() if single else "all_legs"
    win_minutes = md.minutes[window]
    # The last candle that closed before each window minute (−1 before the first one).
    last_closed = np.searchsorted(candles.end_minute, win_minutes, side="left") - 1

    def level_track(key: str) -> tuple[FloatArr, bool] | None:
        """Per-window-minute level and whether it lies above the index at entry (REQ-ENG-53)."""
        arr = aux.levels.get(key)
        if arr is None:
            return None
        lv = np.where(last_closed >= 0, arr[np.maximum(last_closed, 0)], np.nan)
        known = np.flatnonzero(~np.isnan(lv))
        up = bool(lv[known[0]] >= md.s_open[window[known[0]]]) if len(known) else True
        return lv, up

    def touches(track: tuple[FloatArr, bool], start: int = 0) -> int:
        lv, up = track
        with np.errstate(invalid="ignore"):
            hit = md.s_high[window] >= lv if up else md.s_low[window] <= lv
        hits = np.flatnonzero(hit[start:])
        return start + int(hits[0]) if len(hits) else n

    def level_fill(pos: int, lv: float, beyond_open: bool) -> list[float]:
        """Leg premiums with the index at the level, or at the minute's open when it gapped beyond."""
        xi = int(window[pos])
        xa = np.array([xi], dtype=np.int64)
        if beyond_open and pos > 0:
            return [float(pricer.at(xa, leg, md.s_open[xa], md.v_open[xa])[0]) for leg in legs]
        return [float(pricer.at(xa, leg, np.array([lv]), md.v_close[xa])[0]) for leg in legs]

    candidates: list[tuple[int, int, str]] = []  # (position, priority, reason)
    if first_stop < n:
        candidates.append((first_stop, 0, reason_stop))
    if first_target < n:
        candidates.append((first_target, 1, "TARGET"))
    spot_target = None
    if tgt is not None and tgt["type"] == "SPOT_LEVEL":  # REQ-ENG-54
        spot_target = level_track(f"target_{side}")
        if spot_target is not None:
            p = touches(spot_target)
            if p < n:
                candidates.append((p, 1, "SPOT_TARGET"))
    flags = aux.exit_flags.get(side if side in aux.exit_flags else "all_legs")
    if flags is not None:  # REQ-ENG-51: on a candle close at or after the fill; fills at the next minute's open
        c0 = int(np.searchsorted(candles.end_minute, sig.fill_minute, side="left"))
        hits = np.flatnonzero(flags[c0:])
        if len(hits):
            p = after_candle(c0 + int(hits[0]))
            if p < n:
                candidates.append((p, -1, "SIGNAL_EXIT"))
    n_candles = adv.get("exit_after_candles")
    if n_candles:
        # The candle in which the entry filled counts as candle 1 (REQ-ENG-28).
        c0 = int(np.searchsorted(candles.end_minute, sig.fill_minute, side="left"))
        cn = c0 + int(n_candles) - 1
        if cn < len(candles):
            p = after_candle(cn)
            if p < n:
                candidates.append((p, 2, "N_CANDLES"))
    te = ex.get("time_exit")
    if te:
        tod = hhmm_to_min(te["at"])
        day = fill_day if te["on"] == "ENTRY_DAY" else md.day_index(expiry)
        if day >= 0:
            target_minute = int(md.days[day]) * 1440 + tod
            if target_minute > sig.fill_minute:
                p = pos_of(int(np.searchsorted(md.minutes, target_minute, side="left")))
                if p < n:
                    candidates.append((p, 3, "TIME_EXIT"))
    if intraday:
        candidates.append((n - 1, 4, "SQUARE_OFF"))
    else:
        candidates.append((n, 5, "EXPIRY_SETTLEMENT"))
    pos, _, reason = min(candidates)

    # ---- partial exit (REQ-ENG-55, 56) ----
    partial: PartialFill | None = None
    trailing: tuple[float, bool] | None = None  # the rest's index stop: level and favourable direction
    pe_spec = adv.get("partial_exit")
    if pe_spec and aux.lots >= 2:
        when = pe_spec["when"]
        pp, part_px = n, None
        if when["type"] == "PREMIUM_GAIN":
            gain_amt = _gain_amount(when["gain"], legs[0].entry if single else big_e, stop_amt)
            gh = np.flatnonzero(best >= gain_amt - eps)
            pp = int(gh[0]) if len(gh) else n
            if pp < pos:
                part_legs = [LegFill(lg.action, lg.option_type, lg.strike, lg.expiry, lg.entry) for lg in legs]
                gapped = pp > 0 and pnl_open[pp] >= gain_amt - eps
                xi = int(window[pp])
                if gapped:
                    xa = np.array([xi], dtype=np.int64)
                    part_px = [float(pricer.at(xa, lg, md.s_open[xa], md.v_open[xa])[0]) for lg in part_legs]
                elif single:
                    part_px = [part_legs[0].entry + part_legs[0].sign * gain_amt]
                else:
                    _exit_multi_at_level(part_legs, pricer, md, xi, gain_amt, False, pnl_hi[pp], pnl_lo[pp])
                    part_px = [lg.exit for lg in part_legs]
            fav_up = legs[0].is_call == (legs[0].action == "BUY")
        else:
            track = level_track(f"partial_{side}")
            fav_up = True if track is None else track[1]
            if track is not None:
                pp = touches(track)
                if pp < pos:
                    lv = float(track[0][pp])
                    o = float(md.s_open[window[pp]])
                    part_px = level_fill(pp, lv, o >= lv if track[1] else o <= lv)
        if part_px is not None and pp < pos:
            lots_out = min(max(int(aux.lots * pe_spec["percent"] // 100), 1), aux.lots - 1)
            part_exits = [
                _floor_tick(px - slippage if lg.action == "BUY" else px + slippage, tick)
                for lg, px in zip(legs, part_px, strict=True)
            ]
            partial = PartialFill(int(window[pp]), int(md.minutes[window[pp]]), lots_out, part_exits, "Partial exit")
            then = pe_spec["then_stop"]
            rest = [c for c in candidates if c[1] != 0]  # every exit but the stop
            if then == "UNCHANGED":
                rest = candidates
            elif then == "COST":
                cost_hits = np.flatnonzero(worst[pp + 1 :] <= eps)
                if len(cost_hits):
                    rest.append((pp + 1 + int(cost_hits[0]), 0, "TRAIL_TO_COST"))
            else:  # PARTIAL_CANDLE: the old stop until that candle closes, then the index stop
                kc = int(np.searchsorted(candles.end_minute, md.minutes[window[pp]], side="left"))
                act = after_candle(kc) if kc < len(candles) else n
                if first_stop < act:
                    rest.append((first_stop, 0, reason_stop))
                lvl = float(candles.low[kc] if fav_up else candles.high[kc]) if kc < len(candles) else math.nan
                if act < n and not math.isnan(lvl):
                    with np.errstate(invalid="ignore"):
                        broke = md.s_low[window] < lvl if fav_up else md.s_high[window] > lvl
                    bh = np.flatnonzero(broke[act:])
                    if len(bh):
                        rest.append((act + int(bh[0]), 0, "TRAILING_STOP"))
                        trailing = (lvl, fav_up)
            pos, _, reason = min(rest)

    # ---- exit prices ----
    if reason == "EXPIRY_SETTLEMENT":
        spot = float(md.s_close[settle_idx])
        for leg in legs:
            intrinsic = max(spot - leg.strike, 0.0) if leg.is_call else max(leg.strike - spot, 0.0)
            leg.exit = round(intrinsic, 2)
            leg.settled_intrinsic = leg.exit
        settled = int(md.minutes[settle_idx])
        return TradePath(legs, f, settle_idx, settled, reason, 0, stop_amt, target_amt, partial=partial)

    xi = int(window[pos])
    xarr = np.array([xi], dtype=np.int64)
    at_fill = pos == 0
    if reason in ("STOP_LOSS", "TRAIL_TO_COST", "TARGET"):
        level_pnl = {"STOP_LOSS": -stop_amt, "TRAIL_TO_COST": 0.0}.get(reason, target_amt or 0.0)
        adverse = reason != "TARGET"
        gapped = (not at_fill) and (pnl_open[pos] <= level_pnl + eps if adverse else pnl_open[pos] >= level_pnl - eps)
        if gapped:
            for leg in legs:
                leg.exit = float(pricer.at(xarr, leg, md.s_open[xarr], md.v_open[xarr])[0])
        elif single:
            leg = legs[0]
            leg.exit = leg.entry + leg.sign * level_pnl
        else:
            _exit_multi_at_level(legs, pricer, md, xi, level_pnl, adverse, pnl_hi[pos], pnl_lo[pos])
    elif reason == "SPOT_TARGET" and spot_target is not None:
        lv = float(spot_target[0][pos])
        o = float(md.s_open[xi])
        for leg, px in zip(legs, level_fill(pos, lv, o >= lv if spot_target[1] else o <= lv), strict=True):
            leg.exit = px
    elif reason == "TRAILING_STOP" and trailing is not None:
        lvl, up = trailing
        o = float(md.s_open[xi])
        for leg, px in zip(legs, level_fill(pos, lvl, o < lvl if up else o > lvl), strict=True):
            leg.exit = px
    else:
        for leg in legs:
            leg.exit = float(pricer.at(xarr, leg, md.s_open[xarr], md.v_open[xarr])[0])
    for leg in legs:
        leg.exit = _floor_tick(leg.exit - slippage if leg.action == "BUY" else leg.exit + slippage, tick)
    return TradePath(legs, f, xi, int(md.minutes[xi]), reason, len(legs), stop_amt, target_amt, partial=partial)


def _exit_multi_at_level(
    legs: list[LegFill],
    pricer: Pricer,
    md: MarketData,
    xi: int,
    level: float,
    adverse: bool,
    pnl_hi: float,
    pnl_lo: float,
) -> None:
    """Find the spot between the open and the minute's extreme where the combined P&L equals the
    level, and exit every leg at its premium there (rounded to the tick)."""
    xarr = np.array([xi], dtype=np.int64)
    s_open = float(md.s_open[xi])
    if adverse:
        s_ext = float(md.s_high[xi]) if pnl_hi <= pnl_lo else float(md.s_low[xi])
    else:
        s_ext = float(md.s_high[xi]) if pnl_hi >= pnl_lo else float(md.s_low[xi])
    vol = md.v_close[xarr]

    def pnl(s: float) -> float:
        arr = np.array([s])
        return sum(leg.sign * (float(pricer.at(xarr, leg, arr, vol, raw=True)[0]) - leg.entry) for leg in legs)

    a, b = s_open, s_ext
    for _ in range(60):
        mid = (a + b) / 2
        hit = pnl(mid) <= level if adverse else pnl(mid) >= level
        if hit:
            b = mid
        else:
            a = mid
    s_star = np.array([b])
    for leg in legs:
        leg.exit = float(pricer.at(xarr, leg, s_star, vol)[0])

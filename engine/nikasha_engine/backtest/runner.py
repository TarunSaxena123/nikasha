"""One backtest run and the three sensitivity runs (REQ-ENG-15, 19…22, 38…44; design §2.11).

Because each trade is simulated to its exit as soon as it is entered, "a position is open" is
simply `signal time < exit time of the last trade`. The three runs (shift 0, −S, +S) share the
same signals; each has its own gates and paths, because exit levels and fills depend on premiums.
"""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import numpy as np

from nikasha_engine.backtest.costs import Charges, CostRates, order_charges, round2, settlement_charges
from nikasha_engine.backtest.exits import Pricer, TradeAux, TradePath, simulate_trade
from nikasha_engine.backtest.signals import GATE_ORDER, Signal, generate_signals
from nikasha_engine.backtest.sizing import lots_for_vix
from nikasha_engine.calendar.expiry import ExpiryCalendar, build_calendar
from nikasha_engine.candles.resample import Candles, build_candles
from nikasha_engine.conditions.evaluator import Context, evaluate, operand
from nikasha_engine.data.gaps import GapInventory, inventory
from nikasha_engine.data.loader import MarketData, day_to_date


@dataclass(frozen=True)
class SimTrade:
    n: int
    side: str  # CE | PE | MULTI
    legs: tuple[dict[str, Any], ...]
    signal_minute: int
    entry_minute: int
    exit_minute: int
    entry_date: date
    spot_at_entry: float
    exit_reason: str
    quantity: int
    lots_used: int
    gross_pnl: float
    costs: float
    slippage_cost: float
    net_pnl: float
    vol_at_entry: float
    expiry_day: bool
    partial: dict[str, Any] | None = None  # {minute, quantity, exit_premiums, reason_text}


@dataclass
class RunResult:
    shift: float
    trades: list[SimTrade]
    skipped: dict[str, int]
    no_effect: dict[str, int]  # rule text → trades affected
    gaps: GapInventory
    signals_total: int
    data_days: list[tuple[date, str]] = field(default_factory=list)


@dataclass
class Prepared:
    md: MarketData
    cal: ExpiryCalendar
    candles: Candles
    strategy: dict[str, Any]
    rates: CostRates
    start: date
    end: date
    signals: list[Signal]
    aux: TradeAux = field(default_factory=TradeAux)


def get_calendar(md: MarketData) -> ExpiryCalendar:
    cached = md.cache.get("calendar")
    if isinstance(cached, ExpiryCalendar):
        return cached
    cal = build_calendar(md.instrument, [day_to_date(int(d)) for d in md.calendar_days])
    md.cache["calendar"] = cal
    return cal


def prepare(md: MarketData, strategy: dict[str, Any], settings: dict[str, Any]) -> Prepared:
    cal = get_calendar(md)
    candles = build_candles(md, int(strategy["timeframe_min"]))
    start = date.fromisoformat(settings["period"]["start"])
    end = date.fromisoformat(settings["period"]["end"])
    signals = generate_signals(md, candles, cal, strategy, start, end)
    rates = CostRates.from_settings(settings["costs"])
    return Prepared(md, cal, candles, strategy, rates, start, end, signals, _aux(md, candles, strategy))


def _aux(md: MarketData, candles: Candles, strategy: dict[str, Any]) -> TradeAux:
    """Exit-condition flags and index-level series, computed once per strategy (REQ-ENG-51, 53)."""
    ctx = Context(candles, strategy["indicators"], md)
    ex: dict[str, Any] = strategy["exit"]
    flags = {k: evaluate(tree, ctx) for k, tree in (ex.get("exit_when") or {}).items()}
    levels: dict[str, Any] = {}
    tgt = ex.get("target")
    if tgt and tgt["type"] == "SPOT_LEVEL":
        levels.update({f"target_{k}": operand(tgt[k], ctx) for k in ("ce", "pe") if k in tgt})
    pe_spec = (strategy.get("advanced") or {}).get("partial_exit")
    if pe_spec and pe_spec["when"]["type"] == "SPOT_LEVEL":
        w = pe_spec["when"]
        levels.update({f"partial_{k}": operand(w[k], ctx) for k in ("ce", "pe") if k in w})
    return TradeAux(flags, levels)


VIX_SIZING_NO_EFFECT = (
    "Volatility sizing: the size it set was below 1 lot, so 1 lot was used (the rule had no effect on these trades)"
)
PARTIAL_NO_EFFECT = (
    "Partial exit: the trade used 1 lot, so nothing could be split off (the rule had no effect on these trades)"
)


def run_once(prep: Prepared, shift: float, pricer: Pricer | None = None) -> RunResult:
    """One run. `pricer` can be replaced in tests to control premiums exactly."""
    md, strategy = prep.md, prep.strategy
    adv: dict[str, Any] = strategy.get("advanced") or {}
    daily: dict[str, Any] = adv.get("daily") or {}
    max_trades = daily.get("max_trades")
    sl_limit = daily.get("stop_after_sl_hits")
    loss_limit = daily.get("max_daily_loss_rupees")
    lots = int(strategy["position"]["lots"])
    lot_size = int(strategy["position"]["lot_size"])
    vix_sizing = adv.get("vix_sizing")
    pricer = pricer or Pricer(md, shift)
    rates = prep.rates

    skipped: Counter[str] = Counter()
    no_effect: Counter[str] = Counter()
    trades: list[SimTrade] = []
    entries: Counter[int] = Counter()
    sl_hits: Counter[int] = Counter()
    realised: dict[int, float] = {}
    position_until = -(10**12)

    for sig in prep.signals:
        if sig.side == "CONFLICT":
            skipped["CONFLICTING_SIGNALS"] += 1
            continue
        if sig.signal_minute < position_until:
            skipped["POSITION_OPEN"] += 1
            continue
        if sig.early_reason:
            skipped[sig.early_reason] += 1
            continue
        day = sig.signal_day
        if max_trades is not None and entries[day] >= max_trades:
            skipped["MAX_TRADES"] += 1
            continue
        if sl_limit is not None and sl_hits[day] >= sl_limit:
            skipped["SL_HITS_LIMIT"] += 1
            continue
        if loss_limit is not None and realised.get(day, 0.0) <= -loss_limit:
            skipped["MAX_DAILY_LOSS"] += 1
            continue
        if sig.late_reason:
            skipped[sig.late_reason] += 1
            continue
        # Size first: a partial exit needs to know the lots (REQ-ENG-57).
        if vix_sizing:
            if vix_sizing["measured_at"] == "DAY_OPEN":
                lo, hi = int(md.day_start[sig.fill_day]), int(md.day_end[sig.fill_day])
                present = np.flatnonzero(~np.isnan(md.v_open[lo:hi]))
                vix = float(md.v_open[lo + int(present[0])]) if len(present) else math.nan
            else:
                vix = float(md.v_open[sig.fill_idx])
            used, raised = lots_for_vix(lots, vix_sizing, vix)
        else:
            used, raised = lots, False
        qty = used * lot_size

        aux = TradeAux(prep.aux.exit_flags, prep.aux.levels, used)
        path = simulate_trade(sig, strategy, md, prep.candles, pricer, rates.slippage_pts, aux)
        if isinstance(path, str):
            skipped[path] += 1
            continue
        if raised:
            no_effect[VIX_SIZING_NO_EFFECT] += 1
        if adv.get("partial_exit") and used < 2:
            no_effect[PARTIAL_NO_EFFECT] += 1

        trade = _finish(len(trades) + 1, sig, path, qty, used, rates, md, lot_size)
        trades.append(trade)
        position_until = trade.exit_minute
        entries[day] += 1
        exit_day = int(md.day_id[path.exit_idx])
        if trade.exit_reason == "STOP_LOSS":
            sl_hits[exit_day] += 1
        realised[exit_day] = realised.get(exit_day, 0.0) + trade.net_pnl

    gaps = inventory(md, prep.start, prep.end)
    data_days = sorted((d, r) for d, r in md.excluded_days.items() if prep.start <= d <= prep.end)
    ordered = {r: skipped[r] for r in GATE_ORDER if skipped.get(r)}
    return RunResult(shift, trades, ordered, dict(no_effect), gaps, len(prep.signals), data_days)


def _finish(
    n: int,
    sig: Signal,
    path: TradePath,
    qty: int,
    lots_used: int,
    rates: CostRates,
    md: MarketData,
    lot_size: int = 1,
) -> SimTrade:
    """Charges, P&L and the trade record; a partial exit is charged for its own quantity (REQ-ENG-57)."""
    charges: list[Charges] = []
    gross = 0.0
    legs_out = []
    part = path.partial
    part_qty = part.lots * lot_size if part else 0
    rest_qty = qty - part_qty
    for i, leg in enumerate(path.legs):
        closing = "SELL" if leg.action == "BUY" else "BUY"
        charges.append(order_charges(rates, leg.action, leg.entry, qty))
        if part:
            charges.append(order_charges(rates, closing, part.exits[i], part_qty))
            gross += leg.sign * (part.exits[i] - leg.entry) * part_qty
        if path.exit_reason == "EXPIRY_SETTLEMENT":
            charges.append(settlement_charges(rates, leg.action, leg.settled_intrinsic, rest_qty))
        else:
            charges.append(order_charges(rates, closing, leg.exit, rest_qty))
        gross += leg.sign * (leg.exit - leg.entry) * rest_qty
        legs_out.append(
            {
                "action": leg.action,
                "option_type": leg.option_type,
                "strike": leg.strike,
                "expiry": leg.expiry.isoformat(),
                "entry_premium": round(leg.entry, 2),
                "exit_premium": round(leg.exit, 2),
            }
        )
    costs = round2(sum(c.total for c in charges))
    gross = round2(gross)
    slipped_qty = len(path.legs) * (qty + part_qty) + path.exit_fills_with_slippage * rest_qty
    entry_date = day_to_date(int(md.days[sig.fill_day]))
    return SimTrade(
        n=n,
        side=sig.side if sig.side in ("CE", "PE") else "MULTI",
        legs=tuple(legs_out),
        signal_minute=sig.signal_minute,
        entry_minute=sig.fill_minute,
        exit_minute=path.exit_minute,
        entry_date=entry_date,
        spot_at_entry=float(md.s_open[sig.fill_idx]),
        exit_reason=path.exit_reason,
        quantity=qty,
        lots_used=lots_used,
        gross_pnl=gross,
        costs=costs,
        slippage_cost=round2(rates.slippage_pts * slipped_qty),
        net_pnl=round2(gross - costs),
        vol_at_entry=float(md.v_open[sig.fill_idx]),
        expiry_day=sig.expiry == entry_date,
        partial=None
        if part is None
        else {
            "minute": part.minute,
            "quantity": part_qty,
            "exit_premiums": [round(x, 2) for x in part.exits],
            "reason_text": part.reason_text,
        },
    )


def run_all(
    md: MarketData, strategy: dict[str, Any], settings: dict[str, Any]
) -> tuple[RunResult, RunResult, RunResult]:
    """Base run plus the −S and +S volatility runs (REQ-ENG-15). Signals are shared."""
    prep = prepare(md, strategy, settings)
    s = md.instrument.sensitivity_shift
    return run_once(prep, 0.0), run_once(prep, -s), run_once(prep, s)

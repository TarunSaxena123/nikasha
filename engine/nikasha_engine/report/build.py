"""Report assembly (feature 02 design §2.1; api.openapi.yaml → Report). Pure and deterministic,
apart from `generated_at`."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from nikasha_engine.backtest.runner import RunResult, SimTrade
from nikasha_engine.core.meta import data_source, timestamp
from nikasha_engine.data.loader import MarketData, date_to_day
from nikasha_engine.report import fmt
from nikasha_engine.report.breakdowns import GroupTrade, breakdowns, vol_band_index, vol_band_labels
from nikasha_engine.report.disclosures import (
    EXIT_TEXTS,
    SKIP_TEXTS,
    disclosures,
    settings_used,
    simulation_notes,
)
from nikasha_engine.report.metrics import TradeRow, equity_curve, metrics
from nikasha_engine.report.overfit import overfit
from nikasha_engine.report.regimes import day_regimes
from nikasha_engine.report.summary import summarise

IST = timezone(timedelta(hours=5, minutes=30))


def trading_days(md: MarketData, start: date, end: date) -> int:
    lo, hi = date_to_day(start), date_to_day(end)
    days = {int(d) for d in md.calendar_days if lo <= d <= hi}
    days |= {date_to_day(d) for d in md.instrument.extra_trading_days if start <= d <= end}
    return len(days)


def _rows(trades: list[SimTrade], start: date, end: date) -> list[tuple[date, TradeRow]]:
    return [
        (t.entry_date, TradeRow(t.net_pnl, t.gross_pnl, t.costs, t.slippage_cost, t.exit_minute))
        for t in trades
        if start <= t.entry_date <= end
    ]


def build_report(
    strategy: dict[str, Any],
    settings: dict[str, Any],
    base: RunResult,
    minus: RunResult,
    plus: RunResult,
    md: MarketData,
    version: str,
) -> dict[str, Any]:
    inst = md.instrument
    start = date.fromisoformat(settings["period"]["start"])
    end = date.fromisoformat(settings["period"]["end"])
    capital = settings.get("capital_rupees")
    cap = float(capital) if capital else None
    n_days = trading_days(md, start, end)
    period_text = f"{fmt.period(start, end)} ({fmt.count(n_days, 'trading day')})"

    def m_of(rows: list[TradeRow]) -> dict[str, Any]:
        return metrics(rows, cap)

    base_rows = _rows(base.trades, start, end)
    m = m_of([r for _, r in base_rows])
    curve, _, _ = equity_curve([r for _, r in base_rows], cap)

    regimes = day_regimes(md)
    edges = inst.vol_band_edges
    band_labels = vol_band_labels(edges, inst.volatility_name)
    trades_out: list[dict[str, Any]] = []
    groups: list[GroupTrade] = []
    for t in base.trades:
        if not start <= t.entry_date <= end:
            continue
        di = md.day_index(t.entry_date)
        regime = regimes[di] if di >= 0 else "UNKNOWN"
        band = vol_band_index(t.vol_at_entry, edges)
        groups.append(GroupTrade(t.entry_date, t.net_pnl, band, regime, t.expiry_day, t.side))
        trades_out.append(
            {
                "n": len(trades_out) + 1,
                "side": t.side,
                "legs": [dict(leg) for leg in t.legs],
                "signal_time": timestamp(t.signal_minute),
                "entry_time": timestamp(t.entry_minute),
                "exit_time": timestamp(t.exit_minute),
                "spot_at_entry": round(t.spot_at_entry, 2),
                "exit_reason": t.exit_reason,
                "exit_reason_text": EXIT_TEXTS[t.exit_reason],
                "quantity": t.quantity,
                "gross_pnl": t.gross_pnl,
                "costs": t.costs,
                "net_pnl": t.net_pnl,
                "vol_at_entry": round(t.vol_at_entry, 2),
                "vol_band": band_labels[band],
                "regime": regime,
                "expiry_day": t.expiry_day,
            }
        )
    bd = breakdowns(groups, band_labels)

    kind = "WEEKLY" if strategy["legs"][0]["expiry"] in ("CURRENT_WEEKLY", "NEXT_WEEKLY") else "MONTHLY"
    of = overfit(base_rows, start, end, inst.periods[kind], m_of)

    m_minus = m_of([r for _, r in _rows(minus.trades, start, end)])
    m_plus = m_of([r for _, r in _rows(plus.trades, start, end)])
    skipped_signals = [{"reason": r, "reason_text": SKIP_TEXTS[r], "count": c} for r, c in base.skipped.items()]
    summary = summarise(
        period_text=period_text,
        m=m,
        capital=cap,
        breakdowns=bd,
        overfit_text=of["status_text"],
        shift=inst.sensitivity_shift,
        net_minus=m_minus["net_pnl"],
        net_plus=m_plus["net_pnl"],
        signals_total=base.signals_total,
        skipped=skipped_signals,
        vol_name=inst.volatility_name,
    )
    first, last = md.first_date, md.last_date
    return {
        "engine_version": version,
        "generated_at": datetime.now(IST).strftime("%Y-%m-%dT%H:%M"),
        "instrument": {"symbol": inst.symbol, "name": inst.name},
        "period": {"start": start.isoformat(), "end": end.isoformat(), "trading_days": n_days},
        "metrics": m,
        "equity_curve": [{"t": timestamp(t), "equity": e, "drawdown": d} for t, e, d in curve],
        "breakdowns": bd,
        "overfit": of,
        "sensitivity": [
            {"vol_shift_pts": -inst.sensitivity_shift, "metrics": m_minus},
            {"vol_shift_pts": inst.sensitivity_shift, "metrics": m_plus},
        ],
        "skipped": {
            "data_days": [{"date": d.isoformat(), "reason_text": r} for d, r in base.data_days],
            "data_minutes": {
                "missing_underlying": base.gaps.missing_underlying,
                "missing_volatility": base.gaps.missing_volatility,
            },
            "signals": skipped_signals,
        },
        "settings_used": settings_used(strategy, settings, inst, period_text, base.no_effect),
        "summary": summary,
        "simulation_notes": simulation_notes(inst, settings),
        "disclosures": disclosures(inst),
        "data_source": data_source(inst, first, last),
        "trades": trades_out,
    }

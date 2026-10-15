"""Report metrics (REQ-RPT-01…04; feature 02 design §2.2).

Every figure uses only trades entered within the selected period. Wins: net > 0; losses: net < 0;
break-even trades are neither, count as trades, and end a losing streak (D5).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from nikasha_engine.backtest.costs import round2


@dataclass(frozen=True)
class TradeRow:
    """What the metrics need from a trade, in exit order."""

    net: float
    gross: float
    costs: float
    slippage: float
    exit_minute: int


def _mean(xs: Sequence[float]) -> float | None:
    return round2(sum(xs) / len(xs)) if xs else None


def metrics(rows: Sequence[TradeRow], capital: float | None) -> dict[str, Any]:
    rows = sorted(rows, key=lambda r: r.exit_minute)
    nets = [r.net for r in rows]
    wins = [n for n in nets if n > 0]
    losses = [n for n in nets if n < 0]
    streak = worst = 0
    for n in nets:
        streak = streak + 1 if n < 0 else 0
        worst = max(worst, streak)
    _, max_dd, max_dd_pct = equity_curve(rows, capital)
    total = sum(nets)
    out: dict[str, Any] = {
        "trades": len(rows),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate_pct": round(100.0 * len(wins) / len(rows), 2) if rows else None,
        "net_pnl": round2(total),
        "gross_pnl": round2(sum(r.gross for r in rows)),
        "total_costs": round2(sum(r.costs for r in rows)),
        "total_slippage": round2(sum(r.slippage for r in rows)),
        "avg_win": _mean(wins),
        "avg_loss": _mean(losses),
        "expectancy": _mean(nets),
        "largest_win": round2(max(wins)) if wins else None,
        "largest_loss": round2(min(losses)) if losses else None,
        "max_drawdown": round2(max_dd),
        "max_drawdown_pct": max_dd_pct,
        "return_pct": round(100.0 * total / capital, 2) if capital else None,
        "worst_losing_streak": worst,
    }
    return out


def equity_curve(
    rows: Sequence[TradeRow], capital: float | None
) -> tuple[list[tuple[int, float, float]], float, float | None]:
    """[(exit_minute, equity, drawdown)], max drawdown, max drawdown % (with capital).

    Equity starts at 0; drawdown = running peak (including the starting 0) − equity.
    Max drawdown % = largest (peak − equity) ÷ (capital + peak) × 100.
    """
    points: list[tuple[int, float, float]] = []
    equity = peak = 0.0
    max_dd = 0.0
    max_dd_pct: float | None = 0.0 if capital else None
    for r in sorted(rows, key=lambda x: x.exit_minute):
        equity += r.net
        peak = max(peak, equity)
        dd = peak - equity
        points.append((r.exit_minute, round2(equity), round2(dd)))
        max_dd = max(max_dd, dd)
        if capital:
            assert max_dd_pct is not None
            max_dd_pct = max(max_dd_pct, 100.0 * dd / (capital + peak))
    if max_dd_pct is not None:
        max_dd_pct = round(max_dd_pct, 2)
    return points, max_dd, max_dd_pct

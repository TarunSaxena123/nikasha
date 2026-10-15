"""REQ-ENG-36, 37, 15, 43, 44 (AC-ENG-18, 20, 23, 25)."""

from __future__ import annotations

from datetime import date

import pytest

from conftest import default_costs, run, settings, single_leg, synth, weekdays
from nikasha_engine.backtest.costs import CostRates, order_charges, settlement_charges
from nikasha_engine.backtest.runner import run_all

JUNE = weekdays(date(2024, 6, 3), 5)


def test_charges_to_the_paisa(nifty):
    """AC-ENG-18: one bought round trip of 65 at 100 → 150 with the NIFTY50 default costs."""
    r = CostRates.from_settings(default_costs(nifty))
    buy = order_charges(r, "BUY", 100.0, 65)
    sell = order_charges(r, "SELL", 150.0, 65)
    # Buy: turnover 6,500. Exchange 0.03553% = 2.30945 → 2.31; SEBI ₹10/crore = 0.0065 → 0.01;
    # stamp 0.003% = 0.195 → 0.20; GST 18% of (20 + 2.31 + 0.01) = 4.0176 → 4.02.
    assert (buy.brokerage, buy.stt, buy.exchange, buy.sebi, buy.stamp, buy.gst) == (20, 0, 2.31, 0.01, 0.20, 4.02)
    assert buy.total == 26.54
    # Sell: turnover 9,750. STT 0.15% = 14.625 → 14.63; exchange 3.464175 → 3.46; SEBI 0.00975 → 0.01;
    # GST 18% of 23.47 = 4.2246 → 4.22.
    assert (sell.brokerage, sell.stt, sell.exchange, sell.sebi, sell.stamp, sell.gst) == (
        20,
        14.63,
        3.46,
        0.01,
        0,
        4.22,
    )
    assert sell.total == 42.32


def test_round_trip_costs_on_a_trade(nifty):
    from conftest import LinearPricer  # noqa: F401  (premiums 100 → 150 via spot)

    md = synth(nifty, JUNE[:1], spot=lambda d, tod: (24550.0,) * 4 if tod >= 13 * 60 else (24500.0,) * 4)
    costs = {**default_costs(nifty), "slippage_pts": 0.0}
    tr = run(md, single_leg(), settings("2024-06-03", "2024-06-03", costs)).trades[0]
    assert tr.legs[0]["entry_premium"] == 100 and tr.legs[0]["exit_premium"] == 150
    assert tr.gross_pnl == 3250 and tr.costs == 68.86 and tr.net_pnl == pytest.approx(3250 - 68.86)


def test_settlement_charges():
    r = CostRates(20, 0.15, 0.15, 0.03553, 10, 0.003, 18, 0.5)
    long_itm = settlement_charges(r, "BUY", 130.0, 65)  # STT on exercise 0.15% of 8,450 = 12.675 → 12.68
    assert (long_itm.brokerage, long_itm.stt, long_itm.gst, long_itm.exchange) == (20, 12.68, 3.6, 0)
    assert settlement_charges(r, "BUY", 0.0, 65).total == 0  # worthless: no charges


def test_slippage_reported_separately(nifty):
    md = synth(nifty, JUNE[:1])
    costs = {**{k: 0.0 for k in default_costs(nifty)}, "slippage_pts": 0.5}
    tr = run(md, single_leg(), settings("2024-06-03", "2024-06-03", costs)).trades[0]
    assert tr.legs[0]["entry_premium"] == 100.5 and tr.legs[0]["exit_premium"] == 99.5
    assert tr.slippage_cost == pytest.approx(0.5 * 65 * 2) and tr.costs == 0


def test_same_request_twice_is_identical(nifty):
    """AC-ENG-23 (REQ-ENG-44)."""
    md = synth(nifty, JUNE, spot=lambda d, tod: (24500 + (tod % 37) - d * 3,) * 4)
    s = single_leg(entry={"ce": {"type": "compare", "left": {"price": "close"}, "op": "gt", "right": {"const": 24520}}})
    a = run_all(md, s, settings("2024-06-03", "2024-06-07", default_costs(nifty)))
    b = run_all(md, s, settings("2024-06-03", "2024-06-07", default_costs(nifty)))
    assert [r.trades for r in a] == [r.trades for r in b]


def test_three_runs_share_signals(nifty):
    """AC-ENG-25: shift 0, −2, +2; signals identical, premiums differ."""
    md = synth(nifty, JUNE)
    base, minus, plus = run_all(md, single_leg(), settings("2024-06-03", "2024-06-07", default_costs(nifty)))
    assert (base.shift, minus.shift, plus.shift) == (0.0, -2.0, 2.0)
    assert base.signals_total == minus.signals_total == plus.signals_total == 5
    assert [t.entry_minute for t in base.trades] == [t.entry_minute for t in minus.trades]
    assert (
        minus.trades[0].legs[0]["entry_premium"]
        < base.trades[0].legs[0]["entry_premium"]
        < plus.trades[0].legs[0]["entry_premium"]
    )

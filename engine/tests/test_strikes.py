"""REQ-ENG-16, 17 (AC-ENG-07): strike selection."""

from __future__ import annotations

from nikasha_engine.backtest.strikes import SEARCH_INTERVALS, atm_strike, moneyness_strike, search_strike


def test_examples_from_the_spec():
    assert moneyness_strike(24500, 50, "ITM", 100, True) == 24400  # 24,400 CE
    assert moneyness_strike(24500, 50, "ITM", 100, False) == 24600  # 24,600 PE
    assert atm_strike(24525, 50) == 24550  # exact half rounds up
    assert atm_strike(24524.99, 50) == 24500
    assert moneyness_strike(24500, 50, "OTM", 100, True) == 24600
    assert moneyness_strike(24500, 50, "OTM", 100, False) == 24400


def test_search_tie_goes_to_strike_nearer_atm():
    # measure symmetric around ATM: distance from ATM in intervals; target 2 → ±2 tie
    got = search_strike(24500, 50, 2.0, lambda k: abs(k - 24500) / 50)
    assert got == 24400  # nearer is equal; lower strike breaks the remaining tie deterministically
    got = search_strike(24500, 50, 1.4, lambda k: abs(k - 24500) / 50)
    assert got in (24450, 24550)


def test_search_range_is_twenty_intervals():
    got = search_strike(24500, 50, 1000.0, lambda k: (k - 24500) / 50)
    assert got == 24500 + SEARCH_INTERVALS * 50


def test_delta_strike_with_real_pricing():
    import numpy as np

    from nikasha_engine.pricing.black_scholes_vix import BlackScholesVIXProvider

    bs = BlackScholesVIXProvider(0.065, 0.05)
    one = lambda x: np.array([x])  # noqa: E731
    delta = lambda k: abs(float(bs.delta(one(24500.0), k, one(15.0), one(7 * 1440.0), True, 0)[0]))  # noqa: E731
    got = search_strike(24500, 50, 0.5, delta)
    candidates = [24500 + i * 50 for i in range(-20, 21)]
    assert got == min(candidates, key=lambda k: abs(delta(k) - 0.5))
    assert 0.4 < delta(got) < 0.6

"""REQ-ENG-12…14 (AC-ENG-06): Black-Scholes with VIX as IV, tick rounding, floors."""

from __future__ import annotations

import math

import numpy as np
import pytest

from nikasha_engine.pricing.black_scholes_vix import BlackScholesVIXProvider, round_to_tick


def _norm_cdf(x: float) -> float:
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def _reference(s, k, vix, minutes, r, call):
    sigma = max(vix, 1) / 100
    t = max(minutes, 1) / 525600
    d1 = (math.log(s / k) + (r + sigma**2 / 2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)
    if call:
        return s * _norm_cdf(d1) - k * math.exp(-r * t) * _norm_cdf(d2)
    return k * math.exp(-r * t) * _norm_cdf(-d2) - s * _norm_cdf(-d1)


BS = BlackScholesVIXProvider(0.065, 0.05)
SEVEN_DAYS = 7 * 1440.0


def price(s, k, vix, minutes, call, shift=0.0, raw=False):
    f = BS.raw_price if raw else BS.price
    return float(f(np.array([s]), k, np.array([vix]), np.array([minutes]), call, shift)[0])


def test_reference_values_and_parity():
    """AC-ENG-06: S=K=24,500, VIX 15, 7 days, r 6.5%."""
    call = price(24500, 24500, 15, SEVEN_DAYS, True)
    put = price(24500, 24500, 15, SEVEN_DAYS, False)
    ref_call = _reference(24500, 24500, 15, SEVEN_DAYS, 0.065, True)
    ref_put = _reference(24500, 24500, 15, SEVEN_DAYS, 0.065, False)
    assert price(24500, 24500, 15, SEVEN_DAYS, True, raw=True) == pytest.approx(ref_call, abs=1e-8)
    assert price(24500, 24500, 15, SEVEN_DAYS, False, raw=True) == pytest.approx(ref_put, abs=1e-8)
    assert call == pytest.approx(round(ref_call / 0.05) * 0.05, abs=1e-9)
    assert put == pytest.approx(round(ref_put / 0.05) * 0.05, abs=1e-9)
    t = SEVEN_DAYS / 525600
    parity = 24500 - 24500 * math.exp(-0.065 * t)
    assert abs((call - put) - parity) <= 0.05 + 1e-9
    for p in (call, put):
        assert abs(p / 0.05 - round(p / 0.05)) < 1e-9


def test_sigma_and_time_floors():
    # VIX 2.5 − 2 = 0.5 → σ floored at 1%
    assert price(24500, 24500, 2.5, SEVEN_DAYS, True, shift=-2, raw=True) == pytest.approx(
        _reference(24500, 24500, 1.0, SEVEN_DAYS, 0.065, True), abs=1e-9
    )
    # T floored at one minute: never NaN, even at or after expiry
    assert not math.isnan(price(24500, 24500, 15, 0, True))
    assert not math.isnan(price(24500, 24500, 15, -30, True))


def test_far_otm_floored_at_one_tick():
    assert price(24500, 30000, 15, 60.0, True) == 0.05


def test_premium_range_is_monotonic_in_spot():
    spots = np.array([24400.0, 24500.0, 24600.0])
    vol = np.full(3, 15.0)
    mte = np.full(3, SEVEN_DAYS)
    calls = BS.raw_price(spots, 24500, vol, mte, True, 0.0)
    puts = BS.raw_price(spots, 24500, vol, mte, False, 0.0)
    assert np.all(np.diff(calls) > 0) and np.all(np.diff(puts) < 0)


def test_round_to_tick_halves_up():
    assert round_to_tick(np.array([10.025]), 0.05)[0] == 10.05
    assert round_to_tick(np.array([10.024]), 0.05)[0] == 10.0
    assert round_to_tick(np.array([0.01]), 0.05)[0] == 0.05

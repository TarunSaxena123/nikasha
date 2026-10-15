"""Per-order charges (REQ-ENG-36; backend.md §4.6; design §2.15).

Rates come from the request's evaluation settings (pre-filled from the profile, confirmed by the
user). Each charge is rounded half-up to 2 decimals per order. Slippage is applied to prices, not
charged here, and is reported separately.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Any


def _d(x: float | int | Decimal) -> Decimal:
    return x if isinstance(x, Decimal) else Decimal(repr(x))


def round2(x: float | Decimal) -> float:
    """Half-up rounding to 2 decimals (paise)."""
    return float(_d(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _charge(rate_pct: float, turnover: Decimal) -> float:
    """rate% of turnover, computed exactly in decimal, then rounded to paise."""
    return round2(_d(rate_pct) / 100 * turnover)


@dataclass(frozen=True)
class Charges:
    brokerage: float = 0.0
    stt: float = 0.0
    exchange: float = 0.0
    sebi: float = 0.0
    stamp: float = 0.0
    gst: float = 0.0

    @property
    def total(self) -> float:
        return round2(
            sum((_d(x) for x in (self.brokerage, self.stt, self.exchange, self.sebi, self.stamp, self.gst)), Decimal(0))
        )


@dataclass(frozen=True)
class CostRates:
    brokerage_per_order: float
    stt_sell_pct: float
    stt_exercise_pct: float
    exchange_txn_pct: float
    sebi_per_crore: float
    stamp_buy_pct: float
    gst_pct: float
    slippage_pts: float

    @staticmethod
    def from_settings(costs: dict[str, Any]) -> CostRates:
        return CostRates(**{k: float(costs[k]) for k in CostRates.__dataclass_fields__})


def order_charges(rates: CostRates, side: str, price: float, quantity: int) -> Charges:
    """Charges for one executed order. side: 'BUY' or 'SELL'. price: fill price after slippage."""
    turnover = _d(round(price, 6)) * quantity
    brokerage = round2(rates.brokerage_per_order)
    stt = _charge(rates.stt_sell_pct, turnover) if side == "SELL" else 0.0
    exchange = _charge(rates.exchange_txn_pct, turnover)
    sebi = round2(_d(rates.sebi_per_crore) * turnover / Decimal(10_000_000))
    stamp = _charge(rates.stamp_buy_pct, turnover) if side == "BUY" else 0.0
    gst = _charge(rates.gst_pct, _d(brokerage) + _d(exchange) + _d(sebi))
    return Charges(brokerage, stt, exchange, sebi, stamp, gst)


def settlement_charges(rates: CostRates, action: str, intrinsic: float, quantity: int) -> Charges:
    """Charges when a position is settled at expiry.

    Long in-the-money: brokerage + STT on exercise (on intrinsic value) + GST on brokerage.
    Short in-the-money: brokerage + GST on brokerage (no STT, exchange, SEBI or stamp) — see
    specs/PENDING-REVIEW.md. Expiring worthless: no charges.
    """
    if intrinsic <= 0:
        return Charges()
    brokerage = round2(rates.brokerage_per_order)
    stt = _charge(rates.stt_exercise_pct, _d(round(intrinsic, 6)) * quantity) if action == "BUY" else 0.0
    gst = _charge(rates.gst_pct, _d(brokerage))
    return Charges(brokerage=brokerage, stt=stt, gst=gst)

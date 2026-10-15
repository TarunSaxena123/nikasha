"""Shared number and date formatting for engine-written text (frontend.md §5.5, T-RPT-08).

Rupees use Indian digit grouping (₹1,23,456); negatives use the minus sign (−₹4,250).
"""

from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

MINUS = "−"


def _group_indian(integer: str) -> str:
    if len(integer) <= 3:
        return integer
    head, tail = integer[:-3], integer[-3:]
    parts: list[str] = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts) + "," + tail


def rupees(x: float, decimals: int = 0, signed: bool = True) -> str:
    """₹ amount with Indian grouping. signed=False drops the minus sign (for 'lost ₹X')."""
    q = Decimal(repr(abs(x))).quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP)
    text = f"{q:.{decimals}f}"
    integer, _, frac = text.partition(".")
    body = "₹" + _group_indian(integer) + (f".{frac}" if frac else "")
    negative = x < 0 and q != 0
    return (MINUS + body) if (negative and signed) else body


def number(x: float, decimals: int = 0) -> str:
    q = Decimal(repr(abs(x))).quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP)
    integer, _, frac = f"{q:.{decimals}f}".partition(".")
    body = _group_indian(integer) + (f".{frac}" if frac else "")
    return (MINUS + body) if x < 0 and q != 0 else body


def pct(x: float, decimals: int = 1) -> str:
    return number(x, decimals) + "%"


def day(d: date) -> str:
    return f"{d.day} {d.strftime('%b %Y')}"


def period(start: date, end: date) -> str:
    return f"{day(start)} – {day(end)}"


def count(n: int, singular: str, plural: str | None = None) -> str:
    return f"{number(n)} {singular if n == 1 else (plural or singular + 's')}"


def points(x: float) -> str:
    """Up to 2 decimals, without trailing zeros: 30 → '30', 1.5 → '1.5', 0.25 → '0.25'."""
    text = number(x, 2)
    return text.rstrip("0").rstrip(".") if "." in text else text

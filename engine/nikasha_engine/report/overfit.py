"""Overfitting check (REQ-RPT-07, 08; feature 02 design §2.5, decision D4)."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from datetime import date
from typing import Any

from nikasha_engine.instruments.registry import PeriodConfig
from nikasha_engine.report import fmt
from nikasha_engine.report.metrics import TradeRow

MIN_TRADES = 30

TEXT_A = (
    "This period doesn't include both the earlier tuning years and the unseen recent years, so overfitting can't "
    "be checked. Choose a longer period to see this check."
)
TEXT_B = "Too few trades to judge: {n_is} in {is_label} and {n_oos} in {oos_label}. At least 30 in each are needed."
TEXT_C = "The strategy lost money in the earlier period too, so there is no good result to test for overfitting."
TEXT_D = (
    "Possibly overfit: in the unseen period ({oos_label}) the average result per trade was {oos_exp}, compared with "
    "{is_exp} in {is_label}. Results that fade on unseen data are a common sign that rules fit past noise."
)
TEXT_E = (
    "Held up on unseen data: the average result per trade was {oos_exp} in {oos_label}, compared with {is_exp} in "
    "{is_label}."
)


def overfit(
    rows: Sequence[tuple[date, TradeRow]],
    start: date,
    end: date,
    split: PeriodConfig,
    metrics_of: Callable[[list[TradeRow]], dict[str, Any]],
) -> dict[str, Any]:
    is_from, is_to = max(start, split.in_sample_from), min(end, split.in_sample_to)
    oos_from, oos_to = max(start, split.out_of_sample_from), end
    has_is, has_oos = is_from <= is_to, oos_from <= oos_to
    is_rows = [r for d, r in rows if is_from <= d <= is_to]
    oos_rows = [r for d, r in rows if oos_from <= d <= oos_to]
    out: dict[str, Any] = {}
    is_m = metrics_of(is_rows)
    oos_m = metrics_of(oos_rows)
    if has_is:
        out["in_sample"] = {"period": {"start": is_from.isoformat(), "end": is_to.isoformat()}, "metrics": is_m}
    if has_oos:
        out["out_of_sample"] = {"period": {"start": oos_from.isoformat(), "end": oos_to.isoformat()}, "metrics": oos_m}
    is_label, oos_label = fmt.period(is_from, is_to), fmt.period(oos_from, oos_to)

    if not (has_is and has_oos):
        status, text = "NOT_APPLICABLE", TEXT_A
    elif len(is_rows) < MIN_TRADES or len(oos_rows) < MIN_TRADES:
        status = "TOO_FEW_TRADES"
        text = TEXT_B.format(n_is=len(is_rows), n_oos=len(oos_rows), is_label=is_label, oos_label=oos_label)
    elif (is_m["expectancy"] or 0) <= 0:
        status, text = "NOT_APPLICABLE", TEXT_C
    else:
        is_exp, oos_exp = float(is_m["expectancy"]), float(oos_m["expectancy"] or 0)
        values = {
            "is_exp": fmt.rupees(is_exp, 2),
            "oos_exp": fmt.rupees(oos_exp, 2),
            "is_label": is_label,
            "oos_label": oos_label,
        }
        if oos_exp < 0.5 * is_exp:
            status, text = "POSSIBLY_OVERFIT", TEXT_D.format(**values)
        else:
            status, text = "OK", TEXT_E.format(**values)
    out["status"] = status
    out["status_text"] = text
    return {"status": out.pop("status"), "status_text": out.pop("status_text"), **out}

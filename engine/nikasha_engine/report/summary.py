"""Plain-English summary from fixed templates (REQ-RPT-10, 14; feature 02 design §2.7).

Risk first, then the result, when it worked, overfitting and sensitivity. Every sentence is
worded as a past simulated result; templates are scanned against contracts/banned-phrases.txt.
"""

from __future__ import annotations

from typing import Any

from nikasha_engine.report import fmt

MIN_GROUP_TRADES = 10  # decision D6

T_RISK = (
    "Over {period_text}, this strategy took {trades}. Its largest fall from a peak was {max_drawdown}, its longest "
    "run of losing trades was {streak}, and {largest_loss_clause}."
)
T_LARGEST_LOSS = "its single biggest loss was {largest_loss}"
T_NO_LOSS = "it had no losing trades"
T_RESULT = "In total it would have {made_lost} {abs_net} after {costs} in costs{capital_clause}."
T_CAPITAL = ", a {return_pct} return on the {capital} capital you entered"
T_WIN_RATE = "{win_rate} of trades made money"
T_AVG_WIN = "the average winning trade made {avg_win}"
T_AVG_LOSS = "the average losing trade lost {abs_avg_loss}"
T_ALL_FLAT = "Every trade ended with no gain or loss after costs."
T_CAPITAL_EXCEEDED = "Its largest fall was bigger than the capital you entered."
T_WORKED = (
    "It did best {best_phrase} (on average {best_exp} per trade over {best_n}) and worst {worst_phrase} "
    "({worst_exp} over {worst_n})."
)
T_SENSITIVITY = (
    "If volatility had been {s} points lower, the result would have been {net_minus}; {s} points higher, {net_plus}."
)
T_FRAGILE = "The result depends heavily on the volatility assumption."
T_NO_TRADES = "This strategy took no trades in {period_text}."
T_NO_SIGNALS = "Its entry conditions were never all true at the same time."
T_ALL_SKIPPED = "It had {n}, but none could be taken. The most common reason: {reason_text} ({count})."

TEMPLATES = [v for k, v in dict(globals()).items() if k.startswith("T_") and isinstance(v, str)]

REGIME_PHRASES = {"TRENDING": "on trending days", "MIXED": "on mixed days", "SIDEWAYS": "on sideways days"}
SIDE_PHRASES = {"CE": "on call trades", "PE": "on put trades", "MULTI": "on multi-leg trades"}


def band_phrase(label: str, vol_name: str) -> str:
    rest = label[len(vol_name) + 1 :] if label.startswith(vol_name + " ") else label
    return f"when {vol_name} was {rest}"


def summarise(
    *,
    period_text: str,
    m: dict[str, Any],
    capital: float | None,
    breakdowns: dict[str, list[dict[str, Any]]],
    overfit_text: str,
    shift: float,
    net_minus: float,
    net_plus: float,
    signals_total: int,
    skipped: list[dict[str, Any]],
    vol_name: str,
) -> list[str]:
    if m["trades"] == 0:
        lines = [T_NO_TRADES.format(period_text=period_text)]
        if signals_total == 0 or not skipped:
            lines[0] += " " + T_NO_SIGNALS
        else:
            top = max(skipped, key=lambda s: s["count"])
            lines[0] += " " + T_ALL_SKIPPED.format(
                n=fmt.count(signals_total, "signal"),
                reason_text=top["reason_text"],
                count=fmt.count(top["count"], "time"),
            )
        return lines

    paras: list[str] = []
    largest = (
        T_LARGEST_LOSS.format(largest_loss=fmt.rupees(m["largest_loss"]))
        if m["largest_loss"] is not None
        else T_NO_LOSS
    )
    paras.append(
        T_RISK.format(
            period_text=period_text,
            trades=fmt.count(m["trades"], "trade"),
            max_drawdown=fmt.rupees(m["max_drawdown"]),
            streak=fmt.count(m["worst_losing_streak"], "trade"),
            largest_loss_clause=largest,
        )
    )

    net = float(m["net_pnl"])
    cap_clause = ""
    if capital:
        cap_clause = T_CAPITAL.format(return_pct=fmt.pct(m["return_pct"] or 0, 2), capital=fmt.rupees(capital))
    result = T_RESULT.format(
        made_lost="lost" if net < 0 else "made",
        abs_net=fmt.rupees(net, signed=False),
        costs=fmt.rupees(m["total_costs"]),
        capital_clause=cap_clause,
    )
    if m["wins"] == 0 and m["losses"] == 0:
        result += " " + T_ALL_FLAT
    else:
        parts = [T_WIN_RATE.format(win_rate=fmt.pct(m["win_rate_pct"] or 0))]
        if m["avg_win"] is not None:
            parts.append(T_AVG_WIN.format(avg_win=fmt.rupees(m["avg_win"])))
        if m["avg_loss"] is not None:
            parts.append(T_AVG_LOSS.format(abs_avg_loss=fmt.rupees(m["avg_loss"], signed=False)))
        sentence = parts[0] + ("; " + " and ".join(parts[1:]) if len(parts) > 1 else "") + "."
        result += " " + sentence[0].upper() + sentence[1:]
    if capital and m["max_drawdown"] > capital:
        result += " " + T_CAPITAL_EXCEEDED
    paras.append(result)

    groups: list[tuple[str, dict[str, Any]]] = []
    for row in breakdowns["by_vol_band"]:
        groups.append((band_phrase(row["label"], vol_name), row))
    for row in breakdowns["by_regime"]:
        if row["key"] in REGIME_PHRASES:
            groups.append((REGIME_PHRASES[row["key"]], row))
    for row in breakdowns["by_side"]:
        groups.append((SIDE_PHRASES[row["key"]], row))
    eligible = [(p, r) for p, r in groups if r["trades"] >= MIN_GROUP_TRADES and r["expectancy"] is not None]
    if eligible:
        best = max(eligible, key=lambda g: g[1]["expectancy"])
        worst = min(eligible, key=lambda g: g[1]["expectancy"])
        if best[1]["expectancy"] > 0 and worst[1]["expectancy"] < 0:
            paras.append(
                T_WORKED.format(
                    best_phrase=best[0],
                    best_exp=fmt.rupees(best[1]["expectancy"]),
                    best_n=fmt.count(best[1]["trades"], "trade"),
                    worst_phrase=worst[0],
                    worst_exp=fmt.rupees(worst[1]["expectancy"]),
                    worst_n=fmt.count(worst[1]["trades"], "trade"),
                )
            )

    paras.append(overfit_text)

    sens = T_SENSITIVITY.format(s=fmt.points(shift), net_minus=fmt.rupees(net_minus), net_plus=fmt.rupees(net_plus))
    signs = {(x > 0) - (x < 0) for x in (net_minus, net, net_plus)}
    if len(signs) > 1:
        sens += " " + T_FRAGILE
    paras.append(sens)
    return paras

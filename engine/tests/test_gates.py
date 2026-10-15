"""REQ-ENG-19…22, 42, 46, 47 (AC-ENG-08, 21, 22, 26, 27): every skip reason, and first-reason order."""

from __future__ import annotations

from datetime import date
from typing import Any

from conftest import run, settings, single_leg, synth, t, weekdays

JUNE = weekdays(date(2024, 6, 3), 5)  # Mon 3 … Fri 7 June 2024; weekly expiry Thu 6 June


def stepped(levels: list[tuple[int, str, str, float]], base: float = 24500.0):
    """Spot = `base`, except (day, from, to) ranges set to a level (to exclusive)."""

    def f(d: int, tod: int):
        for day, a, b, lvl in levels:
            if day == d and t(a) <= tod < t(b):
                return (lvl, lvl, lvl, lvl)
        return (base, base, base, base)

    return f


ABOVE = {"type": "compare", "left": {"price": "close"}, "op": "gt", "right": {"const": 24550}}


def cond_strategy(**over: Any) -> dict[str, Any]:
    s = single_leg(entry={"ce": ABOVE})
    s.update(over)
    return s


def test_conflicting_signals():
    """AC-ENG-27: option type 'both' with CE and PE true on one candle → neither entered."""
    md = synth(_nifty(), JUNE[:1], spot=stepped([(0, "10:00", "10:15", 24600)]))
    s = cond_strategy(
        legs=[
            {
                "action": "BUY",
                "option_type": "SIGNAL",
                "expiry": "CURRENT_WEEKLY",
                "strike": {"method": "MONEYNESS", "moneyness": "ATM", "distance_pts": 0},
            }
        ],
        entry={"ce": ABOVE, "pe": ABOVE},
    )
    res = run(md, s, settings("2024-06-03", "2024-06-03"))
    assert res.trades == [] and res.skipped == {"CONFLICTING_SIGNALS": 1}


def test_position_open_and_outside_window_ac_eng_08():
    """AC-ENG-08: Simple Trend Follower shape — a signal while a trade is open → POSITION_OPEN;
    a signal whose fill is after 14:30 → OUTSIDE_ENTRY_WINDOW."""
    md = synth(_nifty(), JUNE[:1], spot=stepped([(0, "10:00", "11:15", 24600), (0, "14:45", "15:00", 24600)]))
    s = cond_strategy(advanced={"entry_windows": [{"from": "09:30", "to": "14:30"}]})
    s["exit"] = {"stop_loss": {"type": "PCT_PREMIUM", "value": 90}}
    res = run(md, s, settings("2024-06-03", "2024-06-03"))
    assert len(res.trades) == 1
    assert res.skipped == {"POSITION_OPEN": 4, "OUTSIDE_ENTRY_WINDOW": 1}


def test_in_no_entry_window():
    md = synth(_nifty(), JUNE[:1], spot=stepped([(0, "11:00", "11:15", 24600)]))
    s = cond_strategy(advanced={"no_entry_windows": [{"from": "11:00", "to": "13:30"}]})
    res = run(md, s, settings("2024-06-03", "2024-06-03"))
    assert res.skipped == {"IN_NO_ENTRY_WINDOW": 1}


def test_after_expiry_cutoff():
    md = synth(_nifty(), JUNE, spot=stepped([(3, "12:15", "12:30", 24600)]))  # Thu 6 June = expiry
    s = cond_strategy(advanced={"expiry_day_cutoff": "12:00"})
    res = run(md, s, settings("2024-06-03", "2024-06-07"))
    assert res.skipped == {"AFTER_EXPIRY_CUTOFF": 1}


def _two_signals(stop_pct: float = 30.0, loss: bool = True):
    # Two separate signals on day 0: 10:00 and 12:00 candles. After each entry the premium
    # falls 40 points (a 30% stop is hit) and recovers before the next signal.
    # Between signals the spot sits at 24,540: premium 40 for the 24,600 strike (a 60% fall).
    lv = [(0, "10:00", "10:20", 24600), (0, "12:00", "12:20", 24600), (0, "13:30", "13:45", 24600)]
    return synth(_nifty(), JUNE[:1], spot=stepped(lv, base=24540))


def test_max_trades():
    s = cond_strategy(advanced={"daily": {"max_trades": 1}})
    res = run(_two_signals(), s, settings("2024-06-03", "2024-06-03"))
    assert len(res.trades) == 1 and res.skipped == {"MAX_TRADES": 2}


def test_sl_hits_limit_counts_stop_loss_exits_only():
    s = cond_strategy(advanced={"daily": {"stop_after_sl_hits": 1}})
    res = run(_two_signals(), s, settings("2024-06-03", "2024-06-03"))
    assert [tr.exit_reason for tr in res.trades] == ["STOP_LOSS"]
    assert res.skipped == {"SL_HITS_LIMIT": 2}


def test_trail_exits_are_not_sl_hits():
    """Decision D5: a trailed-stop exit doesn't count towards stop_after_sl_hits."""
    # Entry 100 (strike 24,600), stop 70% → level 30, 1R = 70 → trail triggers at premium 170.
    lv = [
        (0, "10:00", "10:20", 24600),
        (0, "10:20", "10:30", 24700),
        (0, "10:30", "11:00", 24590),
        (0, "12:00", "12:20", 24600),
    ]
    md = synth(_nifty(), JUNE[:1], spot=stepped(lv, base=24540))
    s = cond_strategy(advanced={"trail_to_cost_at_r": 1, "daily": {"stop_after_sl_hits": 1}})
    s["exit"] = {"stop_loss": {"type": "PCT_PREMIUM", "value": 70}}
    res = run(md, s, settings("2024-06-03", "2024-06-03"))
    assert [tr.exit_reason for tr in res.trades] == ["TRAIL_TO_COST", "SQUARE_OFF"]


def test_max_daily_loss_blocks_but_never_force_closes():
    s = cond_strategy(advanced={"daily": {"max_daily_loss_rupees": 100}})
    res = run(_two_signals(), s, settings("2024-06-03", "2024-06-03"))
    assert len(res.trades) == 1 and res.trades[0].exit_reason == "STOP_LOSS"
    assert res.skipped == {"MAX_DAILY_LOSS": 2}
    # An open losing position is not closed for the daily-loss reason: it runs to its own exit.
    s2 = cond_strategy(advanced={"daily": {"max_daily_loss_rupees": 1}})
    s2["exit"] = {"stop_loss": {"type": "PCT_PREMIUM", "value": 90}}
    res2 = run(_two_signals(), s2, settings("2024-06-03", "2024-06-03"))
    assert res2.trades[0].exit_reason == "SQUARE_OFF"


def test_after_squareoff():
    md = synth(_nifty(), JUNE[:2], spot=stepped([(0, "15:00", "15:15", 24600)]))
    res = run(md, cond_strategy(), settings("2024-06-03", "2024-06-04"))
    assert res.skipped == {"AFTER_SQUAREOFF": 1}  # fill at 15:15 is not before the square-off


def test_next_day_fill_positional_last_candle():
    """AC-ENG-26: a positional signal on the 15:15–15:29 candle is not filled next morning."""
    md = synth(_nifty(), JUNE[:2], spot=stepped([(0, "15:15", "15:30", 24600)]))
    s = cond_strategy(holding="POSITIONAL")
    s["exit"]["hold_to_expiry"] = True
    res = run(md, s, settings("2024-06-03", "2024-06-03"))
    assert res.trades == [] and res.skipped == {"NEXT_DAY_FILL": 1}


def test_no_contract_before_weekly_launch():
    days = weekdays(date(2019, 2, 4), 4)  # 4–7 Feb 2019, before weekly options
    md = synth(_nifty(), days, spot=stepped([(0, "10:00", "10:15", 24600)]))
    res = run(md, cond_strategy(), settings("2019-02-04", "2019-02-07"))
    assert res.skipped == {"NO_CONTRACT": 1}


def test_expiry_after_data_end_ac_eng_22():
    """AC-ENG-22: positional weekly signal on 2026-05-13; expiry 2026-05-19 is after the data."""
    days = weekdays(date(2026, 5, 11), 4)  # 11–14 May 2026 (data ends Thu 14th)
    md = synth(_nifty(), days, spot=stepped([(2, "10:00", "10:15", 24600)]))
    s = cond_strategy(holding="POSITIONAL")
    s["exit"]["hold_to_expiry"] = True
    res = run(md, s, settings("2026-05-11", "2026-05-14"))
    assert res.trades == [] and res.skipped == {"EXPIRY_AFTER_DATA_END": 1}


def test_unpriceable_fill_minute():
    md = synth(
        _nifty(),
        JUNE[:1],
        spot=stepped([(0, "10:00", "10:15", 24600)]),
        vix=lambda d, tod: None if tod == t("10:15") else 15.0,
    )
    res = run(md, cond_strategy(), settings("2024-06-03", "2024-06-03"))
    assert res.skipped == {"UNPRICEABLE": 1}


def test_exit_levels_unavailable_trigger_candle_above_entry():
    """Decision D3: trigger-candle stop on the wrong side of the entry → skipped."""
    md = synth(_nifty(), JUNE[:1], spot=stepped([(0, "10:00", "10:15", 24600), (0, "10:15", "10:16", 24560)]))
    s = cond_strategy()
    s["exit"] = {"stop_loss": {"type": "TRIGGER_CANDLE"}, "target": {"type": "RR", "value": 1.5}}
    res = run(md, s, settings("2024-06-03", "2024-06-03"))
    assert res.trades == [] and res.skipped == {"EXIT_LEVELS_UNAVAILABLE": 1}


def test_first_failing_reason_is_counted():
    """Outside the entry window AND after the square-off → counted once, as OUTSIDE_ENTRY_WINDOW."""
    md = synth(_nifty(), JUNE[:2], spot=stepped([(0, "15:00", "15:15", 24600)]))
    s = cond_strategy(advanced={"entry_windows": [{"from": "09:30", "to": "14:30"}]})
    res = run(md, s, settings("2024-06-03", "2024-06-04"))
    assert res.skipped == {"OUTSIDE_ENTRY_WINDOW": 1}


def test_period_limits_ac_eng_21():
    """AC-ENG-21: a positional trade entered on the period's last day runs past the period end;
    a signal the day after the period end is not taken."""
    md = synth(_nifty(), JUNE, spot=stepped([(1, "10:00", "10:20", 24600), (2, "10:00", "10:20", 24600)], base=24540))
    s = cond_strategy(holding="POSITIONAL")
    s["exit"] = {"stop_loss": {"type": "PCT_PREMIUM", "value": 90}, "hold_to_expiry": True}
    res = run(md, s, settings("2024-06-03", "2024-06-04"))
    assert len(res.trades) == 1
    tr = res.trades[0]
    assert tr.entry_date == date(2024, 6, 4) and tr.exit_reason == "EXPIRY_SETTLEMENT"
    assert tr.exit_minute // 1440 > tr.entry_minute // 1440


def test_skip_reasons_are_the_contract_enum():
    import yaml

    from conftest import CONTRACTS
    from nikasha_engine.backtest.signals import GATE_ORDER

    api = yaml.safe_load((CONTRACTS / "api.openapi.yaml").read_text())
    enum = api["components"]["schemas"]["Report"]["properties"]["skipped"]["properties"]["signals"]["items"][
        "properties"
    ]["reason"]["enum"]
    assert list(GATE_ORDER) == enum


def _nifty():
    from conftest import nifty_profile
    from nikasha_engine.instruments.registry import build_instrument

    return build_instrument(nifty_profile())

"""Feature 02 engine side (REQ-RPT-01…14; AC-RPT-01…10) and T-PRV-11 (banned phrases)."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import date

import pytest

from conftest import CONTRACTS, REPO, default_costs, load_json, settings, single_leg, strategy, synth, weekdays
from contract_helpers import assert_valid
from nikasha_engine.backtest.runner import run_all
from nikasha_engine.instruments.registry import PeriodConfig
from nikasha_engine.report import disclosures, fmt, summary
from nikasha_engine.report.breakdowns import GroupTrade, breakdowns, vol_band_index, vol_band_labels
from nikasha_engine.report.build import build_report
from nikasha_engine.report.metrics import TradeRow, equity_curve, metrics
from nikasha_engine.report.overfit import overfit
from nikasha_engine.report.regimes import classify, day_regimes

REPORTS = CONTRACTS / "fixtures" / "reports"


def rows(nets):
    return [TradeRow(n, n, 0.0, 0.0, i) for i, n in enumerate(nets)]


def test_metrics_ac_rpt_02():
    m = metrics(rows([100, -50, 0, -30, 20]), None)
    assert (m["trades"], m["wins"], m["losses"], m["win_rate_pct"]) == (5, 2, 2, 40.0)
    assert (m["expectancy"], m["avg_win"], m["avg_loss"], m["worst_losing_streak"]) == (8, 60, -40, 1)
    curve, max_dd, _ = equity_curve(rows([100, -50, 0, -30, 20]), None)
    assert [e for _, e, _ in curve] == [100, 50, 50, 20, 40] and max_dd == 80 and m["max_drawdown"] == 80
    assert m["return_pct"] is None and m["max_drawdown_pct"] is None


def test_capital_percentages_ac_rpt_03():
    m = metrics(rows([100, -50, 0, -30, 20]), 100000.0)
    assert m["return_pct"] == 0.04
    assert m["max_drawdown_pct"] == round(80 / 100100 * 100, 2)


def test_break_even_trades_and_streaks():
    m = metrics(rows([-1, -1, 0, -1, -1, -1]), None)
    assert m["worst_losing_streak"] == 3 and m["losses"] == 5 and m["wins"] == 0
    flat = metrics(rows([0, 0]), None)
    assert flat["win_rate_pct"] == 0 and flat["losses"] == 0 and flat["worst_losing_streak"] == 0
    assert metrics([], None)["win_rate_pct"] is None


def test_breakdowns_ac_rpt_04():
    labels = vol_band_labels((12, 18, 25), "India VIX")
    assert labels == ["India VIX below 12", "India VIX 12–18", "India VIX 18–25", "India VIX 25 and above"]
    assert [vol_band_index(v, (12, 18, 25)) for v in (11.99, 12, 17.99, 18, 25, 40)] == [0, 1, 1, 2, 3, 3]
    trades = [
        GroupTrade(date(2024, 3, 4), 100, 1, "TRENDING", False, "CE"),  # Monday
        GroupTrade(date(2024, 3, 7), -40, 3, "SIDEWAYS", True, "PE"),  # Thursday, expiry
        GroupTrade(date(2023, 12, 29), 10, 0, "UNKNOWN", False, "CE"),  # Friday
    ]
    bd = breakdowns(trades, labels)
    assert [r["label"] for r in bd["by_year"]] == ["2023", "2024"]
    assert [r["label"] for r in bd["by_month"]] == ["Dec 2023", "Mar 2024"]
    assert [r["label"] for r in bd["by_vol_band"]] == [
        "India VIX below 12",
        "India VIX 12–18",
        "India VIX 25 and above",
    ]
    assert [r["label"] for r in bd["by_regime"]] == ["Trending days", "Sideways days", "Not enough history"]
    assert [r["label"] for r in bd["by_weekday"]] == ["Monday", "Thursday", "Friday"]
    assert [(r["label"], r["trades"]) for r in bd["by_expiry_day"]] == [("Expiry day", 1), ("Other days", 2)]
    assert [r["key"] for r in bd["by_side"]] == ["CE", "PE"]
    ce = bd["by_side"][0]
    assert (ce["trades"], ce["wins"], ce["win_rate_pct"], ce["net_pnl"], ce["expectancy"]) == (2, 2, 100, 110, 55)


def test_regime_boundaries():
    assert [classify(v, 25, 20) for v in (25, 24.99, 20, 19.99, float("nan"))] == [
        "TRENDING",
        "MIXED",
        "MIXED",
        "SIDEWAYS",
        "UNKNOWN",
    ]


def test_regime_uses_previous_day(nifty):
    days = weekdays(date(2024, 1, 1), 60)
    md = synth(
        nifty,
        days,
        spot=lambda d, tod: (
            20000 + d * 100 + (tod % 7),
            20000 + d * 100 + 10,
            20000 + d * 100 - 10,
            20000 + d * 100 + (tod % 7),
        ),
    )
    reg = day_regimes(md)
    assert reg[:28] == ["UNKNOWN"] * 28  # ADX(14) is valid from day index 27; day 28 uses day 27's value
    assert reg[28] == "TRENDING" and reg[-1] == "TRENDING"


def _split():
    return PeriodConfig(date(2019, 2, 11), date(2019, 2, 11), date(2023, 12, 31), date(2024, 1, 1))


def _of(n_is, exp_is, n_oos, exp_oos, start=date(2019, 2, 11), end=date(2026, 5, 14)):
    rs = [(date(2020, 1, 1), TradeRow(exp_is, 0, 0, 0, i)) for i in range(n_is)]
    rs += [(date(2025, 1, 1), TradeRow(exp_oos, 0, 0, 0, 1000 + i)) for i in range(n_oos)]
    return overfit(rs, start, end, _split(), lambda r: metrics(r, None))


def test_overfit_statuses_ac_rpt_05():
    assert _of(40, 100, 35, 40)["status"] == "POSSIBLY_OVERFIT"
    assert _of(40, 100, 35, 60)["status"] == "OK"
    assert _of(40, 100, 20, 60)["status"] == "TOO_FEW_TRADES"
    last_year = _of(0, 0, 35, 60, start=date(2025, 5, 15))
    assert last_year["status"] == "NOT_APPLICABLE" and "in_sample" not in last_year and "out_of_sample" in last_year
    lost = _of(40, -10, 35, 60)
    assert lost["status"] == "NOT_APPLICABLE" and "lost money in the earlier period" in lost["status_text"]
    assert "in_sample" in lost and "out_of_sample" in lost  # parts shown whatever the status
    assert _of(40, 100, 35, -5)["status"] == "POSSIBLY_OVERFIT"  # opposite sign


@pytest.fixture(scope="module")
def stf_2023(real_md, nifty):
    s = strategy("simple-trend-follower")
    sett = settings("2023-01-01", "2023-12-31", default_costs(nifty))
    runs = run_all(real_md, s, sett)
    return build_report(s, sett, *runs, real_md, "test")


@pytest.mark.realdata
def test_period_filter_ac_rpt_01(stf_2023):
    assert stf_2023["period"]["start"] == "2023-01-01" and stf_2023["period"]["end"] == "2023-12-31"
    assert all(t["entry_time"].startswith("2023") for t in stf_2023["trades"])
    assert [r["label"] for r in stf_2023["breakdowns"]["by_year"]] == ["2023"]
    assert stf_2023["metrics"]["trades"] == len(stf_2023["trades"])
    assert_valid("Report", stf_2023)


@pytest.mark.realdata
def test_sensitivity_has_both_shifts_ac_rpt_06(stf_2023):
    assert [s["vol_shift_pts"] for s in stf_2023["sensitivity"]] == [-2, 2]


@pytest.mark.realdata
def test_gap_line_for_2019_07_02_ac_rpt_09(real_md, nifty):
    s = strategy("simple-trend-follower")
    sett = settings("2019-06-01", "2019-07-31", default_costs(nifty))
    rep = build_report(s, sett, *run_all(real_md, s, sett), real_md, "test")
    assert {"date": "2019-07-02", "reason_text": "no India VIX data"} in rep["skipped"]["data_days"]
    assert rep["skipped"]["data_minutes"]["missing_volatility"] >= 0


def test_settings_used_ac_rpt_08(nifty):
    md = synth(nifty, weekdays(date(2024, 6, 3), 2), vix=11.0)
    s = single_leg(
        position={"lots": 2, "lot_size": 65},
        advanced={
            "vix_sizing": {
                "measured_at": "DAY_OPEN",
                "bands": [{"vix_to": 12, "size_pct": 10}, {"vix_from": 12, "size_pct": 100}],
            }
        },
    )
    sett = settings("2024-06-03", "2024-06-03", default_costs(nifty))
    rep = build_report(s, sett, *run_all(md, s, sett), md, "test")
    su = rep["settings_used"]
    assert su["quantity_text"].startswith("2 lots × 65 = 130 quantity per trade")
    labels = [o["label"] for o in load_json(CONTRACTS / "advanced-options.json")["options"]]
    assert [a["label"] for a in su["advanced"]] == labels and len(labels) == 12
    used = {a["label"]: a["used"] for a in su["advanced"]}
    assert used["Volatility (VIX) sizing"] and not used["SL cap"]
    assert all(a["value_text"] == "Not used" for a in su["advanced"] if not a["used"])
    assert [r["trades_affected"] for r in su["no_effect_rules"]] == [1]
    assert_valid("Report", rep)


def test_every_skip_reason_has_text():
    from nikasha_engine.backtest.signals import GATE_ORDER

    assert set(disclosures.SKIP_TEXTS) == set(GATE_ORDER)


def test_no_trades_summary_ac_rpt_10():
    m = metrics([], None)
    text = summary.summarise(
        period_text="P",
        m=m,
        capital=None,
        breakdowns={},
        overfit_text="",
        shift=2,
        net_minus=0,
        net_plus=0,
        signals_total=0,
        skipped=[],
        vol_name="India VIX",
    )
    assert text == ["This strategy took no trades in P. Its entry conditions were never all true at the same time."]
    text = summary.summarise(
        period_text="P",
        m=m,
        capital=None,
        breakdowns={},
        overfit_text="",
        shift=2,
        net_minus=0,
        net_plus=0,
        signals_total=12,
        skipped=[
            {"reason_text": "A trade was already open", "count": 3},
            {"reason_text": "Outside your entry windows", "count": 9},
        ],
        vol_name="India VIX",
    )
    assert (
        "It had 12 signals, but none could be taken. The most common reason: Outside your entry windows (9 times)"
        in text[0]
    )


@pytest.mark.parametrize("name", ["simple-trend-follower-2023-2024", "capital-given", "zero-trades"])
def test_report_fixtures_validate(name):
    assert_valid("Report", load_json(REPORTS / f"{name}.json")["report"])


@pytest.mark.realdata
@pytest.mark.parametrize("name", ["simple-trend-follower-2023-2024", "capital-given", "zero-trades"])
def test_golden_reports_ac_rpt_07(real_md, name):
    """Golden comparison (T-RPT-10) and summary rules: drawdown before profit, ≥10-trade groups."""
    fixture = load_json(REPORTS / f"{name}.json")
    from nikasha_engine.core import api

    status, body = api.dispatch("POST", "/v1/evaluate", json.dumps(fixture["request"]).encode())
    assert status == 200
    body.update({"generated_at": "2026-10-15T12:00", "engine_version": "fixture"})
    assert body == fixture["report"]
    text = " ".join(body["summary"])
    if body["metrics"]["trades"]:
        assert text.index("largest fall") < text.index("In total")
        for sentence in [p for p in body["summary"] if p.startswith("It did best")]:
            counts = [int(n.replace(",", "")) for n in re.findall(r"over ([\d,]+) trades", sentence)]
            assert len(counts) == 2 and min(counts) >= 10


def banned() -> list[str]:
    lines = (CONTRACTS / "banned-phrases.txt").read_text().splitlines()
    return [x.strip().lower() for x in lines if x.strip() and not x.startswith("#")]


def test_no_banned_phrases_in_templates_and_reports():
    """T-PRV-11 (summary part), AC-PRV-18."""
    texts = list(summary.TEMPLATES) + list(disclosures.SKIP_TEXTS.values()) + list(disclosures.EXIT_TEXTS.values())
    from nikasha_engine.report import overfit as of

    texts += [of.TEXT_A, of.TEXT_B, of.TEXT_C, of.TEXT_D, of.TEXT_E]
    for path in REPORTS.glob("*.json"):
        rep = load_json(path)["report"]
        texts += rep["summary"] + rep["simulation_notes"] + list(rep["disclosures"].values())
    blob = "\n".join(texts).lower()
    for phrase in banned():
        assert phrase not in blob, phrase


def test_formatter():
    assert fmt.rupees(123456.5, 2) == "₹1,23,456.50"
    assert fmt.rupees(-4250) == "−₹4,250"
    assert fmt.rupees(-0.4) == "₹0"
    assert fmt.pct(54.25) == "54.3%"
    assert fmt.day(date(2026, 5, 14)) == "14 May 2026"
    assert fmt.period(date(2015, 1, 9), date(2026, 5, 14)) == "9 Jan 2015 – 14 May 2026"
    assert fmt.points(1.5) == "1.5" and fmt.points(30) == "30" and fmt.points(0.25) == "0.25"
    assert fmt.number(10000000) == "1,00,00,000"


def test_report_fixtures_current():
    """The shared report fixtures are regenerated by a script; this fails if they drift."""
    out = subprocess.run(
        [sys.executable, str(REPO / "engine" / "scripts" / "make_report_fixtures.py"), "--check"],
        capture_output=True,
        text=True,
        cwd=REPO / "engine",
    )
    if "Parquet" in out.stderr or "No such file" in out.stderr:
        pytest.skip("real data not built")
    assert out.returncode == 0, out.stdout[-500:]

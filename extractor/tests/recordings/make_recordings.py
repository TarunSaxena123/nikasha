"""Writes the hand-written recordings (owner decision 2026-10-15, option b): what the model is
expected to return for each sample, per feature 04 design §2.5. Replace them with live recordings
using scripts/record_extraction.py (manual, uses the owner's key). Run: python tests/recordings/make_recordings.py
"""

from __future__ import annotations

import json
from pathlib import Path

from nikasha_extractor.prompt import PROMPT_VERSION
from nikasha_extractor.schema import ExtractionDraft

HERE = Path(__file__).parent
N = None


def op(kind, **kw):
    base = {"kind": kind, "ind": N, "output": N, "price": N, "vix": N, "const": N, "offset_pts": N, "offset_pct": N}
    base.update(kw)
    return base


def row(id_, side, kind, parent=N, **kw):
    base = {
        "id": id_,
        "parent_id": parent,
        "side": side,
        "kind": kind,
        "left": N,
        "op": N,
        "right": N,
        "direction": N,
        "ind": N,
        "to_or_is": N,
        "lookback": N,
    }
    base.update(kw)
    return base


def ind(id_, type_, **kw):
    base = {
        "id": id_,
        "type": type_,
        "period": N,
        "source": N,
        "multiplier": N,
        "fast": N,
        "slow": N,
        "signal": N,
        "stddev": N,
    }
    base.update(kw)
    return base


def item(id_, status, field, quote, understood, reason=N, targets=(), question=N):
    return {
        "id": id_,
        "status": status,
        "field": field,
        "quote": quote,
        "understood": understood,
        "reason": reason,
        "targets": list(targets),
        "question": question,
    }


def q(prompt, kind, options=(), unit=N, rec=N):
    return {
        "prompt": prompt,
        "kind": kind,
        "unit_label": unit,
        "options": [{"label": a, "value_text": b} for a, b in options],
        "recommended_option": rec,
    }


def basics(**kw):
    base = {
        k: N
        for k in (
            "action",
            "option_side",
            "moneyness",
            "distance_pts",
            "expiry",
            "timeframe_min",
            "holding",
            "lots",
            "lot_size",
            "fixed_entry_time",
        )
    }
    base.update(kw)
    return base


def exit_(**kw):
    base = {
        k: N
        for k in (
            "sl_type",
            "sl_value",
            "target_type",
            "target_value",
            "time_exit_at",
            "time_exit_on",
            "hold_to_expiry",
        )
    }
    base.update(kw)
    return base


def adv(**kw):
    base = {
        "sl_cap_pts": N,
        "trail_to_cost_at_r": N,
        "exit_after_candles": N,
        "vix_sizing": N,
        "entry_windows": [],
        "no_entry_windows": [],
        "expiry_day_cutoff": N,
        "daily_max_trades": N,
        "daily_stop_after_sl_hits": N,
        "daily_max_loss_rupees": N,
    }
    base.update(kw)
    return base


def side_rows(side, start, up):
    c = lambda n: f"c{start + n}"  # noqa: E731
    gt, lt = ("gt", "lt") if up else ("lt", "gt")
    ema = lambda i: op("indicator", ind=i, output="value")  # noqa: E731
    return [
        row(c(0), side, "state_or_turns", ind="st", to_or_is="up" if up else "down"),
        row(c(1), side, "compare", left=ema("ema9"), op=gt, right=ema("ema21")),
        row(c(2), side, "compare", left=op("price", price="close"), op=gt, right=ema("ema9")),
        row(c(3), side, "compare", left=op("price", price="close"), op=gt, right=ema("ema21")),
        row(c(4), side, "compare", left=ema("rsi14"), op=gt, right=op("const", const=55.0 if up else 45.0)),
        row(c(5), side, "any"),
        row(c(6), side, "all", parent=c(5)),
        row(c(7), side, "compare", parent=c(6), left=ema("adx14"), op="gt", right=op("const", const=20.0)),
        row(c(8), side, "slope", parent=c(6), left=ema("adx14"), direction="up"),
        row(c(9), side, "compare", parent=c(5), left=ema("adx14"), op="gt", right=op("const", const=30.0)),
    ]


ADVANCED = {
    "ignored_text_found": True,
    "basics": basics(action="BUY", option_side="BOTH_BY_SIGNAL", moneyness="ITM", distance_pts=100.0, timeframe_min=15),
    "indicators": [
        ind("st", "SUPERTREND", period=10, multiplier=2.0),
        ind("ema9", "EMA", period=9, source="close"),
        ind("ema21", "EMA", period=21, source="close"),
        ind("rsi14", "RSI", period=14),
        ind("adx14", "ADX", period=14),
    ],
    "conditions": side_rows("CE", 1, True) + side_rows("PE", 11, False),
    "exit": exit_(sl_type="TRIGGER_CANDLE", target_type="RR", target_value=1.5),
    "advanced": adv(
        trail_to_cost_at_r=1.0,
        exit_after_candles=4,
        vix_sizing={
            "measured_at": N,
            "bands": [
                {"vix_from": N, "vix_to": 12.0, "size_pct": 50.0},
                {"vix_from": 12.0, "vix_to": 18.0, "size_pct": 100.0},
                {"vix_from": 18.0, "vix_to": N, "size_pct": N},
            ],
        },
        no_entry_windows=[{"start": "11:00", "end": "13:30"}],
        daily_max_trades=2,
        daily_stop_after_sl_hits=2,
    ),
    "items": [
        item(
            "i1",
            "VAGUE",
            "expiry",
            "NIFTY 15-MIN WEEKLY OPTION BUYING",
            "The title says weekly, but which weekly or monthly contract isn't stated.",
            question=q(
                "Your title says weekly. Which expiry?",
                "CHOICE",
                [("Current weekly", "CURRENT_WEEKLY"), ("Next weekly", "NEXT_WEEKLY"), ("Monthly", "MONTHLY")],
            ),
        ),
        item(
            "i2",
            "VAGUE",
            "premarket_time",
            "Pre-Market Routine (09:00 AM) Check India VIX to determine risk allocation before market open",
            "India VIX is checked before the market opens; the data starts at 09:15.",
            question=q(
                "Use the 09:15 opening VIX? (the earliest available)",
                "CONFIRM",
                [("Yes, use the 09:15 opening VIX", "DAY_OPEN"), ("No, use India VIX at the time of entry", "ENTRY")],
                rec=0,
            ),
        ),
        item(
            "i3",
            "FOUND",
            "vix_sizing",
            "VIX < 12: High sideways risk. Cut normal position size by 50%.",
            "With India VIX below 12, trade 50% of the normal size.",
        ),
        item(
            "i4",
            "FOUND",
            "vix_sizing",
            "VIX 12–18: Ideal environment. Trade standard position size.",
            "With India VIX from 12 to 18, trade the normal size.",
        ),
        item(
            "i5",
            "VAGUE",
            "vix_band_size",
            "VIX > 18: High premium volatility. Reduce position size significantly.",
            "With India VIX above 18, the size is reduced, but by how much isn't stated.",
            targets=["vix_band:2"],
            question=q("With India VIX above 18, trade what % of your normal size?", "NUMBER", unit="%"),
        ),
        item("i6", "FOUND", "timeframe_min", "Timeframe: 15-Minute", "15-minute candles."),
        item(
            "i7",
            "FOUND",
            "indicator",
            "Supertrend: Period = 10, Multiplier = 2 EMA 1 (Fast): 9-period, Source = Close EMA 2 (Slow): 21-period, Source = Close RSI: 14-period ADX: 14-period",
            "Supertrend 10 × 2, EMA 9 and EMA 21 on the close, RSI 14 and ADX 14.",
        ),
        item(
            "i8",
            "VAGUE",
            "condition_kind",
            "Supertrend turns Green.",
            "Supertrend turning green (red for puts) is an entry condition.",
            targets=["cond:c1", "cond:c11"],
            question=q(
                "Enter only on the candle it turns green, or on any candle while it's green?",
                "CHOICE",
                [
                    ("Only on the candle where it turns green (red for puts)", "turns"),
                    ("On any candle while it is green (red for puts)", "state"),
                ],
            ),
        ),
        item(
            "i9",
            "FOUND",
            "condition",
            "9 EMA is completely above the 21 EMA.",
            "EMA 9 is above EMA 21 for calls (below for puts).",
        ),
        item(
            "i10",
            "VAGUE",
            "condition_offset",
            "The trigger candle closes decisively above both EMAs.",
            "The candle closes above both EMAs (below for puts) by an amount that isn't stated.",
            targets=["cond:c3", "cond:c4", "cond:c13", "cond:c14"],
            question=q(
                "How many points beyond both EMAs must the candle close? (0 = just beyond)", "NUMBER", unit="points"
            ),
        ),
        item(
            "i11",
            "FOUND",
            "condition",
            "RSI is strictly above 55.",
            "RSI 14 is above 55 for calls and below 45 for puts.",
        ),
        item(
            "i12",
            "FOUND",
            "condition",
            "ADX is above 20 (Must slope up if between 20–30; slope does not matter if > 30).",
            "ADX 14 is above 20 and rising, or above 30.",
        ),
        item(
            "i13",
            "VAGUE",
            "slope_lookback",
            "Must slope up if between 20–30",
            "ADX must be rising, but compared with how many candles back isn't stated.",
            targets=["cond:c9", "cond:c19"],
            question=q("'Rising' compared with how many candles back?", "NUMBER", unit="candles"),
        ),
        item(
            "i14",
            "FOUND",
            "moneyness",
            "Buy In-The-Money (ITM) contract exactly 100 points below Nifty Spot.",
            "Buy options 100 points in the money: a call on the call signal, a put on the put signal.",
        ),
        item(
            "i15",
            "FOUND",
            "stop_loss",
            "Stop-Loss (SL): Low of the trigger candle on the Option Premium Chart.",
            "The stop-loss is at the trigger candle's low on the option premium.",
        ),
        item(
            "i16",
            "VAGUE",
            "sl_cap_pts",
            "Capped at a maximum of 30–35 premium points.",
            "The stop is capped, but at 30 or 35 points isn't decided.",
            question=q("SL cap: 30 or 35 points?", "CHOICE", [("30 points", "30"), ("35 points", "35")]),
        ),
        item(
            "i17",
            "FOUND",
            "target",
            "Target: Strict 1:1.5 Risk-to-Reward Ratio",
            "The target is 1.5 times the stop distance.",
        ),
        item(
            "i18",
            "FOUND",
            "trail_to_cost_at_r",
            "Move SL to cost (break-even) once the premium gains a 1:1 risk-equivalent ratio.",
            "The stop moves to the entry price after a gain of 1 × the risk.",
        ),
        item(
            "i19",
            "FOUND",
            "exit_after_candles",
            "If neither SL nor Target is hit within 60 minutes (4 candles), exit at market price",
            "Exit after 4 candles if neither the stop nor the target is hit.",
        ),
        item(
            "i20",
            "FOUND",
            "no_entry_windows",
            "Do not open fresh positions between 11:00 AM and 01:30 PM",
            "No new entries from 11:00 to 13:30.",
        ),
        item(
            "i21",
            "VAGUE",
            "expiry_weekday_term",
            "Do not trade this strategy after 12:00 PM on Thursdays due to high Gamma risk.",
            "No trades after 12:00 on Thursdays; Thursday was the expiry day until August 2025.",
            question=q(
                "By 'Thursday', do you mean expiry day? (Thursday until Aug 2025, Tuesday since)",
                "CONFIRM",
                [("Yes, no new trades from 12:00 on expiry day", "12:00"), ("No, leave this rule out", "SKIP")],
                rec=0,
            ),
        ),
        item(
            "i22",
            "FOUND",
            "daily_limits",
            "Maximum of 2 trades per day. Shut down your trading terminal immediately if both hit your SL.",
            "At most 2 trades a day; stop for the day after 2 stop-losses.",
        ),
    ],
}

ONE_LINE = {
    "ignored_text_found": False,
    "basics": basics(action="BUY", option_side="CALL", moneyness="ATM", timeframe_min=5),
    "indicators": [ind("rsi14", "RSI", period=14)],
    "conditions": [
        row(
            "c1",
            "CE",
            "cross",
            left=op("indicator", ind="rsi14", output="value"),
            direction="above",
            right=op("const", const=60.0),
        )
    ],
    "exit": exit_(sl_type="PCT_PREMIUM", sl_value=30.0),
    "advanced": adv(),
    "items": [
        item("i1", "FOUND", "moneyness", "Buy ATM Nifty call", "Buy an at-the-money Nifty call."),
        item("i2", "FOUND", "condition", "when RSI 14 crosses above 60", "Enter when RSI 14 crosses above 60."),
        item("i3", "FOUND", "timeframe_min", "on 5-minute chart", "5-minute candles."),
        item("i4", "FOUND", "stop_loss", "stop-loss 30%", "The stop-loss is 30% of the option premium."),
    ],
}

NO_RULES = {
    "ignored_text_found": True,
    "basics": basics(),
    "indicators": [],
    "conditions": [],
    "exit": exit_(),
    "advanced": adv(),
    "items": [],
}

VWAP = {
    "ignored_text_found": False,
    "basics": basics(action="BUY", option_side="CALL", moneyness="ATM", timeframe_min=5),
    "indicators": [],
    "conditions": [],
    "exit": exit_(sl_type="POINTS", sl_value=20.0),
    "advanced": adv(),
    "items": [
        item("i1", "FOUND", "moneyness", "Buy ATM call", "Buy an at-the-money call."),
        item(
            "i2",
            "UNSUPPORTED",
            "condition",
            "when price crosses above VWAP",
            "Price crossing above VWAP.",
            reason="VWAP isn't available for Nifty 50. VWAP is calculated from traded volume, and Nifty 50 is an index, not a traded stock, so its chart has no volume and no VWAP.",
        ),
        item("i3", "FOUND", "timeframe_min", "on the 5-minute chart", "5-minute candles."),
        item("i4", "FOUND", "stop_loss", "stop-loss 20 points", "The stop-loss is 20 premium points."),
    ],
}

CASES = {
    "advanced-sample": ("Reduce position size significantly", ADVANCED),
    "one-line-sample": ("RSI 14 crosses above 60", ONE_LINE),
    "vwap": ("VWAP", VWAP),
    "no-rules": ("", NO_RULES),
}

if __name__ == "__main__":
    for name, (match, output) in CASES.items():
        ExtractionDraft.model_validate(output)
        path = HERE / f"{name}.{PROMPT_VERSION}.json"
        if path.exists() and json.loads(path.read_text())["recorded"] == "live":
            print("kept live recording", name)  # live recordings come from scripts/record_extraction.py
            continue
        path.write_text(
            json.dumps(
                {"match": match, "recorded": "hand-written (not a live call)", "output": output},
                indent=1,
                ensure_ascii=False,
            )
            + "\n"
        )
        print("wrote", name)

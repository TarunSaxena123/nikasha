"""Synthetic minute data for the TESTIDX profile (tests only, T-DAT-09). Seeded, so deterministic."""

from __future__ import annotations

import random
from datetime import date, timedelta
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

SCHEMA = pa.schema([("datetime", pa.timestamp("us"))] + [(c, pa.float64()) for c in ("open", "high", "low", "close")])


def write(folder: Path, start: date = date(2020, 1, 1), n_days: int = 40, seed: int = 7) -> None:
    rnd = random.Random(seed)
    rows_s, rows_v = [], []
    price, vix = 40000.0, 18.0
    d = start
    days = 0
    while days < n_days:
        if d.weekday() < 5:
            days += 1
            for minute in range(10 * 60, 16 * 60):
                ts = f"{d.isoformat()} {minute // 60:02d}:{minute % 60:02d}:00"
                o = price
                c = max(1000.0, o + rnd.gauss(0, 15))
                h, lo = max(o, c) + abs(rnd.gauss(0, 5)), min(o, c) - abs(rnd.gauss(0, 5))
                rows_s.append((ts, round(o, 2), round(h, 2), round(lo, 2), round(c, 2)))
                vo = vix
                vix = min(40.0, max(10.0, vix + rnd.gauss(0, 0.05)))
                rows_v.append((ts, round(vo, 2), round(max(vo, vix), 2), round(min(vo, vix), 2), round(vix, 2)))
                price = c
        d += timedelta(days=1)
    folder.mkdir(parents=True, exist_ok=True)
    for name, rows in (("testidx_1min.parquet", rows_s), ("testvix_1min.parquet", rows_v)):
        import pandas as pd

        df = pd.DataFrame(rows, columns=["datetime", "open", "high", "low", "close"])
        df["datetime"] = pd.to_datetime(df["datetime"]).astype("datetime64[us]")
        pq.write_table(pa.Table.from_pandas(df, schema=SCHEMA, preserve_index=False), folder / name)

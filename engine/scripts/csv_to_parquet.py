"""Build-time conversion of data/*.csv to Parquet (REQ-DAT-05, feature 01 design §2.1).

Each `<name>_clean.csv` becomes `<name>.parquet` with `datetime` as a naive timestamp[us] and the
prices as float64. Row counts are printed so the build log shows what was converted.

Run: python scripts/csv_to_parquet.py [csv_dir] [out_dir]
     (defaults: ../data and build/data, relative to engine/)
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

ENGINE = Path(__file__).resolve().parents[1]
COLUMNS = ["datetime", "open", "high", "low", "close"]
SCHEMA = pa.schema([("datetime", pa.timestamp("us"))] + [(c, pa.float64()) for c in COLUMNS[1:]])


def output_name(csv_path: Path) -> str:
    stem = csv_path.stem
    if stem.endswith("_clean"):
        stem = stem[: -len("_clean")]
    return stem + ".parquet"


def convert(csv_path: Path, out_dir: Path) -> tuple[Path, int]:
    df = pd.read_csv(csv_path, dtype={c: "float64" for c in COLUMNS[1:]})
    df["datetime"] = pd.to_datetime(df["datetime"], format="%Y-%m-%d %H:%M:%S").astype("datetime64[us]")
    table = pa.Table.from_pandas(df[COLUMNS], schema=SCHEMA, preserve_index=False)
    out = out_dir / output_name(csv_path)
    pq.write_table(table, out, compression="zstd")
    return out, table.num_rows


def main(argv: list[str]) -> int:
    csv_dir = Path(argv[1]) if len(argv) > 1 else ENGINE.parent / "data"
    out_dir = Path(argv[2]) if len(argv) > 2 else ENGINE / "build" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(csv_dir.glob("*.csv"))
    if not files:
        print(f"no CSV files in {csv_dir}")
        return 1
    for f in files:
        out, rows = convert(f, out_dir)
        print(f"{f.name} -> {out.name}: {rows} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

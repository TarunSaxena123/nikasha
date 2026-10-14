# Clean 1-minute data: NIFTY 50 and INDIA VIX

Made from Tarun's Kaggle upload (`zip1.zip`: `NIFTY 50_minute.csv`, `INDIA VIX_minute.csv`). The original files are untouched.

| File | Rows | Trading days | Range |
|---|---|---|---|
| `nifty50_1min_clean.csv` | 1,047,566 | 2,794 | 2015-01-09 09:15 to 2026-05-14 15:29 |
| `indiavix_1min_clean.csv` | 1,047,192 | 2,793 | 2015-01-09 09:15 to 2026-05-14 15:29 |

Columns: `datetime, open, high, low, close`. Times are IST, and each row is labelled by the minute's start (09:15 … 15:29, 375 bars a full day). Prices have 2 decimals.

## What was cleaned

1. **Volume dropped.** It was 0 on every row in both files (indices have no volume).
2. **Timestamps fixed.** About 10,700 rows in each file, all between Jun and Nov 2015, were stamped a few seconds past the minute (e.g. 11:13:01). They were moved back to the whole minute. In 4 cases that made two rows for the same minute; the first was kept (the pairs were almost identical).
3. **Non-regular sessions removed** (15 days in each file). These are 10 Muhurat evening sessions, 2 short NSE mock/DR sessions on Saturdays (2024-03-02 and 2024-05-18), 2021-02-24 (the day NSE halted trading for a technical fault), 2025-10-21 (afternoon Muhurat session), and 2026-05-15, which the download cut off at 13:20.
4. **VIX high/low repaired.** In 2,547 VIX rows the high was below the open or close, or the low was above them (69 rows even had high below low). For those rows, high was set to the largest of open/high/low/close and low to the smallest. Open and close were not changed. The NIFTY file needed no repairs.
5. **Kept as they are:**
   - Full Saturday or Sunday sessions that ran normal hours: budget days 2015-02-28, 2020-02-01, 2025-02-01, 2026-02-01, and the special session on 2024-01-20.
   - The 13 Mar 2020 lower-circuit reopening jump (a real move).
   - Big first-minute VIX jumps, which are normal for VIX.

## Known gaps (not filled in)

- **NIFTY:** 184 minutes are missing across 28 days.
- **VIX:** 183 minutes are missing across 27 days.
- **VIX has no data at all for 2019-07-02**, while NIFTY does.
- **Matching the two files:** they share 1,047,188 minutes. NIFTY has 378 minutes that VIX doesn't (mostly 2019-07-02), and VIX has 4 that NIFTY doesn't.

Missing minutes were left missing on purpose rather than filled with copied prices.

`cleaning_report.json` has every count, and `clean.py` is the script that made these files.

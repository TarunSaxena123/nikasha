# Expiry calendar — derivation and spot-check record

Status: **Recorded 2026-10-14** · Implements `product.md` §7.4 · Requirement IDs assigned when `requirements.md` for this feature is written

This file records the expected Nifty 50 expiry calendar, derived from the rules in `product.md` §7.4 and the trading days in `data/nifty50_1min_clean.csv`, plus the evidence used to check it. The engine's calendar module must reproduce every date below; a test asserts this.

## Rules applied

1. Scheduled weekday: **Thursday** for scheduled dates up to 2025-08-31; **Tuesday** from 2025-09-01.
2. Weekly expiries exist from the launch of weekly options on 2019-02-11 (first expiry 2019-02-14). Before that, only monthly.
3. Monthly expiry = the last scheduled weekday of the month.
4. Trading days = days present in the Nifty data **plus** regular sessions removed during cleaning (2021-02-24 NSE halt day, 2026-05-15 cut-off day). Days whose only session was Muhurat or mock/DR are not trading days.
5. A scheduled date that is not a trading day moves to the previous trading day.

## Result (on the data 2015-01-09 → 2026-05-14)

| Measure | Value |
|---|---|
| Monthly expiries | 136 |
| Weekly + monthly expiries from 2019-02-14 | 379 |
| First weekly expiry | 2019-02-14 (Thu) |
| Last Thursday expiry | 2025-08-28 (Thu, monthly) |
| First Tuesday expiry | 2025-09-02 (Tue) |
| Monthly expiries Jul–Oct 2025 | 2025-07-31, 2025-08-28, 2025-09-30, 2025-10-28 |
| Effect of rule 4 on this data | None. 2021-02-24 (Wed) and 2026-05-15 (Fri) are not scheduled expiry days and the following Thursday (2021-02-25) traded normally. The rule stays because it is correct; this check confirms it changes nothing on the current data. |

### Holiday-shifted expiries (21)

W = weekly, M = monthly. Weekly shifts are listed only from 2019-02-14.

| Scheduled | Actual | Type | Evidence |
|---|---|---|---|
| 2017-01-26 Thu | 2017-01-25 Wed | M | Derived (Republic Day) |
| 2018-03-29 Thu | 2018-03-28 Wed | M | Derived |
| 2019-03-21 Thu | 2019-03-20 Wed | W | Derived (Holi) |
| 2019-08-15 Thu | 2019-08-14 Wed | W | Derived (Independence Day) |
| 2020-04-02 Thu | 2020-04-01 Wed | W | Derived |
| 2021-03-11 Thu | 2021-03-10 Wed | W | Derived |
| 2021-05-13 Thu | 2021-05-12 Wed | W | Derived |
| 2021-08-19 Thu | 2021-08-18 Wed | W | Derived |
| 2021-11-04 Thu | 2021-11-03 Wed | W | **Checked:** NSE holiday circular lists 2021-11-04 as the Diwali holiday (Muhurat evening session only) |
| 2022-04-14 Thu | 2022-04-13 Wed | W | Derived |
| 2023-01-26 Thu | 2023-01-25 Wed | M | Derived (Republic Day) |
| 2023-03-30 Thu | 2023-03-29 Wed | M | Derived |
| 2023-06-29 Thu | 2023-06-28 Wed | M | **Checked:** NSE F&O circular 095/2023 — Bakri Id holiday moved to 29 June; Nifty expiry on Wed 28 June |
| 2024-04-11 Thu | 2024-04-10 Wed | W | Derived |
| 2024-08-15 Thu | 2024-08-14 Wed | W | Derived (Independence Day) |
| 2025-04-10 Thu | 2025-04-09 Wed | W | Derived |
| 2025-05-01 Thu | 2025-04-30 Wed | W | Derived (Maharashtra Day) |
| 2025-10-21 Tue | 2025-10-20 Mon | W | **Checked:** 2025-10-21 was the Diwali Laxmi Pujan holiday (Muhurat session only; removed during cleaning) |
| 2026-03-03 Tue | 2026-03-02 Mon | W | **Checked:** NSE/BSE confirmed 2026-03-03 as the Holi holiday |
| 2026-03-31 Tue | 2026-03-30 Mon | M | **Checked:** 2026-03-31 was the Mahavir Jayanti holiday |
| 2026-04-14 Tue | 2026-04-13 Mon | W | Derived (Ambedkar Jayanti) |

"Checked" means an external source confirms the holiday (and, for June 2023, the expiry date itself). "Derived" means the date follows from the rules and the trading days in the data; the holiday is absent from the data, which is itself the evidence used.

### Expiry-weekday change, checked

| Check | Expected | Evidence |
|---|---|---|
| Weekly options launch | 2019-02-11; first expiry Thu 2019-02-14 | NSE press release / PTI report, 11 Feb 2019 |
| Planned Monday expiry (Apr 2025) | Not implemented | NSE deferred it on 27–28 Mar 2025 after the SEBI consultation paper |
| Switch to Tuesday | Contracts expiring on or after 2025-09-01 expire Tuesday (weekly) / last Tuesday (monthly); last Thursday expiry 2025-08-28 | SEBI circular (May 2025); NSE expiry-day revision effective 1 Sep 2025, reported consistently by several market sources. NSE circular text not retrieved at drafting time — re-confirm before release (`product.md` §17) |

## Sources

- NSE launches weekly options on Nifty 50 (PTI via Business Standard, 11 Feb 2019): https://www.business-standard.com/amp/article/pti-stories/nse-launches-trading-in-weekly-options-on-nifty-50-index-119021101158_1.html
- NSE defers Monday expiry (Business Standard, 28 Mar 2025): https://www.business-standard.com/markets/news/nse-defers-switching-to-monday-expiry-after-sebi-s-consultation-paper-125032800183_1.html
- SEBI on expiry days (Tuesday/Thursday): https://www.icicidirect.com/research/equity/finace/sebi-clears-expiry-day-clash-between-nse-and-bse
- NSE/BSE swap expiry days from 1 Sep 2025 (All India Radio News): https://www.newsonair.gov.in/nse-bse-swap-derivatives-expiry-days
- Bakri Id 2023 expiry change: https://www.businesstoday.in/amp/markets/market-commentary/story/nse-bse-reschedule-bakri-id-holiday-to-thursday-june-29-fo-expiry-on-wednesday-387201-2023-06-27
- NSE holiday circular 2021 (Diwali 4 Nov 2021): https://nsearchives.nseindia.com/content/circulars/COM46626.pdf
- Holi 2026 holiday (Business Today): https://www.businesstoday.in/amp/markets/stocks/story/stock-market-holi-2026-holiday-are-nse-bse-open-or-close-on-march-3-4-518910-2026-03-03

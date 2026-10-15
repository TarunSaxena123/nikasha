---
title: What is overfitting?
summary: Rules that fit past noise, how Nikasha splits tuning years from unseen years, and how to read its overfitting check.
minutes: 3
---
## Rules that fit noise

Past market data is a mix of real patterns and random noise. If you keep adjusting a strategy until it looks good on that data (a slightly different [[stop-loss]], a different [[rsi|RSI]] level, one more filter), you eventually find settings that fit the noise. The result looks excellent on the data used to tune it and disappoints on anything else. This is [[overfitting]].

Overfitting is easy to do without meaning to. Every time you change a rule because of how the last backtest looked, you use up some of the data's ability to tell you the truth.

## The tuning and unseen split

Nikasha checks for this by splitting the test into two parts (see [[in-sample-out-of-sample|in-sample and out-of-sample]]):

- **The tuning period (in-sample):** earlier years, the kind of history anyone designing a strategy today would have looked at. For weekly options this runs from February 2019 to the end of 2023; for monthly options, from the start of the data to the end of 2023.
- **The unseen period (out-of-sample):** from 1 January 2024 to the last date in the data.

The report shows the same figures for both parts side by side.

## What "possibly overfit" means

Nikasha compares the average result per trade ([[expectancy]]) in the two parts:

- If the unseen period's average is below half of the tuning period's, or has the opposite sign, the strategy is flagged **possibly overfit**.
- Otherwise it **held up on unseen data**.

Two situations give no verdict. If either part has fewer than thirty trades, there is too little evidence, and the report says so instead of showing a flag. If the strategy already lost money in the tuning period, there is no good result to test, and the report says that instead.

## How to read it

- A flag is a warning, not proof. Markets change, and an honest strategy can have a weaker recent period.
- Holding up is encouraging, not proof either. Two periods from the same market can still both mislead.
- Look at the breakdowns as well. A strategy whose profits came from one regime or one year is fragile even if the split looks fine.
- Be careful with what-if changes and suggestions. If you tune settings by looking at the whole period, including the unseen years, those years are no longer unseen. Nikasha's suggestions compare variants on both the whole period and the unseen years for this reason.

## A simple habit

Decide your rules first, test them once on the full period, and treat the unseen-period result as the more honest one. If you change rules after seeing results, keep in mind that each change makes the backtest a little more optimistic than reality.

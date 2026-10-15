---
title: Why most strategies fail
summary: Costs, overfitting, changing markets, too few trades and ignored risk — five common reasons a promising backtest disappoints.
minutes: 4
---
## Costs and slippage

Every order has charges: brokerage, [[stt|STT]] on sales, exchange fees, the SEBI fee, stamp duty and GST. On top of that comes [[slippage]], the gap between the price you expect and the price you get. Each is small, but a strategy that trades often pays them many times. A rule that looks profitable before costs can lose money after them.

Nikasha applies every charge to every simulated order and shows the total in the report, so you can see how much of the gross result the costs took away.

## Overfitting to the past

Given enough tries, almost any set of rules can be tuned to look good on past data. The rules end up describing that particular stretch of history, including its random noise, rather than a pattern that repeats. This is [[overfitting]].

The warning sign is a strategy whose results fade on data it wasn't tuned on. Nikasha's overfitting check splits the test into earlier years and recent unseen years and compares the average result per trade. A large drop is flagged as possibly overfit.

## The market changes

Markets move through [[regime|regimes]]: strong trends, quiet sideways stretches, calm and volatile periods. A rule that works in one can fail in another. Trend-following entries, for example, tend to give a string of small losses on sideways days.

The report breaks results down by trend regime and by [[india-vix|India VIX]] level, so you can see whether a strategy depended on one kind of market. A strategy that made all its money in one unusual year deserves a second look.

## Too few trades

A test with fifteen trades says very little. A few lucky results can make the [[win-rate|win rate]] and [[expectancy]] look much better or worse than they really are. The more trades, the more the averages mean.

Nikasha marks breakdown groups with fewer than ten trades as "few trades" and won't call them a best or worst case. The overfitting check needs at least thirty trades in each part before it gives a verdict.

## Ignoring risk

A high win rate can hide a dangerous strategy. Selling options, for example, often wins small amounts many times and then loses a large amount once. The average can look fine while a single bad day wipes out months of gains. That is why the report shows the [[drawdown|maximum drawdown]], the longest losing streak and the largest single loss before any profit figure.

## What this means for reading a backtest

None of these problems can be removed completely, and a good-looking backtest is not evidence that a strategy will work. It is more useful to ask questions of it:

- Do the results survive the costs?
- Did they hold up on the unseen recent years?
- Do they depend on one regime or one year?
- Are there enough trades to say anything?
- Could you have lived through the worst drawdown?

Nikasha's results are simulated on past data with modelled option prices. They describe what would have happened under those assumptions, not what will happen.

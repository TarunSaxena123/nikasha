---
title: Modelled vs real option prices
summary: Why Nikasha models option prices, Black-Scholes in one paragraph, India VIX as volatility, the limits, and the ±2 VIX check.
minutes: 3
---
## Why prices are modelled

Nikasha has minute-by-minute data for the Nifty 50 index and [[india-vix|India VIX]], but not for individual option contracts. Historical option prices for every strike and expiry are not available in the public data Nikasha uses. So every [[premium]] in a Nikasha report is calculated, not looked up. The report always says "Premiums modelled, not actual".

## Black-Scholes in one paragraph

The [[black-scholes|Black-Scholes]] formula gives a fair price for an option from five inputs: the index level, the [[strike]], the time left to [[expiry]], an interest rate and the volatility. Higher volatility or more time means a higher premium, because a big move becomes more likely. Nikasha calculates the price every minute a simulated position is open, rounds it to the exchange's price step, and uses the minute's high and low index levels to find the highest and lowest premium in that minute for stop-loss and target checks.

## India VIX as the volatility

The formula needs volatility, which can't be observed directly. Nikasha uses India VIX, NSE's index of expected 30-day Nifty volatility, as a stand-in for [[implied-volatility|implied volatility]]. When India VIX was high, modelled premiums are high; when it was low, they are low.

## The limits

Real option prices differ from the model in ways that matter.

- **Skew:** in real markets, options far from the money are usually priced at higher volatility than at-the-money options. The model uses one volatility for every strike, so far strikes are likely underpriced.
- **Expiry day:** India VIX describes the next 30 days. In the last hours before expiry, real premiums behave differently, so expiry-day results are the least reliable.
- **Supply and demand:** real prices react to order flow, news and events. A model can't.
- **Costs and fills:** Nikasha adds slippage and charges, but real fills in fast markets can be worse.

Results that depend on far strikes, expiry-day trades or very short holding times deserve the most caution.

## The ±2 VIX check

Because so much rests on the volatility input, every evaluation is run three times: as modelled, with India VIX two points lower, and two points higher. The report shows all three. If the result changes a lot, or flips between profit and loss, it depends heavily on how option prices were modelled, and the real outcome could easily have been different.

## What to take away

Modelled prices let you compare strategies consistently over many years, which is what a learning tool needs. They are not a record of what real trades would have earned. Treat the numbers as an informed estimate, read the sensitivity section, and remember the badge on every report.

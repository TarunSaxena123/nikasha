---
title: What is drawdown?
summary: The fall from a peak, worked through with rupee figures, and why it matters more than the average profit.
minutes: 3
---
## Peak to trough

Add up a strategy's results trade by trade and you get its [[equity-curve|equity curve]]. A **drawdown** is any fall of that curve from its highest point so far. The **maximum drawdown** is the largest such fall in the whole test.

Drawdown is measured from the peak, not from the start. A strategy can be in profit overall and still be in a deep drawdown.

## A worked example

Imagine five trades with these results after costs: +₹10,000, +₹5,000, −₹8,000, −₹6,000, +₹4,000.

- After two trades the equity is ₹15,000. That is the peak.
- After the next two it is ₹1,000. The drawdown is ₹15,000 − ₹1,000 = ₹14,000.
- After the last trade it is ₹5,000, still ₹10,000 below the peak.

The total result is a profit of ₹5,000, but the maximum drawdown was ₹14,000, almost three times as large. Someone following this strategy would have watched most of their gains disappear before the end.

## Why it matters more than the average

The average profit per trade (the [[expectancy]]) tells you what happened on a typical trade. It says nothing about the order of the trades. Drawdown does. It answers a practical question: how much would you have had to sit through, at the worst moment, to get the final result?

Large drawdowns matter for three reasons.

- **Money:** a fall of ₹14,000 needs that much capital behind it. If you entered a capital amount, the report also shows the drawdown as a percentage of it.
- **Recovery:** after a 50% fall, the remaining money has to double just to get back to where it was.
- **Behaviour:** in real trading, deep drawdowns are when people abandon a plan, often at the worst time. A backtest can't feel that, but the number warns you.

## Losing streaks

The report also shows the longest run of losing trades in a row. Losing streaks and drawdowns usually go together: a run of eight small losses can do as much damage as one large loss. A strategy that wins often but has occasional long streaks can still have a painful drawdown.

## How Nikasha shows it

The report puts the maximum drawdown first among the risk figures, before any profit. The drawdown chart sits directly under the equity curve so you can see when the falls happened and how long they lasted. The breakdowns help you see whether the worst periods came in particular years, at particular [[india-vix|India VIX]] levels or on particular kinds of days.

These figures come from simulated trades with modelled option prices on past data. A future drawdown can be larger than any seen in the test.

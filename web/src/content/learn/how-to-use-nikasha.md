---
title: How to use Nikasha
summary: The three ways in, what happens when you're asked a question, and how to read the review screen and the report.
minutes: 4
---
## Three ways in

Every strategy reaches the same review screen, whichever way you start.

- **Templates** suit you if you're new to options. Each one is explained in plain words, and you can run it with one click on the review screen.
- **Build a strategy** suits you if the rules are in your head. Four short steps (basics, strike, entry, exit) cover everything Nikasha needs. Advanced options stay off unless you switch them on.
- **Upload your strategy** suits you if the rules are written down. Nikasha reads a PDF, Word or text file, or text you paste, and lists what it understood.

## When Nikasha asks you a question

Nikasha never guesses. If a rule is vague ("exit decisively", "a tight [[stop-loss]]"), or a required value is missing, you get one short question at a time, usually with choices. Answering is how the test becomes exactly your strategy rather than someone else's idea of it. Values that are pre-filled, such as the [[lot-size|lot size]], still have to be confirmed by you.

## Reading the review screen

The review screen shows every rule in three columns: the rule, its setting and what it means. Advanced options you didn't use are listed as "Not used", so you can see that nothing was switched on for you. Below the rules are the evaluation settings: the backtest period, each cost with its source, and an optional capital amount. Tick "I've checked the costs and period" once you're happy. The **Evaluate Strategy** button stays disabled, with a list of what is still needed, until everything is complete.

## Reading the report

The report puts risk first. Start with the largest fall from a peak (the [[drawdown]]), the longest [[losing-streak|losing streak]] and the biggest single loss. Only then look at the total result, the [[win-rate|win rate]] and the [[expectancy]].

The breakdowns show when the strategy did well or badly: by year and month, by [[india-vix|India VIX]] level, on trending or sideways days, by weekday, on expiry days, and for calls versus puts. Groups with fewer than ten trades are marked "few trades", because a handful of trades says little.

The overfitting check compares the earlier years with the recent unseen years. If results faded on the unseen years, the rules may have fitted past noise (see [[overfitting]]). The volatility sensitivity shows the same test with India VIX two points lower and higher. If the result changes sign, it depends heavily on how option prices were modelled.

## Trying a change with what-if

Below the report, the what-if sliders change one stop-loss or target value at a time and run the test again on the same period. The panel shows the original next to the changed version, with a sentence such as "With a stop-loss of 25% instead of 30%, this strategy would have…". A small change that flips a profit into a loss is a sign of a fragile rule. **Use these settings** copies the change to the review screen; nothing runs until you press Evaluate again.

## Before you close the tab

Nikasha stores nothing. The report exists only in your open tab. Download the PDF (and the trades CSV if you want the detail) before you close it or refresh the page. Both files include the settings used, the data source and the short disclaimer, so they make sense on their own later.

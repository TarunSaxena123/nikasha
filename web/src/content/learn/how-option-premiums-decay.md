---
title: How option premiums decay
summary: Time value and theta, why decay speeds up near expiry, and why buying options means working against the clock.
minutes: 3
---
## Two parts of a premium

An option's [[premium]] has two parts. **Intrinsic value** is what the option would be worth if it expired right now: for a call, how far the index is above the [[strike]]; for a put, how far below. **Time value** is everything else: what buyers pay for the chance that the index moves further before [[expiry]].

An [[atm-itm-otm|at-the-money]] option has no intrinsic value. Its whole premium is time value.

## Theta: time value shrinking

As expiry gets closer, there is less time left for a big move, so time value shrinks. This loss is called [[theta-decay|theta decay]]. On expiry day, any remaining time value disappears and the option is worth only its intrinsic value.

If nothing else changes (the index stays where it is and volatility stays the same), an option buyer loses a little every day and a seller gains it.

## Why decay speeds up near expiry

Time value does not shrink in a straight line. With many weeks left, a day passing changes little. With two or three days left, each day takes a much larger share of what remains. Weekly options are always close to expiry, so their decay is fast.

You can see this in Nikasha's results. A bought weekly option held overnight loses value even if the index doesn't move, and the effect is strongest in the last days before expiry.

## Buying options means fighting the clock

When you buy an option, you need the index to move in your direction, far enough and soon enough to beat the decay. A correct view that comes true too slowly can still lose money. That is one reason many option-buying strategies show a low [[win-rate|win rate]]: lots of small losses from decay, offset (or not) by fewer large gains.

When you sell an option, decay works for you, but the risk is reversed: a large, fast move can cost far more than the premium received. The short straddle template carries a prominent warning for this reason.

## Expiry-day behaviour

On expiry day, premiums can swing sharply as the index moves around popular strikes, and time value collapses towards zero by the close. Real expiry-day prices also depend on supply and demand in ways a model can't capture.

Nikasha models premiums with [[black-scholes|Black-Scholes]], using [[india-vix|India VIX]] as the volatility. India VIX reflects 30-day expectations, so the model is least accurate for options very close to expiry. The report notes this, and expiry-day results deserve the most caution.

## What to take away

- Time value is a cost for buyers and an income for sellers.
- Decay accelerates in the final days before expiry.
- Holding a bought option overnight costs time value even on a quiet day.
- Results that rely on expiry-day trades are the least reliable part of any modelled backtest.

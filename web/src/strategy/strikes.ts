// Strike examples for the builder, rounding exactly like the engine (backtest/strikes.py).
export function atmStrike(spot: number, interval: number): number {
  return interval * Math.floor(spot / interval + 0.5);
}

export function moneynessStrike(spot: number, interval: number, moneyness: "ATM" | "ITM" | "OTM", distance: number, isCall: boolean): number {
  const atm = atmStrike(spot, interval);
  if (moneyness === "ATM") return atm;
  const itm = moneyness === "ITM";
  const lower = isCall ? itm : !itm;
  return lower ? atm - distance : atm + distance;
}

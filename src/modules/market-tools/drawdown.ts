import { Decimal } from "decimal.js";

export function simulateDrawdown(capitalInput: string, returnsInput: string) {
  const capitalText = capitalInput.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(capitalText)) throw new Error("Enter starting capital with up to 2 decimal places.");
  const capital = new Decimal(capitalText);
  if (capital.lt("0.01") || capital.gt("1000000000000")) throw new Error("Starting capital must be between ₹0.01 and ₹10,00,00,00,00,000.");
  const entries = returnsInput.split(",").map((entry) => entry.trim());
  if (!returnsInput.trim() || entries.length > 100) throw new Error("Enter between 1 and 100 comma-separated returns.");

  let balance = capital;
  let peak = capital;
  let maximumDrawdown = new Decimal(0);
  const steps = entries.map((entry, index) => {
    if (!/^[+-]?\d+(?:\.\d{1,6})?$/.test(entry)) throw new Error(`Return ${index + 1} must be a number with up to 6 decimal places.`);
    const change = new Decimal(entry);
    if (change.lt(-100) || change.gt(1000)) throw new Error(`Return ${index + 1} must be between -100% and 1000%.`);
    balance = balance.mul(new Decimal(1).plus(change.div(100)));
    if (balance.gt("1000000000000000")) throw new Error("The simulated balance exceeds the supported limit; reduce your inputs.");
    peak = Decimal.max(peak, balance);
    const drawdown = peak.minus(balance).div(peak).mul(100);
    maximumDrawdown = Decimal.max(maximumDrawdown, drawdown);
    return { change, balance, peak, drawdown };
  });
  const finalDrawdown = peak.minus(balance).div(peak).mul(100);
  const recovery = balance.isZero() ? null : peak.div(balance).minus(1).mul(100);
  return { capital, steps, balance, peak, maximumDrawdown, finalDrawdown, recovery };
}

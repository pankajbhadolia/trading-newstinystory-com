export type CalculatorId =
  | "brokerage" | "equity-delivery" | "equity-intraday" | "futures" | "options"
  | "position-size" | "stop-loss" | "target" | "risk-reward" | "break-even"
  | "compound-growth" | "loss-recovery" | "capital-depletion" | "drawdown";

export type Direction = "long" | "short";
export type Values = Record<string, number>;
export type Unit = "money" | "price" | "percent" | "quantity" | "ratio" | "number";
export type ResultLine = { label: string; value: number; unit: Unit };
export type CalculationResult = { title: string; value: number; unit: Unit; lines: ResultLine[] };

export type Field = {
  key: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  integer?: boolean;
  optional?: boolean;
  hint?: string;
};

export type CalculatorDefinition = {
  id: CalculatorId;
  href: string;
  title: string;
  description: string;
  explanation: string;
  fields: Field[];
  charges?: boolean;
  direction?: boolean;
};

const moneyMax = 1_000_000_000_000;
const quantityMax = 10_000_000;
const money = (key: string, label: string, min = 0): Field => ({ key, label, unit: "₹", min, max: moneyMax });
const quantity = (key: string, label: string, max = quantityMax): Field => ({ key, label, min: 1, max, integer: true });
const percent = (key: string, label: string, max = 100, min = 0): Field => ({ key, label, unit: "%", min, max });

export const chargeFields: Field[] = [
  percent("brokerageRate", "Brokerage per order", 100),
  { ...money("brokerageFlat", "Flat brokerage per order"), hint: "Added to percentage brokerage for each executed side." },
  { ...money("brokerageCap", "Brokerage cap per order"), optional: true, hint: "Leave blank for no cap. A zero cap means zero brokerage." },
  percent("exchangeRate", "Exchange transaction charge", 100),
  percent("sebiRate", "Regulatory / SEBI charge", 100),
  percent("sttBuyRate", "STT / CTT on buy turnover", 100),
  percent("sttSellRate", "STT / CTT on sell turnover", 100),
  percent("stampRate", "Stamp duty on buy turnover", 100),
  { ...percent("gstRate", "GST on eligible fees", 100), hint: "Applied to brokerage, exchange and regulatory charges only." },
  { ...money("otherCharges", "Other round-trip charges (including tax)"), hint: "Include any additional fees and their taxes; enter 0 if none." },
];

const tradeFields = [money("buyPrice", "Buy price per unit", 0.01), money("sellPrice", "Sell price per unit", 0.01), quantity("quantity", "Quantity in units")];
const derivativeFields = [money("buyPrice", "Buy price per unit", 0.01), money("sellPrice", "Sell price per unit", 0.01), quantity("lots", "Number of lots"), quantity("lotSize", "Units per lot")];
const entry = money("entry", "Entry price", 0.01);
const stop = money("stop", "Stop-loss price", 0.01);
const target = money("target", "Target price", 0.01);

export const calculators: CalculatorDefinition[] = [
  { id: "brokerage", href: "/tools/brokerage-calculator", title: "Brokerage Calculator", description: "Estimate round-trip brokerage and transaction charges.", explanation: "Estimates one buy and one sell order. Enter the rates applicable to your broker, instrument, exchange and date; no rates are pre-filled.", fields: tradeFields, charges: true },
  { id: "equity-delivery", href: "/tools/equity-delivery-pnl-calculator", title: "Equity Delivery P&L", description: "Estimate delivery trade profit or loss after configured charges.", explanation: "Long equity delivery: gross P&L is (sell price − buy price) × quantity. The estimate excludes taxes on income and charges not entered below.", fields: tradeFields, charges: true },
  { id: "equity-intraday", href: "/tools/equity-intraday-pnl-calculator", title: "Equity Intraday P&L", description: "Estimate intraday trade profit or loss after configured charges.", explanation: "For long and short trades, gross P&L is (sell price − buy price) × quantity. Direction identifies which side is the entry.", fields: tradeFields, charges: true, direction: true },
  { id: "futures", href: "/tools/futures-pnl-calculator", title: "Futures P&L", description: "Estimate futures profit or loss for a round trip.", explanation: "Quantity equals lots × units per lot. Gross P&L is the sell-minus-buy price difference multiplied by quantity. Enter current rates for your contract.", fields: derivativeFields, charges: true, direction: true },
  { id: "options", href: "/tools/options-pnl-calculator", title: "Options P&L", description: "Estimate profit or loss from buying and selling an option premium.", explanation: "Quantity equals lots × units per lot. This estimates a premium round trip only; expiry, exercise, assignment and related charges are excluded.", fields: derivativeFields, charges: true, direction: true },
  { id: "position-size", href: "/tools/position-size-calculator", title: "Position Size Calculator", description: "Estimate whole units based on capital at risk and stop distance.", explanation: "Risk budget = capital × risk percentage. Position size = risk budget ÷ absolute entry-to-stop distance, rounded down. Margin, affordability, slippage and costs are excluded.", fields: [money("capital", "Trading capital", 0.01), percent("riskPercent", "Capital risk per trade", 100, 0.01), entry, stop], direction: true },
  { id: "stop-loss", href: "/tools/stop-loss-calculator", title: "Stop-Loss Calculator", description: "Calculate a stop price from a percentage distance.", explanation: "The stop is the entry price reduced (long) or increased (short) by the chosen percentage. A stop order does not guarantee execution at that price.", fields: [entry, percent("stopPercent", "Stop distance", 99.99, 0.01)], direction: true },
  { id: "target", href: "/tools/target-calculator", title: "Target Price Calculator", description: "Calculate a target from your stop distance and reward multiple.", explanation: "Target = entry ± (absolute entry-to-stop distance × reward multiple). This is a hypothetical target, not a forecast.", fields: [entry, stop, { key: "multiple", label: "Reward multiple", min: 0.01, max: 1000 }], direction: true },
  { id: "risk-reward", href: "/tools/risk-reward-calculator", title: "Risk/Reward Calculator", description: "Compare potential reward with the amount risked per unit.", explanation: "Risk is the entry-to-stop distance; reward is the entry-to-target distance. The ratio excludes fees and slippage.", fields: [entry, stop, target], direction: true },
  { id: "break-even", href: "/tools/break-even-calculator", title: "Break-even Calculator", description: "Estimate an exit price that recovers a fixed amount of fees.", explanation: "Break-even = entry ± total fixed round-trip fees ÷ quantity. Exit-price-dependent charges must be estimated separately; this is not a dynamic tax calculation.", fields: [entry, quantity("quantity", "Quantity in units"), money("fees", "Estimated total round-trip fees")], direction: true },
  { id: "compound-growth", href: "/tools/capital-growth-calculator", title: "Compound Growth Calculator", description: "Model hypothetical compounded capital growth.", explanation: "Future value = starting capital × (1 + annual nominal rate ÷ compounding periods per year) raised to the total number of periods. No deposits, taxes or fees are included.", fields: [money("capital", "Starting capital", 0.01), { key: "annualRate", label: "Annual nominal return", unit: "%", min: -99.99, max: 1000 }, quantity("years", "Years", 50), { key: "frequency", label: "Compounding periods per year", min: 1, max: 365, integer: true, hint: "For example: 1 yearly, 4 quarterly, or 12 monthly." }] },
  { id: "loss-recovery", href: "/tools/loss-recovery-calculator", title: "Loss Recovery Calculator", description: "Calculate the return needed to recover a percentage loss.", explanation: "Required recovery = loss percentage ÷ (100 − loss percentage) × 100. A total loss cannot be recovered by applying a return to zero capital.", fields: [percent("lossPercent", "Loss from starting capital", 99.99)] },
  { id: "capital-depletion", href: "/tools/capital-depletion-simulator", title: "Capital Depletion Simulator", description: "Model repeated losses as a percentage of the remaining balance.", explanation: "Ending capital = starting capital × (1 − loss rate) raised to the number of losses. Each loss is applied to the remaining balance; this is a hypothetical scenario.", fields: [money("capital", "Starting capital", 0.01), percent("lossPercent", "Loss per period"), quantity("periods", "Number of consecutive losses", 1200)] },
  { id: "drawdown", href: "/tools/drawdown-calculator", title: "Drawdown Calculator", description: "Measure the decline from a previous peak to a current balance.", explanation: "Drawdown = (peak balance − current balance) ÷ peak balance. Deposits, withdrawals and fees are not adjusted for.", fields: [money("peak", "Peak balance", 0.01), money("current", "Current balance")] },
];

function assertValues(fields: Field[], values: Values) {
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined && field.optional) continue;
    if (!Number.isFinite(value) || value < field.min || value > field.max || (field.integer && !Number.isInteger(value))) {
      throw new Error(`${field.label} must be ${field.integer ? "a whole number " : ""}between ${field.min} and ${field.max}.`);
    }
    const precision = field.unit === "₹" ? 2 : 6;
    if (!field.integer && new Decimal(value).decimalPlaces() > precision) throw new Error(`${field.label} supports at most ${precision} decimal places.`);
  }
}

function roundMoney(value: Decimal.Value) {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

function calculateCharges(buyTurnover: number, sellTurnover: number, values: Values) {
  const rate = (value: Decimal.Value, percentage: number) => new Decimal(value).mul(percentage).div(100);
  const brokerage = (turnover: number) => {
    const amount = rate(turnover, values.brokerageRate).plus(values.brokerageFlat);
    return roundMoney(values.brokerageCap === undefined ? amount : Decimal.min(amount, values.brokerageCap));
  };
  const buyBrokerage = brokerage(buyTurnover);
  const sellBrokerage = brokerage(sellTurnover);
  const turnover = new Decimal(buyTurnover).plus(sellTurnover);
  const exchange = roundMoney(rate(turnover, values.exchangeRate));
  const regulatory = roundMoney(rate(turnover, values.sebiRate));
  const sttBuy = roundMoney(rate(buyTurnover, values.sttBuyRate));
  const sttSell = roundMoney(rate(sellTurnover, values.sttSellRate));
  const stamp = roundMoney(rate(buyTurnover, values.stampRate));
  const gstBase = new Decimal(buyBrokerage).plus(sellBrokerage).plus(exchange).plus(regulatory);
  const gst = roundMoney(rate(gstBase, values.gstRate));
  const total = roundMoney(gstBase.plus(sttBuy).plus(sttSell).plus(stamp).plus(gst).plus(values.otherCharges));
  return { buyBrokerage, sellBrokerage, exchange, regulatory, sttBuy, sttSell, stamp, gst, otherCharges: values.otherCharges, total };
}

function validateStop(entryPrice: number, stopPrice: number, direction: Direction) {
  if ((direction === "long" && stopPrice >= entryPrice) || (direction === "short" && stopPrice <= entryPrice)) {
    throw new Error(direction === "long" ? "For a long trade, stop-loss must be below entry." : "For a short trade, stop-loss must be above entry.");
  }
}

function tradeDetails(definition: CalculatorDefinition, values: Values) {
  assertValues(definition.fields, values);
  const units = definition.id === "futures" || definition.id === "options" ? values.lots * values.lotSize : values.quantity;
  if (!Number.isSafeInteger(units) || units > quantityMax) throw new Error(`Total quantity cannot exceed ${quantityMax} units.`);
  if (Math.max(values.buyPrice, values.sellPrice) * units > Number.MAX_SAFE_INTEGER / 100) throw new Error("Turnover is too large to calculate reliably. Reduce the inputs.");
  const buyTurnover = roundMoney(new Decimal(values.buyPrice).mul(units));
  const sellTurnover = roundMoney(new Decimal(values.sellPrice).mul(units));
  return { units, buyTurnover, sellTurnover, gross: roundMoney(new Decimal(sellTurnover).minus(buyTurnover)) };
}

export function calculateGross(id: CalculatorId, values: Values): CalculationResult {
  const definition = calculators.find((calculator) => calculator.id === id);
  if (!definition?.charges || id === "brokerage") throw new Error("Gross P&L is not available for this calculator.");
  const trade = tradeDetails(definition, values);
  return {
    title: "Gross P&L (before charges)",
    value: trade.gross,
    unit: "money",
    lines: [
      { label: "Quantity", value: trade.units, unit: "quantity" },
      { label: "Buy turnover", value: trade.buyTurnover, unit: "money" },
      { label: "Sell turnover", value: trade.sellTurnover, unit: "money" },
    ],
  };
}

export function calculate(id: CalculatorId, values: Values, direction: Direction = "long"): CalculationResult {
  const definition = calculators.find((calculator) => calculator.id === id);
  if (!definition) throw new Error("Unknown calculator.");
  if (direction !== "long" && direction !== "short") throw new Error("Select a valid trade direction.");
  assertValues(definition.fields, values);
  if (definition.charges) assertValues(chargeFields, values);
  const line = (label: string, value: number, unit: Unit): ResultLine => ({ label, value, unit });
  let result: CalculationResult;

  if (definition.charges) {
    const { units, buyTurnover, sellTurnover, gross } = tradeDetails(definition, values);
    const charge = calculateCharges(buyTurnover, sellTurnover, values);
    const net = roundMoney(new Decimal(gross).minus(charge.total));
    const lines: ResultLine[] = [
      line("Quantity", units, "quantity"), line("Buy turnover", buyTurnover, "money"), line("Sell turnover", sellTurnover, "money"),
      line("Buy brokerage", charge.buyBrokerage, "money"), line("Sell brokerage", charge.sellBrokerage, "money"),
      line("Exchange charges", charge.exchange, "money"), line("Regulatory / SEBI charges", charge.regulatory, "money"),
      line("STT / CTT on buy", charge.sttBuy, "money"), line("STT / CTT on sell", charge.sttSell, "money"),
      line("Stamp duty", charge.stamp, "money"), line("GST", charge.gst, "money"), line("Other charges (including tax)", charge.otherCharges, "money"),
      line("Total charges", charge.total, "money"),
    ];
    if (id !== "brokerage") lines.push(line("Gross P&L", gross, "money"), line("Net P&L", net, "money"));
    result = { title: id === "brokerage" ? "Estimated total charges" : "Estimated net P&L", value: id === "brokerage" ? charge.total : net, unit: "money", lines };
  } else {
    switch (id) {
      case "position-size": {
        validateStop(values.entry, values.stop, direction);
        const budget = new Decimal(values.capital).mul(values.riskPercent).div(100);
        const risk = new Decimal(values.entry).minus(values.stop).abs();
        const units = budget.div(risk).floor().toNumber();
        if (!Number.isSafeInteger(units) || units > quantityMax) throw new Error(`Calculated quantity cannot exceed ${quantityMax} units.`);
        result = { title: "Position size", value: units, unit: "quantity", lines: [line("Risk budget", budget.toNumber(), "money"), line("Risk per unit", risk.toNumber(), "price"), line("Estimated risk", risk.mul(units).toNumber(), "money"), line("Notional position value", new Decimal(values.entry).mul(units).toNumber(), "money")] };
        break;
      }
      case "stop-loss": {
        const distance = new Decimal(values.entry).mul(values.stopPercent).div(100);
        result = { title: "Stop-loss price", value: (direction === "long" ? new Decimal(values.entry).minus(distance) : new Decimal(values.entry).plus(distance)).toNumber(), unit: "price", lines: [line("Entry price", values.entry, "price"), line("Stop distance per unit", distance.toNumber(), "price"), line("Stop distance", values.stopPercent, "percent")] };
        break;
      }
      case "target": {
        validateStop(values.entry, values.stop, direction);
        const risk = new Decimal(values.entry).minus(values.stop).abs();
        const reward = risk.mul(values.multiple);
        const value = direction === "long" ? new Decimal(values.entry).plus(reward) : new Decimal(values.entry).minus(reward);
        if (value.lte(0)) throw new Error("The calculated target must be greater than zero.");
        result = { title: "Target price", value: value.toNumber(), unit: "price", lines: [line("Risk per unit", risk.toNumber(), "price"), line("Reward multiple", values.multiple, "ratio"), line("Target reward per unit", reward.toNumber(), "price")] };
        break;
      }
      case "risk-reward": {
        validateStop(values.entry, values.stop, direction);
        if ((direction === "long" && values.target <= values.entry) || (direction === "short" && values.target >= values.entry)) throw new Error("Target must be on the profitable side of entry.");
        const risk = new Decimal(values.entry).minus(values.stop).abs();
        const reward = new Decimal(values.target).minus(values.entry).abs();
        result = { title: "Risk / reward", value: reward.div(risk).toNumber(), unit: "ratio", lines: [line("Risk per unit", risk.toNumber(), "price"), line("Reward per unit", reward.toNumber(), "price")] };
        break;
      }
      case "break-even": {
        const perUnit = new Decimal(values.fees).div(values.quantity);
        const value = direction === "long" ? new Decimal(values.entry).plus(perUnit) : new Decimal(values.entry).minus(perUnit);
        if (value.lt(0)) throw new Error("Fees exceed the maximum proceeds of this short position; no non-negative break-even price exists.");
        result = { title: "Break-even exit price", value: value.toNumber(), unit: "price", lines: [line("Entry price", values.entry, "price"), line("Total estimated fees", values.fees, "money"), line("Fees per unit", perUnit.toNumber(), "price")] };
        break;
      }
      case "compound-growth": {
        const periods = values.years * values.frequency;
        const value = new Decimal(1).plus(new Decimal(values.annualRate).div(100).div(values.frequency)).pow(periods).mul(values.capital);
        result = { title: "Future value", value: value.toNumber(), unit: "money", lines: [line("Starting capital", values.capital, "money"), line("Total growth / loss", value.minus(values.capital).toNumber(), "money"), line("Compounding periods", periods, "number")] };
        break;
      }
      case "loss-recovery":
        result = { title: "Required recovery return", value: new Decimal(values.lossPercent).div(new Decimal(100).minus(values.lossPercent)).mul(100).toNumber(), unit: "percent", lines: [line("Loss", values.lossPercent, "percent"), line("Capital remaining", new Decimal(100).minus(values.lossPercent).toNumber(), "percent")] };
        break;
      case "capital-depletion": {
        const remaining = new Decimal(1).minus(new Decimal(values.lossPercent).div(100)).pow(values.periods).mul(values.capital);
        result = { title: "Remaining capital", value: remaining.toNumber(), unit: "money", lines: [line("Starting capital", values.capital, "money"), line("Total loss", new Decimal(values.capital).minus(remaining).toNumber(), "money"), line("Capital remaining", remaining.div(values.capital).mul(100).toNumber(), "percent")] };
        break;
      }
      case "drawdown": {
        if (values.current > values.peak) throw new Error("Current balance cannot exceed the stated peak.");
        const loss = new Decimal(values.peak).minus(values.current);
        result = { title: "Drawdown", value: loss.div(values.peak).mul(100).toNumber(), unit: "percent", lines: [line("Peak balance", values.peak, "money"), line("Current balance", values.current, "money"), line("Drawdown amount", loss.toNumber(), "money")] };
        break;
      }
      default:
        throw new Error("Calculator is not available.");
    }
  }
  if (![result.value, ...result.lines.map((item) => item.value)].every(Number.isFinite)) throw new Error("The result is too large to calculate. Reduce the inputs.");
  if ([{ value: result.value, unit: result.unit }, ...result.lines].some((item) => (item.unit === "money" || item.unit === "price") && Math.abs(item.value) > Number.MAX_SAFE_INTEGER / 100)) throw new Error("The result is too large to calculate reliably. Reduce the inputs.");
  return result;
}
import { Decimal } from "decimal.js";


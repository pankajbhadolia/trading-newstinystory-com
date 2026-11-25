import type { CalculatorId, Values, Direction } from "./calculations";

type Guide = {
  purpose: string;
  methodology: string;
  example: string;
  exampleValues: Values;
  exampleDirection?: Direction;
  expected: number;
  mistakes: string[];
  questions: { question: string; answer: string }[];
  related: CalculatorId[];
};

const noCharges = { brokerageRate: 0, brokerageFlat: 10, exchangeRate: 0, sebiRate: 0, sttBuyRate: 0, sttSellRate: 0, stampRate: 0, gstRate: 0, otherCharges: 0 };
const chargeQuestion = { question: "Are broker and statutory rates included automatically?", answer: "No. Enter and confirm the rates applicable to your broker, instrument, exchange and trade date, including zero where appropriate." };
const estimateQuestion = { question: "Is this result a prediction or recommendation?", answer: "No. It is an illustration based on your inputs, not a forecast or financial advice." };

export const calculatorGuides: Record<CalculatorId, Guide> = {
  brokerage: {
    purpose: "Estimate the cost of a single buy and sell order using your own broker and statutory charge assumptions.",
    methodology: "Calculate buy and sell turnover separately. Apply brokerage per order, optionally capped; apply the entered exchange, regulatory, STT/CTT, stamp duty and GST rates as described in the form. Add other charges and their taxes. Each displayed charge is rounded to paise.",
    example: "Buy 100 units at ₹100 and sell at ₹105. With a ₹10 flat brokerage per order and all other entered rates and charges at zero, estimated total charges are ₹20.",
    exampleValues: { buyPrice: 100, sellPrice: 105, quantity: 100, ...noCharges }, expected: 20,
    mistakes: ["Assuming the example's zero rates are actual market charges.", "Leaving out fees, taxes or additional orders."],
    questions: [chargeQuestion, { question: "Does this include income tax?", answer: "No. It excludes income tax and charges not entered in the form." }],
    related: ["equity-delivery", "break-even", "equity-intraday"],
  },
  "equity-delivery": {
    purpose: "Compare the gross and estimated net result of a long equity delivery round trip.",
    methodology: "Gross P&L = (sell price − buy price) × units. Net P&L = gross P&L − the configured round-trip charges.",
    example: "Buy 100 shares at ₹100 and sell at ₹105. Gross profit is ₹500; with ₹10 brokerage per order and all other entered charges at zero, estimated net profit is ₹480.",
    exampleValues: { buyPrice: 100, sellPrice: 105, quantity: 100, ...noCharges }, expected: 480,
    mistakes: ["Treating gross P&L as the amount after charges.", "Using the illustrative zero rates as actual charges."],
    questions: [chargeQuestion, estimateQuestion], related: ["brokerage", "equity-intraday", "break-even"],
  },
  "equity-intraday": {
    purpose: "Estimate the result of buying and selling equity in an intraday round trip, before and after entered costs.",
    methodology: "Gross P&L = (sell price − buy price) × units; net P&L subtracts configured charges. For a short trade, sell is the entry and buy is the exit.",
    example: "Sell 100 shares at ₹105 and buy them back at ₹100. Gross profit is ₹500; with ₹10 brokerage per order and other entered charges at zero, estimated net profit is ₹480.",
    exampleValues: { buyPrice: 100, sellPrice: 105, quantity: 100, ...noCharges }, exampleDirection: "short", expected: 480,
    mistakes: ["Reversing the buy and sell prices for a short trade.", "Ignoring fees or assuming example rates apply to your trade."],
    questions: [chargeQuestion, estimateQuestion], related: ["brokerage", "position-size", "equity-delivery"],
  },
  futures: {
    purpose: "Estimate a futures round-trip outcome from buy and sell prices, the number of lots and units per lot.",
    methodology: "Units = lots × units per lot. Gross P&L = (sell price − buy price) × units. Net P&L subtracts the charges entered for the round trip.",
    example: "Buy at ₹100 and sell at ₹105, with 2 lots of 50 units. Gross profit is ₹500; with ₹10 brokerage per order and other entered charges at zero, estimated net profit is ₹480.",
    exampleValues: { buyPrice: 100, sellPrice: 105, lots: 2, lotSize: 50, ...noCharges }, expected: 480,
    mistakes: ["Entering lots as units or using an incorrect contract lot size.", "Ignoring leverage, margin, slippage or charges outside this model."],
    questions: [chargeQuestion, { question: "Does this calculate margin?", answer: "No. Margin requirements and the possibility of losses exceeding margin are not modelled." }], related: ["options", "position-size", "brokerage"],
  },
  options: {
    purpose: "Estimate the result of an option premium buy-and-sell round trip in rupees.",
    methodology: "Units = lots × units per lot. Gross P&L = (sell premium − buy premium) × units. Net P&L subtracts the configured charges.",
    example: "Buy premium at ₹100 and sell at ₹105, with 2 lots of 50 units. Gross profit is ₹500; with ₹10 brokerage per order and other entered charges at zero, estimated net profit is ₹480.",
    exampleValues: { buyPrice: 100, sellPrice: 105, lots: 2, lotSize: 50, ...noCharges }, expected: 480,
    mistakes: ["Confusing the option premium with the underlying price.", "Assuming this model covers expiry, exercise or assignment."],
    questions: [chargeQuestion, { question: "Does this model expiry or assignment?", answer: "No. It covers a premium round trip only and excludes expiry, exercise, assignment and related charges." }], related: ["futures", "brokerage", "risk-reward"],
  },
  "position-size": {
    purpose: "Translate a chosen capital risk percentage and stop distance into a whole-unit position size.",
    methodology: "Risk budget = capital × risk percentage ÷ 100. Units = risk budget ÷ absolute entry-to-stop distance, rounded down.",
    example: "With ₹1,00,000 capital, 1% risk, ₹100 entry and ₹95 stop, the budget is ₹1,000 and the size is 200 units.",
    exampleValues: { capital: 100000, riskPercent: 1, entry: 100, stop: 95 }, expected: 200,
    mistakes: ["Treating the calculated size as affordable without checking margin and capital.", "Assuming a stop guarantees the maximum loss; gaps and slippage can increase it."],
    questions: [{ question: "Are charges and slippage included?", answer: "No. This simple position size excludes charges, slippage, margin and affordability." }, estimateQuestion], related: ["stop-loss", "risk-reward", "capital-depletion"],
  },
  "stop-loss": {
    purpose: "Calculate a hypothetical stop price at a chosen percentage distance from an entry price.",
    methodology: "For a long trade, stop = entry × (1 − percentage ÷ 100). For a short trade, add the percentage instead.",
    example: "For a long entry at ₹100 and a 5% stop distance, the stop price is ₹95.",
    exampleValues: { entry: 100, stopPercent: 5 }, expected: 95,
    mistakes: ["Placing a long stop above entry or a short stop below entry.", "Assuming a stop order guarantees an execution price."],
    questions: [{ question: "Will the trade exit at this price?", answer: "Not necessarily. Market gaps, liquidity and order type can affect execution." }, estimateQuestion], related: ["position-size", "target", "risk-reward"],
  },
  target: {
    purpose: "Calculate a hypothetical target price from the stop distance and a selected reward multiple.",
    methodology: "Distance = |entry − stop| × reward multiple. Add the distance to entry for a long trade; subtract it for a short trade.",
    example: "For a long entry of ₹100, stop of ₹95 and reward multiple of 2, the target is ₹110.",
    exampleValues: { entry: 100, stop: 95, multiple: 2 }, expected: 110,
    mistakes: ["Treating a target as a forecast.", "Ignoring costs, slippage and exchange tick size."],
    questions: [estimateQuestion, { question: "Are charges included?", answer: "No. The target uses price distances only, before charges and slippage." }], related: ["stop-loss", "risk-reward", "position-size"],
  },
  "risk-reward": {
    purpose: "Compare the planned reward per unit with the planned risk per unit for a trade.",
    methodology: "Risk = |entry − stop|; reward = |target − entry|. The displayed ratio is 1 : reward ÷ risk.",
    example: "A long entry at ₹100, stop at ₹95 and target at ₹110 gives ₹5 risk and ₹10 reward per unit, or 1 : 2.",
    exampleValues: { entry: 100, stop: 95, target: 110 }, expected: 2,
    mistakes: ["Treating the ratio as a probability of success.", "Ignoring fees, slippage and the possibility that a stop fills at a different price."],
    questions: [estimateQuestion, { question: "Does a 1 : 2 ratio guarantee a profit?", answer: "No. The ratio describes planned distances, not whether either level will be reached." }], related: ["target", "stop-loss", "position-size"],
  },
  "break-even": {
    purpose: "Estimate an exit price that offsets a fixed assumed amount of round-trip fees.",
    methodology: "Divide total fixed fees by units. Add the result to entry for a long position or subtract it for a short position.",
    example: "For a long entry at ₹100, 100 units and ₹200 estimated fees, the break-even exit is ₹102.",
    exampleValues: { entry: 100, quantity: 100, fees: 200 }, expected: 102,
    mistakes: ["Forgetting that some charges vary with the exit price.", "Treating the estimated fixed fees as a complete tax calculation."],
    questions: [{ question: "Are variable charges calculated automatically?", answer: "No. Estimate the total fees separately and revisit the estimate if price-dependent charges change." }, estimateQuestion], related: ["brokerage", "equity-delivery", "equity-intraday"],
  },
  "compound-growth": {
    purpose: "Explore a hypothetical constant-rate compounding scenario, including negative rates.",
    methodology: "Future value = starting capital × (1 + annual nominal rate ÷ 100 ÷ periods per year) raised to years × periods per year.",
    example: "₹10,000 at a hypothetical 10% nominal annual rate, compounded annually for 2 years, becomes ₹12,100 before fees and taxes.",
    exampleValues: { capital: 10000, annualRate: 10, years: 2, frequency: 1 }, expected: 12100,
    mistakes: ["Assuming a constant return is guaranteed.", "Ignoring deposits, withdrawals, fees and taxes, which this model excludes."],
    questions: [estimateQuestion, { question: "Does the calculator include deposits?", answer: "No. It models the starting capital only, with no additional deposits or withdrawals." }], related: ["loss-recovery", "drawdown", "capital-depletion"],
  },
  "loss-recovery": {
    purpose: "Show the percentage gain needed on remaining capital to return to the original amount after a loss.",
    methodology: "Required recovery percentage = loss percentage ÷ (100 − loss percentage) × 100.",
    example: "After a 20% loss, ₹100 becomes ₹80. A 25% gain on ₹80 is needed to return to ₹100.",
    exampleValues: { lossPercent: 20 }, expected: 25,
    mistakes: ["Assuming the percentage gain needed equals the percentage lost.", "Assuming recovery is guaranteed or possible by applying a return to zero capital."],
    questions: [{ question: "Why is recovery higher than the loss percentage?", answer: "The gain is measured against the smaller remaining balance, rather than the original capital." }, estimateQuestion], related: ["drawdown", "capital-depletion", "compound-growth"],
  },
  "capital-depletion": {
    purpose: "Model the effect of repeated hypothetical losses applied to a shrinking balance.",
    methodology: "Remaining capital = starting capital × (1 − loss percentage ÷ 100) raised to the number of consecutive losses.",
    example: "₹10,000 reduced by 10% twice becomes ₹9,000 and then ₹8,100.",
    exampleValues: { capital: 10000, lossPercent: 10, periods: 2 }, expected: 8100,
    mistakes: ["Applying each loss to the original balance instead of the remaining balance.", "Treating a hypothetical sequence as a prediction."],
    questions: [estimateQuestion, { question: "Are fees or deposits included?", answer: "No. The model applies only the entered repeated percentage loss." }], related: ["drawdown", "loss-recovery", "position-size"],
  },
  drawdown: {
    purpose: "Measure the decline from a chosen peak balance to a current balance.",
    methodology: "Drawdown amount = peak − current. Drawdown percentage = (peak − current) ÷ peak × 100.",
    example: "A decline from ₹1,00,000 to ₹80,000 is a ₹20,000 drawdown, or 20%.",
    exampleValues: { peak: 100000, current: 80000 }, expected: 20,
    mistakes: ["Comparing balances without considering deposits and withdrawals.", "Confusing a single peak-to-current decline with a full historical maximum drawdown."],
    questions: [{ question: "Does this find maximum historical drawdown?", answer: "No. It measures the two balances you enter, without examining a historical series." }, estimateQuestion], related: ["loss-recovery", "capital-depletion", "compound-growth"],
  },
};

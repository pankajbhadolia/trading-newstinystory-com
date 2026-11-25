import assert from "node:assert/strict";
import test from "node:test";
import { calculate, calculateGross, calculators } from "../src/modules/calculators/calculations.ts";

const fees = { brokerageRate: 0.1, brokerageFlat: 1, exchangeRate: 0.01, sebiRate: 0.001, sttBuyRate: 0.1, sttSellRate: 0.2, stampRate: 0.01, gstRate: 18, otherCharges: 0 };
const trade = { buyPrice: 100, sellPrice: 110, quantity: 10, ...fees };
const derivatives = { buyPrice: 100, sellPrice: 110, lots: 2, lotSize: 5, ...fees };
const find = (result, label) => result.lines.find((line) => line.label === label)?.value;
const close = (actual, expected, tolerance = 0.000001) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("brokerage: per-side fees, taxes and total", () => {
  const result = calculate("brokerage", trade);
  assert.equal(result.value, 8.41);
  assert.equal(find(result, "Buy brokerage"), 2);
  assert.equal(find(result, "Sell brokerage"), 2.1);
  assert.equal(find(result, "Exchange charges"), 0.21);
  assert.equal(find(result, "Regulatory / SEBI charges"), 0.02);
  assert.equal(find(result, "STT / CTT on buy"), 1);
  assert.equal(find(result, "STT / CTT on sell"), 2.2);
  assert.equal(find(result, "Stamp duty"), 0.1);
  assert.equal(find(result, "GST"), 0.78);
});

test("equity delivery: gross and net profit", () => {
  assert.equal(calculateGross("equity-delivery", { buyPrice: 100, sellPrice: 110, quantity: 10 }).value, 100);
  const result = calculate("equity-delivery", trade);
  assert.equal(find(result, "Gross P&L"), 100);
  assert.equal(result.value, 91.59);
});

test("equity intraday: short loss and configured costs", () => {
  const result = calculate("equity-intraday", { ...trade, buyPrice: 110, sellPrice: 100 }, "short");
  assert.equal(find(result, "Gross P&L"), -100);
  assert.equal(result.value, -108.32);
});

test("futures: lots and lot size determine units", () => {
  const result = calculate("futures", derivatives, "short");
  assert.equal(find(result, "Quantity"), 10);
  assert.equal(find(result, "Gross P&L"), 100);
  assert.equal(result.value, 91.59);
});

test("options: round-trip premium loss", () => {
  const result = calculate("options", { ...derivatives, buyPrice: 110, sellPrice: 100 });
  assert.equal(find(result, "Gross P&L"), -100);
  assert.equal(result.value, -108.32);
});

test("position size: whole units from risk budget", () => {
  const result = calculate("position-size", { capital: 100000, riskPercent: 1, entry: 100, stop: 95 });
  assert.equal(result.value, 200);
  assert.equal(find(result, "Estimated risk"), 1000);
  assert.equal(calculate("position-size", { capital: 1000, riskPercent: 1, entry: 100.2, stop: 100 }).value, 50);
});

test("stop-loss: long and short price", () => {
  const values = { entry: 100, stopPercent: 5 };
  assert.equal(calculate("stop-loss", values).value, 95);
  assert.equal(calculate("stop-loss", values, "short").value, 105);
});

test("target: short reward multiple", () => {
  assert.equal(calculate("target", { entry: 100, stop: 105, multiple: 2 }, "short").value, 90);
});

test("risk/reward: ratio of target to stop distance", () => {
  assert.equal(calculate("risk-reward", { entry: 100, stop: 95, target: 110 }).value, 2);
});

test("break-even: short position including fixed fees", () => {
  assert.equal(calculate("break-even", { entry: 100, quantity: 10, fees: 30 }, "short").value, 97);
});

test("compound growth: nominal annual rate compounded monthly", () => {
  close(calculate("compound-growth", { capital: 10000, annualRate: 12, years: 1, frequency: 12 }).value, 11268.2503013197);
});

test("loss recovery: a 20 percent loss needs 25 percent recovery", () => {
  assert.equal(calculate("loss-recovery", { lossPercent: 20 }).value, 25);
});

test("capital depletion: repeated losses use remaining balance", () => {
  close(calculate("capital-depletion", { capital: 10000, lossPercent: 10, periods: 3 }).value, 7290);
});

test("drawdown: percentage and amount from peak", () => {
  const result = calculate("drawdown", { peak: 100000, current: 80000 });
  assert.equal(result.value, 20);
  assert.equal(find(result, "Drawdown amount"), 20000);
});

test("brokerage caps apply independently per side, including a zero cap", () => {
  const capped = calculate("brokerage", { ...trade, brokerageCap: 1.5 });
  assert.equal(find(capped, "Buy brokerage"), 1.5);
  assert.equal(find(capped, "Sell brokerage"), 1.5);
  assert.equal(find(calculate("brokerage", { ...trade, brokerageCap: 0 }), "Buy brokerage"), 0);
  const extra = calculate("brokerage", { ...trade, otherCharges: 3.25 });
  assert.equal(find(extra, "Other charges (including tax)"), 3.25);
  assert.equal(extra.value, 11.66);
});

test("reject missing rates, invalid direction, impossible price levels and unsafe values", () => {
  assert.throws(() => calculate("brokerage", { buyPrice: 100, sellPrice: 110, quantity: 10 }), /Brokerage per order/);
  assert.throws(() => calculate("position-size", { capital: 1000, riskPercent: 1, entry: 100, stop: 100 }), /below entry/);
  assert.throws(() => calculate("risk-reward", { entry: 100, stop: 95, target: 90 }), /profitable side/);
  assert.throws(() => calculate("target", { entry: 100, stop: 200, multiple: 2 }, "short"), /greater than zero/);
  assert.throws(() => calculate("break-even", { entry: 100, quantity: 1, fees: 101 }, "short"), /no non-negative/);
  assert.throws(() => calculate("loss-recovery", { lossPercent: 100 }), /between/);
  assert.throws(() => calculate("drawdown", { peak: 100, current: 101 }), /cannot exceed/);
  assert.throws(() => calculate("futures", { ...derivatives, lots: 10000000, lotSize: 2 }), /Total quantity/);
  assert.throws(() => calculate("brokerage", { ...trade, buyPrice: 1000000000000, quantity: 1000 }), /too large/);
  assert.throws(() => calculate("stop-loss", { entry: 100, stopPercent: 5 }, "sideways"), /valid trade direction/);
  assert.throws(() => calculate("stop-loss", { entry: 100.001, stopPercent: 5 }), /at most 2 decimal/);
});

test("calculator paths and IDs are unique", () => {
  assert.equal(calculators.length, 14);
  assert.equal(new Set(calculators.map((item) => item.id)).size, 14);
  assert.equal(new Set(calculators.map((item) => item.href)).size, 14);
});

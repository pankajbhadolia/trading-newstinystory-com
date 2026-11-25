import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateTrade, checklistItemSchema, disciplineScore, reviewSchema, tradeSchema } from "../src/modules/journal/domain.ts";

const trade = {
  date: "2026-11-25", session: "Morning", instrument: "Equity", symbol: "ABC", segment: "NSE", strikePrice: null,
  expiryDate: null, direction: "BUY", executions: [
    { side: "ENTRY", price: 100, quantity: 10 },
    { side: "ENTRY", price: 110, quantity: 20 },
    { side: "EXIT", price: 120, quantity: 6 },
    { side: "EXIT", price: 115, quantity: 9 },
  ], stopLoss: 95, target: 125, charges: 5, strategy: "", entryReason: "", exitReason: "", emotion: "", notes: "", draft: false,
};

test("weighted average partial close calculates gross and net using matched units", () => {
  const result = calculateTrade(tradeSchema.parse(trade));
  assert.deepEqual(result, { entryQuantity: 30, exitQuantity: 15, averageEntry: "106.666667", averageExit: "117.000000", gross: "155.00", net: "150.00", openQuantity: 15 });
});

test("short trades reverse the direction of profit and unknown charges leave net unknown", () => {
  const result = calculateTrade(tradeSchema.parse({ ...trade, direction: "SELL", charges: null }));
  assert.equal(result.gross, "-155.00");
  assert.equal(result.net, null);
});

test("round-trip and decimal prices preserve accurate paise", () => {
  const result = calculateTrade(tradeSchema.parse({ ...trade, charges: 0.01, executions: [{ side: "ENTRY", price: 0.1, quantity: 3 }, { side: "EXIT", price: 0.3, quantity: 3 }] }));
  assert.equal(result.gross, "0.60");
  assert.equal(result.net, "0.59");
  assert.equal(result.openQuantity, 0);
});

test("incomplete drafts are accepted but cannot produce misleading calculations", () => {
  const draft = { ...trade, date: null, direction: null, draft: true, executions: [{ side: "ENTRY", price: null, quantity: null }] };
  assert.equal(calculateTrade(tradeSchema.parse(draft)), null);
  assert.equal(tradeSchema.safeParse({ ...draft, draft: false }).success, false);
  assert.equal(tradeSchema.safeParse({ ...trade, executions: [...trade.executions, { side: "EXIT", price: 100, quantity: 20 }] }).success, false);
  assert.equal(calculateTrade(tradeSchema.parse({ ...trade, draft: true, executions: [...trade.executions, { side: "EXIT", price: 100, quantity: 20 }] })), null);
});

test("invalid dates, excess precision, negatives and unknown properties are rejected", () => {
  for (const bad of [{ ...trade, date: "2026-02-30" }, { ...trade, charges: -1 }, { ...trade, charges: 0.001 }, { ...trade, extra: true }]) assert.equal(tradeSchema.safeParse(bad).success, false);
});

test("weighted score excludes not-applicable items but includes pending and violations", () => {
  const item = (ruleId, weight, status) => checklistItemSchema.parse({ ruleId, category: "Risk management", title: ruleId, weight, status, note: "" });
  const items = [item("a", 3, "DONE"), item("b", 2, "VIOLATED"), item("c", 1, "PENDING"), item("d", 9, "NA")];
  assert.equal(disciplineScore(items), 50);
  assert.equal(disciplineScore([item("a", 1, "NA")]), null);
  assert.equal(disciplineScore([]), null);
});

test("duplicate rule responses are rejected", () => {
  const response = { ruleId: "a", status: "DONE", note: "" };
  assert.equal(reviewSchema.safeParse({ date: "2026-11-25", session: "Morning", notes: "", responses: [response, response] }).success, false);
});

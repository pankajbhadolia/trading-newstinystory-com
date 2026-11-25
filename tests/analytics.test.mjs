import { test } from "node:test";
import assert from "node:assert/strict";
import { makeReport } from "../src/modules/analytics/report.ts";

const record = {
  date: "2026-01-01", session: "Morning", instrument: "Equity", symbol: "ABC", segment: "NSE", strikePrice: null,
  expiryDate: null, direction: "BUY", executions: [{ side: "ENTRY", price: 100, quantity: 10 }, { side: "EXIT", price: 110, quantity: 5 }],
  stopLoss: 95, target: 110, charges: 5, strategy: "Breakout", entryReason: "", exitReason: "", emotion: "", notes: "", draft: false,
};
const trade = (id, patch = {}) => ({ id, record: { ...record, ...patch } });
const loss = [{ side: "ENTRY", price: 100, quantity: 10 }, { side: "EXIT", price: 90, quantity: 10 }];
const noFilters = { instrument: "", strategy: "", session: "" };
const range = { start: "2026-01-01", end: "2026-01-10" };
const item = (status) => ({ ruleId: "r", category: "Stop-loss adherence", title: "Respect stop", weight: 2, status, note: "" });
const review = (id, date, status = "VIOLATED") => ({ id, date, session: "Morning", checklist: [item(status)] });

test("realized outcomes include partial closes, preserve missing net and do not invent outcomes", () => {
  const report = makeReport({ trades: [
    trade("win"), trade("loss", { date: "2026-01-02", executions: loss, charges: null }),
    trade("flat", { date: "2026-01-03", executions: [{ side: "ENTRY", price: 100, quantity: 1 }, { side: "EXIT", price: 100, quantity: 1 }], charges: 0 }),
    trade("draft", { draft: true }), trade("open", { executions: [{ side: "ENTRY", price: 100, quantity: 2 }] }),
  ], reviews: [] }, range, "daily", noFilters);
  assert.equal(report.count, 3);
  assert.equal(report.wins, 1); assert.equal(report.losses, 1); assert.equal(report.breakEven, 1);
  assert.equal(report.winRate, "33.33"); assert.equal(report.gross, "-50.00");
  assert.equal(report.net, "45.00"); assert.equal(report.netCount, 2);
  assert.equal(report.averageWin, "50.00"); assert.equal(report.averageLoss, "-100.00");
  assert.equal(report.profitFactor, "0.50"); assert.equal(report.expectancy, "-16.67");
  assert.equal(report.riskReward, "2.00"); assert.equal(report.maxDrawdown, "100.00");
  assert.deepEqual(report.references.map((ref) => ref.id), ["win", "loss", "flat"]);
});

test("drawdown groups same-day outcomes and recovery refers only to the selected history", () => {
  const trades = [
    trade("a", { date: "2026-01-01", executions: loss }),
    trade("b", { date: "2026-01-01", executions: [{ side: "ENTRY", price: 100, quantity: 10 }, { side: "EXIT", price: 105, quantity: 10 }] }),
    trade("c", { date: "2026-01-02", executions: [{ side: "ENTRY", price: 100, quantity: 10 }, { side: "EXIT", price: 105, quantity: 10 }] }),
  ];
  const report = makeReport({ trades, reviews: [] }, range, "weekly", noFilters);
  assert.equal(report.maxDrawdown, "50.00");
  assert.deepEqual(report.recovery.map((r) => r.date), ["2026-01-02"]);
  assert.equal(report.periods[0].label, "Week of 2025-12-29");
  assert.equal(report.periods[0].gross, "0.00");
});

test("reviews identify repeated self-reported violations and cannot be attributed to filtered strategies", () => {
  const data = { trades: [trade("a"), trade("b", { date: "2026-01-02" })], reviews: [review("one", "2026-01-01"), review("two", "2026-01-02")] };
  const report = makeReport(data, range, "monthly", noFilters);
  assert.equal(report.discipline, "0.00");
  assert.equal(report.stopLossViolations.length, 2);
  assert.equal(report.repeatedViolations.length, 1);
  assert.equal(report.repeatedViolations[0][1].references[0].id, "b");
  const filtered = makeReport(data, range, "monthly", { ...noFilters, strategy: "Breakout" });
  assert.equal(filtered.discipline, null); assert.equal(filtered.reviewsExcluded, true);
  assert.equal(filtered.stopLossViolations.length, 0);
});

test("missing and invalid planned risk inputs are excluded and empty results remain unavailable", () => {
  const data = { trades: [trade("invalid", { stopLoss: 105 }), trade("missing", { target: null }), trade("short", { direction: "SELL", stopLoss: 105, target: 90 })], reviews: [] };
  const report = makeReport(data, range, "quarterly", noFilters);
  assert.equal(report.riskReward, "2.00"); assert.equal(report.riskRewardCount, 1);
  assert.equal(report.periods[0].label, "2026-Q1");
  assert.equal(makeReport(data, { start: "2027-01-01", end: "2027-01-31" }, "yearly", noFilters).gross, null);
});

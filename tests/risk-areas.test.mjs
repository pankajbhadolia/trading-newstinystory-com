import test from "node:test";
import assert from "node:assert/strict";
import { riskAreas, riskReportOrder } from "../src/config/risk-areas.ts";

test("focused reports retain all sections and put red flags before budget or instrument results", () => {
  for (const { focus } of riskAreas) {
    const order = riskReportOrder(focus);
    assert.deepEqual([...order].sort(), ["budget", "findings", "instruments", "scores"]);
    if (focus === "budget" || focus === "instruments") {
      assert.equal(order[0], "findings");
      assert.equal(order[1], focus);
    }
  }
  assert.deepEqual([...riskReportOrder()], ["scores", "findings", "budget", "instruments"]);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { assessRisk, reportSchema, rulesV1 } from "../src/modules/risk/assessment.ts";

const prepared = {
  household: "shared", employment: "stable", income: 100000, expenses: 40000,
  obligations: 10000, highInterestDebt: "no", dependents: "one",
  emergencySavings: 300000, capital: 200000, borrowed: "no", essentialFunds: "no",
  experience: "over-two", derivativesKnowledge: "experienced", plan: "yes",
  lossResponse: "composed", lossTolerance: "moderate", objective: "learning",
};

test("scores and limits are independently explained for a prepared profile", () => {
  const report = assessRisk(prepared);
  assert.deepEqual(report.scores, { financial: 100, psychological: 100, readiness: 100 });
  assert.deepEqual([report.budget.capital, report.budget.perTrade, report.budget.daily, report.budget.monthly], [200000, 1000, 2000, 6000]);
  assert.equal(report.redFlags.length, 0);
  assert.equal(report.instruments.length, 5);
  assert.ok(report.instruments.every((item) => item.reasons.length > 0));
  assert.equal(report.version, rulesV1.version);
  assert.equal(reportSchema.safeParse(report).success, true);
});

test("borrowed and essential funds, debt and missing emergency buffer postpone every instrument", () => {
  const report = assessRisk({ ...prepared, borrowed: "yes", essentialFunds: "yes", highInterestDebt: "yes", emergencySavings: 1000 });
  assert.equal(report.redFlags.length, 4);
  assert.equal(report.budget.capital, 0);
  assert.equal(report.budget.perTrade, 0);
  assert.ok(report.instruments.every((item) => item.status === "Postpone"));
});

test("low experience, derivatives knowledge and loss tolerance restrict leveraged instruments", () => {
  const report = assessRisk({ ...prepared, experience: "none", derivativesKnowledge: "none", lossTolerance: "none", plan: "no" });
  assert.equal(report.scores.readiness, 0);
  assert.equal(report.scores.psychological, 60);
  assert.ok(report.instruments.every((item) => item.status === "Avoid for now / learn first"));
  assert.match(report.instruments[3].reasons.join(" "), /unlimited/);
});

test("emergency and surplus thresholds behave at boundaries and zero expenses do not bypass checks", () => {
  const atThreeMonths = assessRisk({ ...prepared, emergencySavings: 150000 });
  assert.ok(!atThreeMonths.redFlags.some((item) => item.title.includes("Emergency")));
  assert.ok(atThreeMonths.cautions.some((item) => item.title.includes("emergency")));
  assert.ok(assessRisk({ ...prepared, emergencySavings: 149999.99 }).redFlags.some((item) => item.title.includes("Emergency")));
  assert.ok(assessRisk({ ...prepared, income: 50000 }).redFlags.some((item) => item.title.includes("surplus")));
  assert.equal(assessRisk({ ...prepared, expenses: 0, obligations: 0 }).budget.capital, 0);
});

test("validate required, unknown, negative and overly precise values", () => {
  for (const bad of [{ ...prepared, capital: -1 }, { ...prepared, income: 1.001 }, { ...prepared, plan: "maybe" }, { ...prepared, extra: true }, { ...prepared, employment: undefined }]) {
    assert.throws(() => assessRisk(bad));
  }
  assert.doesNotThrow(() => assessRisk({ ...prepared, capital: 12.34 }));
});

test("income alone does not determine financial score and psychological score is independent", () => {
  const changedIncome = assessRisk({ ...prepared, income: 200000, expenses: 90000, obligations: 10000, emergencySavings: 600000 });
  assert.equal(changedIncome.scores.financial, assessRisk(prepared).scores.financial);
  const changedPsychology = assessRisk({ ...prepared, lossTolerance: "none", lossResponse: "stop", objective: "income" });
  assert.deepEqual(changedPsychology.scores, { financial: 100, psychological: 10, readiness: 100 });
  assert.ok(changedPsychology.instruments.slice(1).every((item) => item.status === "Avoid for now / learn first"));
});

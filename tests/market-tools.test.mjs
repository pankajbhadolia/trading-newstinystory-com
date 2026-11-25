import test from "node:test";
import assert from "node:assert/strict";
import { simulateDrawdown } from "../src/modules/market-tools/drawdown.ts";
import { clockHandAngles, formatMarketTime } from "../src/modules/market-tools/markets.ts";

test("drawdown simulator tracks peaks, recoveries and the largest decline", () => {
  const result = simulateDrawdown("100000", "-10, 20, -25");
  assert.deepEqual(result.steps.map((step) => step.balance.toNumber()), [90000, 108000, 81000]);
  assert.equal(result.peak.toNumber(), 108000);
  assert.equal(result.maximumDrawdown.toNumber(), 25);
  assert.equal(result.finalDrawdown.toNumber(), 25);
  assert.ok(Math.abs(result.recovery.toNumber() - 33.3333333333) < 0.000001);
  const recovered = simulateDrawdown("100", "-50, 100");
  assert.equal(recovered.maximumDrawdown.toNumber(), 50);
  assert.equal(recovered.finalDrawdown.toNumber(), 0);
});

test("drawdown simulator handles a total loss and rejects invalid or unsafe scenarios", () => {
  const result = simulateDrawdown("100", "-100, 1000");
  assert.equal(result.balance.toNumber(), 0);
  assert.equal(result.maximumDrawdown.toNumber(), 100);
  assert.equal(result.recovery, null);
  for (const [capital, returns] of [["0", "1"], ["1.001", "1"], ["100", "-101"], ["100", "1,,2"], ["100", "1.1234567"], ["100", Array(101).fill("1").join(",")], ["1000000000000", "1000,1000,1000"]]) {
    assert.throws(() => simulateDrawdown(capital, returns));
  }
});

test("world clock uses IANA daylight-saving changes and date boundaries", () => {
  assert.match(formatMarketTime(new Date("2026-03-08T06:59:00Z"), "America/New_York"), /01:59:00/);
  assert.match(formatMarketTime(new Date("2026-03-08T07:00:00Z"), "America/New_York"), /03:00:00/);
  assert.match(formatMarketTime(new Date("2026-01-01T00:00:00Z"), "Asia/Kolkata"), /05:30:00/);
});

test("analog hands use local time including fractional hours and daylight saving", () => {
  const now = new Date("2026-01-01T00:00:30Z");
  assert.deepEqual(clockHandAngles(now, "Asia/Kolkata"), { hour: 165.25, minute: 183, second: 180 });
  assert.deepEqual(clockHandAngles(now, "UTC"), { hour: 0.25, minute: 3, second: 180 });
  assert.deepEqual(clockHandAngles(new Date("2026-03-08T07:00:00Z"), "America/New_York"), { hour: 90, minute: 0, second: 0 });
});

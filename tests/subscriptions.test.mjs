import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccess, historyCutoff, resolveAccess } from "../src/modules/subscriptions/entitlements.ts";

const now = new Date("2026-11-25T10:00:00Z");
test("active subscriptions, expiry, and legacy access resolve independently", () => {
  assert.deepEqual(resolveAccess(null, false, null, now), { subscriptionTier: "FREE", effectiveTier: "FREE", legacy: false });
  assert.equal(resolveAccess({ tier: "PRO", expiresAt: new Date("2026-11-25T10:00:00Z") }, false, null, now).effectiveTier, "FREE");
  assert.equal(resolveAccess({ tier: "PREMIUM", expiresAt: new Date("2026-12-01T00:00:00Z") }, false, null, now).effectiveTier, "PREMIUM");
  assert.equal(resolveAccess(null, true, null, now).effectiveTier, "PRO");
  assert.equal(resolveAccess(null, true, now, now).effectiveTier, "FREE");
});
test("history window includes today and feature gates respect availability", () => {
  assert.equal(historyCutoff("FREE", now), "2026-08-28");
  assert.equal(historyCutoff("PRO", now), null);
  assert.equal(canAccess("FREE", "customRules"), false);
  assert.equal(canAccess("PRO", "customRules"), true);
  assert.equal(canAccess("PREMIUM", "aiCoach"), false);
});

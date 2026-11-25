import test from "node:test";
import assert from "node:assert/strict";
import { isTheme, resolveTheme } from "../src/config/themes.ts";

test("Pink is selectable and retired High Contrast falls back to Corporate Light", () => {
  assert.equal(isTheme("pink"), true);
  assert.equal(resolveTheme("pink"), "pink");
  assert.equal(isTheme("high-contrast"), false);
  assert.equal(resolveTheme("high-contrast"), "corporate-light");
  assert.equal(resolveTheme(null), "corporate-light");
});

test("older dark and blue preferences remain supported", () => {
  assert.equal(resolveTheme("dark"), "corporate-dark");
  assert.equal(resolveTheme("blue"), "midnight-blue");
});

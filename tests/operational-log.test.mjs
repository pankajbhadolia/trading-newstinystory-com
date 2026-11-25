import test from "node:test";
import assert from "node:assert/strict";
import { logAuthRequest, logServerError } from "../src/services/operational-log.ts";

test("operational errors and authentication outcomes omit sensitive error messages", () => {
  const originalError = console.error;
  const originalInfo = console.info;
  const entries = [];
  console.error = (value) => entries.push(JSON.parse(value));
  console.info = (value) => entries.push(JSON.parse(value));
  try {
    logServerError("example.failed", new Error("sensitive connection details"));
    logAuthRequest("auth.sign_in", 401);
  } finally {
    console.error = originalError;
    console.info = originalInfo;
  }
  assert.equal(entries[0].errorType, "Error");
  assert.equal(entries[1].status, 401);
  assert.ok(entries.every((entry) => !JSON.stringify(entry).includes("sensitive connection details")));
});

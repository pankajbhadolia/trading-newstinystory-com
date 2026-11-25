import test from "node:test";
import assert from "node:assert/strict";
import { validateDatabaseUrl } from "../src/services/database-url.ts";
import { assertPrivateSchema } from "../scripts/supabase-preflight.mjs";

test("Supabase connections require the private application schema", () => {
  for (const host of ["db.example.supabase.co", "region.pooler.supabase.com"]) {
    assert.throws(() => validateDatabaseUrl(`postgresql://user:password@${host}:5432/postgres`), /private trader_app schema/);
    assert.throws(() => validateDatabaseUrl(`postgresql://user:password@${host}:5432/postgres?schema=public`), /private trader_app schema/);
    assert.throws(() => validateDatabaseUrl(`postgresql://user:password@${host}:5432/postgres?schema=trader_app&schema=public`), /private trader_app schema/);
    assert.doesNotThrow(() => validateDatabaseUrl(`postgresql://user:password@${host}:5432/postgres?schema=trader_app`));
  }
});

test("Supabase migration preflight rejects absent or accessible schemas", async () => {
  const allowed = { exists: true, rolesExist: true, anonAccess: false, authenticatedAccess: false, serviceAccess: false, migrationAccess: true };
  const check = (result) => assertPrivateSchema({ $queryRaw: async () => [result] });
  await check(allowed);
  for (const change of [{ exists: false }, { rolesExist: false }, { anonAccess: true }, { authenticatedAccess: true }, { serviceAccess: true }, { migrationAccess: false }]) {
    await assert.rejects(check({ ...allowed, ...change }));
  }
});

test("other PostgreSQL connections retain existing schema support and invalid URLs fail safely", () => {
  assert.doesNotThrow(() => validateDatabaseUrl("postgresql://user:password@localhost:5432/app?schema=public"));
  assert.throws(() => validateDatabaseUrl("https://example.com"), /PostgreSQL connection URL/);
  assert.throws(() => validateDatabaseUrl("not-a-url-containing-secret"), (error) => !error.message.includes("secret"));
});

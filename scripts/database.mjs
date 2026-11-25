import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
import { isSupabaseDatabase, validateDatabaseUrl } from "../src/services/database-url.ts";
import { assertPrivateSchema, PrivateSchemaError } from "./supabase-preflight.mjs";

nextEnv.loadEnvConfig(process.cwd());
const action = process.argv[2];
if (!["deploy", "status"].includes(action) || process.argv.length !== 3) {
  console.error("Usage: node --experimental-strip-types scripts/database.mjs <deploy|status>");
  process.exit(1);
}
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  validateDatabaseUrl(process.env.DATABASE_URL);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid database configuration.");
  process.exit(1);
}
try {
  if (isSupabaseDatabase(new URL(process.env.DATABASE_URL))) {
    const prisma = new PrismaClient();
    try { await assertPrivateSchema(prisma); }
    finally { await prisma.$disconnect(); }
  }
} catch (error) {
  if (error instanceof PrivateSchemaError) console.error(error.message);
  else console.error(`Database preflight failed (${error instanceof Error ? error.name : "UnknownError"}). Check connectivity and configuration.`);
  process.exit(1);
}
const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "migrate", action], { stdio: "inherit", env: process.env });
if (result.error) {
  console.error(`Could not start Prisma: ${result.error.name}`);
  process.exit(1);
}
process.exit(result.status ?? 1);

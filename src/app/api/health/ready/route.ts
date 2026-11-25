import { connection } from "next/server";
import { getAuth } from "@/services/auth";
import { assertMailConfigured } from "@/services/mail";
import { logServerError } from "@/services/operational-log";
import { prisma } from "@/services/prisma";

export async function GET() {
  await connection();
  try {
    getAuth();
    assertMailConfigured();
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("health.readiness.failed", error);
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

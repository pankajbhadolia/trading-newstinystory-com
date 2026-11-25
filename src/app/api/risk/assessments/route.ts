import { z } from "zod";
import { assessRisk, assessmentSchema } from "@/modules/risk/assessment";
import { getAuth } from "@/services/auth";
import { prisma } from "@/services/prisma";
import { JournalError, readJson } from "@/services/journal-api";
import { logServerError } from "@/services/operational-log";

const noCache = { "Cache-Control": "private, no-store" };

async function session(request: Request) {
  return getAuth().api.getSession({ headers: request.headers });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && !!process.env.BETTER_AUTH_URL && origin === new URL(process.env.BETTER_AUTH_URL).origin;
}

export async function GET(request: Request) {
  try {
    const user = await session(request);
    if (!user) return Response.json({ error: "Sign in to view saved assessments." }, { status: 401, headers: noCache });
    const reports = await prisma.riskAssessment.findMany({
      where: { userId: user.user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: { id: true, createdAt: true, ruleVersion: true, report: true },
    });
    return Response.json({ reports }, { headers: noCache });
  } catch (error) {
    logServerError("assessment.load.failed", error);
    return Response.json({ error: "Could not load assessments. Check server configuration." }, { status: 503, headers: noCache });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noCache });
  try {
    const user = await session(request);
    if (!user) return Response.json({ error: "Sign in to save assessments." }, { status: 401, headers: noCache });
    const parsed = z.object({ answers: assessmentSchema, ruleVersion: z.string() }).strict().parse(await readJson(request));
    const answers = parsed.answers;
    const report = assessRisk(answers);
    if (parsed.ruleVersion !== report.version) return Response.json({ error: "Scoring rules changed. Reload and complete the assessment again before saving." }, { status: 409, headers: noCache });
    const saved = await prisma.riskAssessment.create({ data: { userId: user.user.id, ruleVersion: report.version, report } });
    return Response.json({ id: saved.id }, { status: 201, headers: noCache });
  } catch (error) {
    if (error instanceof JournalError) return Response.json({ error: error.message }, { status: error.status, headers: noCache });
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid assessment answers." }, { status: 400, headers: noCache });
    logServerError("assessment.save.failed", error);
    return Response.json({ error: "Could not save assessment. Check server configuration." }, { status: 503, headers: noCache });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noCache });
  try {
    const user = await session(request);
    if (!user) return Response.json({ error: "Sign in to delete assessments." }, { status: 401, headers: noCache });
    const { id } = z.object({ id: z.string().min(1).max(128) }).strict().parse(await readJson(request));
    const deleted = await prisma.riskAssessment.deleteMany({ where: { id, userId: user.user.id } });
    if (!deleted.count) return Response.json({ error: "Assessment not found." }, { status: 404, headers: noCache });
    return new Response(null, { status: 204, headers: noCache });
  } catch (error) {
    if (error instanceof JournalError) return Response.json({ error: error.message }, { status: error.status, headers: noCache });
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid request." }, { status: 400, headers: noCache });
    logServerError("assessment.delete.failed", error);
    return Response.json({ error: "Could not delete assessment. Check server configuration." }, { status: 503, headers: noCache });
  }
}

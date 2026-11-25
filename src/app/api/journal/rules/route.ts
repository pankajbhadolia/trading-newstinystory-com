import { z } from "zod";
import { ruleSchema, starterRules } from "@/modules/journal/domain";
import { JournalError, journalJson, readJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { requireFeature } from "@/services/entitlements";

export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => journalJson({ rules: await prisma.disciplineRule.findMany({ where: { userId }, orderBy: [{ category: "asc" }, { createdAt: "asc" }] }) }));
}

export async function POST(request: Request) {
  return withJournalUser(request, async (userId) => {
    const input = z.union([z.object({ initialize: z.literal(true) }).strict(), z.object({ rule: ruleSchema }).strict()]).parse(await readJson(request));
    if ("initialize" in input) {
      const created = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext('journal-starter-rules'))`;
        if (await tx.disciplineRule.count({ where: { userId } })) throw new JournalError("Starter checklists can only be added before creating rules.", 409);
        return tx.disciplineRule.createMany({ data: starterRules.map((rule) => ({ ...rule, userId })) });
      });
      return journalJson({ count: created.count }, 201);
    }
    await requireFeature(userId, "customRules");
    const rule = input.rule;
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext('journal-starter-rules'))`;
      if (await tx.disciplineRule.count({ where: { userId } }) >= 200) throw new JournalError("The maximum is 200 rules.", 400);
      return tx.disciplineRule.create({ data: { ...rule, userId } });
    });
    return journalJson(created, 201);
  });
}

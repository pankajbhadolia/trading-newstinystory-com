import { ruleSchema } from "@/modules/journal/domain";
import { JournalError, journalJson, readJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { requireFeature } from "@/services/entitlements";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return withJournalUser(request, async (userId) => {
    const { id } = await params;
    await requireFeature(userId, "customRules");
    const rule = ruleSchema.parse(await readJson(request));
    const updated = await prisma.disciplineRule.updateMany({ where: { id, userId }, data: rule });
    if (!updated.count) throw new JournalError("Rule not found.", 404);
    return journalJson({ id });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return withJournalUser(request, async (userId) => {
    const { id } = await params;
    await requireFeature(userId, "customRules");
    const deleted = await prisma.disciplineRule.deleteMany({ where: { id, userId } });
    if (!deleted.count) throw new JournalError("Rule not found.", 404);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  });
}

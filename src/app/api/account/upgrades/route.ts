import { z } from "zod";
import { accountAccess } from "@/services/entitlements";
import { JournalError, journalJson, readJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { tiers } from "@/modules/subscriptions/entitlements";

export async function POST(request: Request) {
  return withJournalUser(request, async (userId) => {
    const { tier } = z.object({ tier: z.enum(["PRO", "PREMIUM"]) }).strict().parse(await readJson(request));
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext('subscription'))`;
      const access = await accountAccess(userId, tx);
      if (tiers.indexOf(tier) <= tiers.indexOf(access.subscriptionTier)) throw new JournalError("Choose a tier above your current subscription.", 400);
      if (await tx.upgradeRequest.findFirst({ where: { userId, status: "PENDING" } })) throw new JournalError("You already have a pending upgrade request.", 409);
      return tx.upgradeRequest.create({ data: { userId, tier }, select: { id: true } });
    });
    return journalJson(result, 201);
  });
}

export async function DELETE(request: Request) {
  return withJournalUser(request, async (userId) => {
    const { id } = z.object({ id: z.string().min(1).max(128) }).strict().parse(await readJson(request));
    const cancelled = await prisma.upgradeRequest.updateMany({ where: { id, userId, status: "PENDING" }, data: { status: "CANCELLED", resolvedAt: new Date() } });
    if (!cancelled.count) throw new JournalError("Pending request not found.", 404);
    return journalJson({ cancelled: true });
  });
}

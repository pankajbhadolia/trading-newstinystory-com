import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const [action, ...args] = process.argv.slice(2);
try {
  if (action === "list" && args.length === 0) {
    const pending = await prisma.upgradeRequest.findMany({
      where: { status: "PENDING" }, orderBy: { createdAt: "asc" },
      select: { id: true, tier: true, createdAt: true, user: { select: { id: true, email: true } } },
    });
    console.log(JSON.stringify(pending, null, 2));
  } else if (action === "approve" && args.length === 4) {
    const [requestId, rawExpiry, actor, reason] = args;
    const expiry = new Date(rawExpiry);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(rawExpiry) || Number.isNaN(expiry.getTime()) || expiry <= new Date() || !actor.trim() || actor.length > 200 || !reason.trim() || reason.length > 500) {
      throw new Error("Provide a future UTC expiry, actor and reason.");
    }
    const initial = await prisma.upgradeRequest.findUnique({ where: { id: requestId }, select: { userId: true } });
    if (!initial) throw new Error("Request not found.");
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${initial.userId}), hashtext('subscription'))`;
      const request = await tx.upgradeRequest.findUnique({ where: { id: requestId } });
      if (!request || request.status !== "PENDING" || request.tier === "FREE") throw new Error("Request is no longer pending.");
      const current = await tx.subscription.findUnique({ where: { userId: request.userId } });
      const ranks = { FREE: 0, PRO: 1, PREMIUM: 2 };
      if (current && current.expiresAt > new Date() && ranks[current.tier] >= ranks[request.tier]) throw new Error("The requested tier is not an upgrade.");
      await tx.subscription.upsert({
        where: { userId: request.userId },
        create: { userId: request.userId, tier: request.tier, expiresAt: expiry, source: "manual" },
        update: { tier: request.tier, expiresAt: expiry, source: "manual" },
      });
      await tx.subscriptionEvent.create({ data: { userId: request.userId, tier: request.tier, expiresAt: expiry, action: "GRANTED", actor: actor.trim(), reason: reason.trim(), source: "manual" } });
      const updated = await tx.upgradeRequest.updateMany({ where: { id: requestId, status: "PENDING" }, data: { status: "APPROVED", resolvedAt: new Date() } });
      if (updated.count !== 1) throw new Error("Request is no longer pending.");
    });
    console.log("Upgrade approved and recorded.");
  } else {
    throw new Error('Usage: node scripts/subscription-admin.mjs list | approve <request-id> <UTC-expiry> <operator> "<reason>"');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Subscription administration failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

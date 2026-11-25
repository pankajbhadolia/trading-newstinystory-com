import { canAccess, historyCutoff, resolveAccess, type Feature } from "@/modules/subscriptions/entitlements";
import { JournalError } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import type { Prisma } from "@prisma/client";

export async function accountAccess(userId: string, database: Pick<Prisma.TransactionClient, "user"> = prisma) {
  const user = await database.user.findUnique({ where: { id: userId }, select: { legacyAccess: true, subscription: true } });
  if (!user) throw new JournalError("Account not found.", 401);
  const raw = process.env.LEGACY_ACCESS_UNTIL;
  const until = raw ? new Date(raw) : null;
  if (until && (Number.isNaN(until.getTime()) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw!))) {
    throw new Error("LEGACY_ACCESS_UNTIL must be a valid UTC timestamp.");
  }
  const now = new Date();
  const access = resolveAccess(user.subscription, user.legacyAccess, until, now);
  return { ...access, cutoff: historyCutoff(access.effectiveTier, now), subscription: user.subscription, legacyUntil: until };
}

export async function requireFeature(userId: string, feature: Feature) {
  const access = await accountAccess(userId);
  if (!canAccess(access.effectiveTier, feature)) throw new JournalError("This feature requires a higher subscription tier or is not available yet.", 403);
  return access;
}

export function requireHistoryDate(date: string | null, cutoff: string | null) {
  if (date && cutoff && date < cutoff) throw new JournalError("This date is outside your journal history limit. Export your data or request an upgrade.", 403);
}

export function visibleTrades(cutoff: string | null): Prisma.JournalTradeWhereInput {
  return cutoff ? { OR: [{ tradeDate: null }, { tradeDate: { gte: cutoff } }] } : {};
}

export function visibleReviews(cutoff: string | null): Prisma.DailyReviewWhereInput {
  return cutoff ? { date: { gte: cutoff } } : {};
}

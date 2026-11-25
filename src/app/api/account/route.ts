import { z } from "zod";
import { themeValues } from "@/config/themes";
import { featurePolicy, canAccess } from "@/modules/subscriptions/entitlements";
import { accountAccess } from "@/services/entitlements";
import { journalJson, readJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  theme: z.enum(themeValues),
}).strict();

export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => {
    const [user, access, history, requests] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true, emailVerified: true, preference: true } }),
      accountAccess(userId),
      prisma.subscriptionEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, tier: true, expiresAt: true, action: true, source: true, createdAt: true } }),
      prisma.upgradeRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, tier: true, status: true, createdAt: true, resolvedAt: true } }),
    ]);
    const features = Object.entries(featurePolicy).map(([id, policy]) => ({
      id, title: policy.title, required: policy.required, available: policy.available,
      enabled: canAccess(access.effectiveTier, id as keyof typeof featurePolicy),
      limit: policy.limit === null ? null : policy.limit[access.effectiveTier],
      unit: "unit" in policy ? policy.unit : null,
    }));
    return journalJson({ user, access, features, history, requests });
  });
}

export async function PUT(request: Request) {
  return withJournalUser(request, async (userId) => {
    const input = profileSchema.parse(await readJson(request));
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { name: input.name } }),
      prisma.userPreference.upsert({ where: { userId }, create: { userId, theme: input.theme }, update: { theme: input.theme } }),
    ]);
    return journalJson({ saved: true });
  });
}

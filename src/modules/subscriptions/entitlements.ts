export const tiers = ["FREE", "PRO", "PREMIUM"] as const;
export type Tier = typeof tiers[number];

export const featurePolicy = {
  calculators: { title: "Basic calculators", required: "FREE", available: true, limit: null },
  worldClock: { title: "World Clock", required: "FREE", available: false, limit: null },
  basicRisk: { title: "Basic risk assessment", required: "FREE", available: true, limit: null },
  advancedRisk: { title: "Advanced risk assessment", required: "PRO", available: false, limit: null },
  journalHistory: { title: "Journal history", required: "FREE", available: true, limit: { FREE: 90, PRO: null, PREMIUM: null }, unit: "calendar days" },
  checklists: { title: "Basic discipline checklists", required: "FREE", available: true, limit: null },
  customRules: { title: "Custom discipline rules", required: "PRO", available: true, limit: null },
  basicReports: { title: "Basic performance reports", required: "FREE", available: true, limit: null },
  advancedReports: { title: "Advanced performance analytics", required: "PRO", available: true, limit: null },
  journey: { title: "Trading Journey Analyzer", required: "PRO", available: true, limit: null },
  aiCoach: { title: "AI Trading Coach", required: "PREMIUM", available: false, limit: null },
  behaviour: { title: "Advanced behavioural analysis", required: "PREMIUM", available: false, limit: null },
  aiReports: { title: "AI-generated reports", required: "PREMIUM", available: false, limit: null },
  personalisedAnalytics: { title: "Advanced personalized analytics", required: "PREMIUM", available: false, limit: null },
} as const satisfies Record<string, { title: string; required: Tier; available: boolean; limit: Record<Tier, number | null> | null; unit?: string }>;

export type Feature = keyof typeof featurePolicy;

export function resolveAccess(subscription: { tier: Tier; expiresAt: Date } | null, legacyAccess: boolean, legacyUntil: Date | null, now: Date) {
  const active = subscription && subscription.expiresAt > now ? subscription.tier : "FREE";
  const legacy = legacyAccess && (legacyUntil === null || legacyUntil > now);
  const effective: Tier = legacy && tiers.indexOf(active) < tiers.indexOf("PRO") ? "PRO" : active;
  return { subscriptionTier: active, effectiveTier: effective, legacy };
}

export function canAccess(tier: Tier, feature: Feature) {
  const policy = featurePolicy[feature];
  return policy.available && tiers.indexOf(tier) >= tiers.indexOf(policy.required);
}

export function historyCutoff(tier: Tier, now: Date) {
  const days = featurePolicy.journalHistory.limit[tier];
  if (days === null) return null;
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

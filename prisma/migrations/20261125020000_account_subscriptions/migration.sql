CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'PREMIUM');

ALTER TABLE "User" ADD COLUMN "legacyAccess" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "legacyAccess" = true;

CREATE TABLE "UserPreference" (
  "userId" TEXT NOT NULL,
  "theme" TEXT NOT NULL DEFAULT 'corporate-light',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Subscription" (
  "userId" TEXT NOT NULL,
  "tier" "SubscriptionTier" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subscription_paid_tier" CHECK ("tier" IN ('PRO', 'PREMIUM'))
);

CREATE TABLE "SubscriptionEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tier" "SubscriptionTier" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "providerEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SubscriptionEvent_providerEventId_key" ON "SubscriptionEvent"("providerEventId");
CREATE INDEX "SubscriptionEvent_userId_createdAt_idx" ON "SubscriptionEvent"("userId", "createdAt");

CREATE TABLE "UpgradeRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tier" "SubscriptionTier" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "UpgradeRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UpgradeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UpgradeRequest_paid_tier" CHECK ("tier" IN ('PRO', 'PREMIUM')),
  CONSTRAINT "UpgradeRequest_status" CHECK ("status" IN ('PENDING', 'APPROVED', 'CANCELLED', 'DECLINED'))
);
CREATE INDEX "UpgradeRequest_userId_createdAt_idx" ON "UpgradeRequest"("userId", "createdAt");
CREATE UNIQUE INDEX "UpgradeRequest_one_pending" ON "UpgradeRequest"("userId") WHERE "status" = 'PENDING';

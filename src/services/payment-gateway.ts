import type { Tier } from "@/modules/subscriptions/entitlements";

// Future gateways must verify signed events server-side and deduplicate provider event IDs.
export interface PaymentGateway {
  createCheckout(input: { userId: string; tier: Exclude<Tier, "FREE">; returnUrl: string }): Promise<{ url: string }>;
  verifyEvent(request: Request): Promise<{ eventId: string; userId: string; tier: Exclude<Tier, "FREE">; expiresAt: Date }>;
}

import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/services/prisma";
import { sendAccountEmail } from "@/services/mail";
import { validateDatabaseUrl } from "@/services/database-url";

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const url = process.env.BETTER_AUTH_URL;
  const trustProxy = process.env.AUTH_TRUST_PROXY_IP ?? "false";
  if (trustProxy !== "true" && trustProxy !== "false") throw new Error("AUTH_TRUST_PROXY_IP must be true or false.");
  if (!secret || secret.length < 32 || !url || !process.env.DATABASE_URL) {
    throw new Error("Authentication requires DATABASE_URL, BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters.");
  }
  validateDatabaseUrl(process.env.DATABASE_URL);
  const parsedUrl = new URL(url);
  if (process.env.NODE_ENV === "production" && parsedUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  }
  return betterAuth({
    secret,
    baseURL: url,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true, minPasswordLength: 12, maxPasswordLength: 128, requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => sendAccountEmail(user.email, "Reset your Trader's Command Centre password", `Use this link to reset your password. It expires in one hour:\n\n${url}\n\nIf you did not request this, ignore this message.`),
    },
    emailVerification: {
      sendOnSignUp: true, autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => sendAccountEmail(user.email, "Verify your Trader's Command Centre email", `Verify your email using this link. It expires in one hour:\n\n${url}\n\nIf you did not request an account, ignore this message.`),
    },
    user: { deleteUser: { enabled: true } },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 5 }, "/send-verification-email": { window: 60, max: 5 },
      },
    },
    advanced: { ipAddress: { ipAddressHeaders: trustProxy === "true" ? ["x-real-ip"] : [] }, useSecureCookies: parsedUrl.protocol === "https:" },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (!instance) instance = createAuth();
  return instance;
}

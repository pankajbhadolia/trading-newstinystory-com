import { getAuth } from "@/services/auth";
import { assertMailConfigured } from "@/services/mail";
import { JournalError, readJson } from "@/services/journal-api";
import { z } from "zod";
import { logAuthRequest, logServerError } from "@/services/operational-log";

const auditedPaths: Record<string, string> = {
  "/api/auth/sign-in/email": "auth.sign_in",
  "/api/auth/sign-up/email": "auth.sign_up",
  "/api/auth/sign-out": "auth.sign_out",
  "/api/auth/request-password-reset": "auth.password_reset_requested",
  "/api/auth/reset-password": "auth.password_reset",
  "/api/auth/change-password": "auth.password_changed",
  "/api/auth/delete-user": "auth.account_deletion",
  "/api/auth/send-verification-email": "auth.verification_requested",
  "/api/auth/verify-email": "auth.email_verification",
};

async function handle(request: Request) {
  const path = new URL(request.url).pathname;
  const auditedMethod = request.method === "POST" || (request.method === "GET" && path === "/api/auth/verify-email");
  const event = auditedMethod && Object.hasOwn(auditedPaths, path) ? auditedPaths[path] : undefined;
  let response: Response;
  try {
    if (request.method === "POST" && ["/api/auth/sign-up/email", "/api/auth/request-password-reset", "/api/auth/send-verification-email"].includes(path)) assertMailConfigured();
    if (request.method === "POST" && path === "/api/auth/delete-user") {
      z.object({ password: z.string().min(1).max(128) }).passthrough().parse(await readJson(request.clone()));
    }
    response = await getAuth().handler(request);
  } catch (error) {
    if (error instanceof JournalError) response = Response.json({ message: error.message }, { status: error.status });
    else if (error instanceof z.ZodError) response = Response.json({ message: "Password is required to delete your account." }, { status: 400 });
    else {
      logServerError("auth.request.failed", error);
      response = Response.json({ message: "Account service is unavailable. Check server configuration." }, { status: 503 });
    }
  }
  if (event) logAuthRequest(event, response.status);
  return response;
}

export const GET = handle;
export const POST = handle;

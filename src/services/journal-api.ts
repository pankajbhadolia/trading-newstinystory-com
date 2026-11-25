import { z } from "zod";
import { connection } from "next/server";
import { getAuth } from "@/services/auth";
import { logServerError } from "@/services/operational-log";

export const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export class JournalError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function boundedBody(request: Request, limit: number) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new JournalError("Request is too large.", 413);
  if (!request.body) throw new JournalError("Request body is required.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); throw new JournalError("Request is too large.", 413); }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new JournalError("Expected JSON.", 415);
  const bytes = await boundedBody(request, 262144);
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { throw new JournalError("Invalid JSON.", 400); }
}

export async function withJournalUser(request: Request, handler: (userId: string) => Promise<Response>) {
  await connection();
  try {
    if (request.method !== "GET") {
      const base = process.env.BETTER_AUTH_URL;
      if (!base || request.headers.get("origin") !== new URL(base).origin) throw new JournalError("Invalid request origin.", 403);
    }
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session) throw new JournalError("Sign in to access your journal.", 401);
    return await handler(session.user.id);
  } catch (error) {
    if (error instanceof JournalError) return Response.json({ error: error.message }, { status: error.status, headers: privateHeaders });
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400, headers: privateHeaders });
    logServerError("journal.request.failed", error);
    return Response.json({ error: "Journal service unavailable. Check server configuration." }, { status: 503, headers: privateHeaders });
  }
}

export function journalJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: privateHeaders });
}
